import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { dhakaDay, range } from '../shop/dates';

const n = (v: any) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const DAY = 86400000;

const factor = (p: any, unit: string) =>
  unit === 'BOX' ? p.piecesPerStrip * p.stripsPerBox : unit === 'STRIP' ? p.piecesPerStrip : 1;

// "2027-03-31" -> ওই দিনের শেষ (বাংলাদেশ সময়)
const parseExpiry = (s?: string) => {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T23:59:59+06:00` : s);
  return isNaN(+d) ? null : d;
};

@Injectable()
export class PharmacyService {
  constructor(private db: PrismaService) {}

  // ---------- ওষুধ তৈরি / এডিট ----------
  async saveMedicine(t: string, id: string | null, i: any) {
    if (!i.name?.trim()) throw new BadRequestException('ওষুধের নাম দিন');
    const isSyrup = i.form === 'SYRUP';
    const ppS = isSyrup ? 1 : Math.max(1, Math.floor(n(i.piecesPerStrip) || 1));
    const spB = Math.max(1, Math.floor(n(i.stripsPerBox) || 1));
    const f = factor({ piecesPerStrip: ppS, stripsPerBox: spB }, i.priceUnit || 'PIECE');

    if (i.barcode) {
      const where: any = { tenantId: t, barcode: i.barcode };
      if (id) where.NOT = { id };
      if (await this.db.product.findFirst({ where })) throw new BadRequestException('এই বারকোড আগেই অন্য ওষুধে আছে');
    }

    const data: any = {
      name: i.name.trim(),
      genericName: i.genericName || null,
      company: i.company || null,
      form: i.form || 'GENERAL',
      barcode: i.barcode || null,
      piecesPerStrip: ppS,
      stripsPerBox: spB,
      sellingPrice: r4(n(i.sellPrice) / f),
      purchasePrice: r4(n(i.buyPrice) / f),
      minStock: n(i.minQty) * f,
    };

    if (id) {
      if (!(await this.db.product.findFirst({ where: { id, tenantId: t } }))) throw new NotFoundException('ওষুধ পাওয়া যায়নি');
      return this.db.product.update({ where: { id }, data });
    }

    const pieces = n(i.openBoxes) * ppS * spB + n(i.openStrips) * ppS + n(i.openPieces);
    return this.db.product.create({
      data: {
        tenantId: t,
        ...data,
        stock: pieces,
        batches: pieces > 0
          ? { create: [{ tenantId: t, qty: pieces, cost: data.purchasePrice, batchNo: i.openBatchNo || null, expiry: parseExpiry(i.openExpiry) }] }
          : undefined,
      },
    });
  }

  // ---------- বিক্রি (বক্স / পাতা / পিস) ----------
  async sale(t: string, userId: string, i: any) {
    if (!i.items?.length) throw new BadRequestException('কমপক্ষে একটি ওষুধ যোগ করুন');
    const ids = [...new Set(i.items.map((x: any) => x.productId))] as string[];
    const [products, expired] = await Promise.all([
      this.db.product.findMany({ where: { tenantId: t, id: { in: ids } } }),
      this.db.productBatch.groupBy({
        by: ['productId'],
        where: { tenantId: t, productId: { in: ids }, qty: { gt: 0 }, expiry: { lt: new Date() } },
        _sum: { qty: true },
      }),
    ]);

    const need: Record<string, number> = {};
    const lines = i.items.map((x: any) => {
      const p = products.find((p) => p.id === x.productId);
      if (!p) throw new BadRequestException('ওষুধ পাওয়া যায়নি');
      const qty = n(x.qty);
      if (!(qty > 0)) throw new BadRequestException('পরিমাণ দিন');
      const f = factor(p, x.unit);
      const pieces = qty * f;
      need[p.id] = (need[p.id] || 0) + pieces;
      return {
        productId: p.id, name: p.name, unit: x.unit, qty, pieces,
        price: x.price != null ? n(x.price) : r2(p.sellingPrice * f),
        cost: r4(p.purchasePrice * f),
      };
    });

    for (const p of products) {
      const exp = n(expired.find((e) => e.productId === p.id)?._sum.qty);
      const available = p.stock - exp; // মেয়াদোত্তীর্ণ মাল বিক্রি হবে না
      if (need[p.id] > available + 1e-9)
        throw new BadRequestException(`${p.name}: বিক্রির মতো স্টক নেই (আছে ${available} পিস${exp > 0 ? `, মেয়াদোত্তীর্ণ ${exp} পিস বাদে` : ''})`);
    }

    const total = r2(sum(lines.map((l: any) => l.qty * l.price)));
    const cost = sum(lines.map((l: any) => l.qty * l.cost));
    if (!(total > 0)) throw new BadRequestException('মোট টাকা ০ হতে পারে না');

    let cash = n(i.cashAmount), bkash = n(i.bkashAmount), due = n(i.dueAmount);
    if (!cash && !bkash && !due) cash = total;
    if (Math.abs(cash + bkash + due - total) > 0.01) throw new BadRequestException('নগদ + বিকাশ + বাকি মিলছে না');
    if (due > 0) {
      if (!i.customerId) throw new BadRequestException('বাকির জন্য কাস্টমার বেছে নিন');
      if (!(await this.db.customer.findFirst({ where: { id: i.customerId, tenantId: t } }))) throw new NotFoundException('কাস্টমার পাওয়া যায়নি');
    }

    return this.db.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId: t, customerId: i.customerId || null, total, cost,
          cashAmount: cash, bkashAmount: bkash, dueAmount: due, note: i.note || null, createdBy: userId,
          items: { create: lines },
        },
        include: { items: true, customer: true },
      });

      for (const pid of Object.keys(need)) {
        await tx.product.update({ where: { id: pid }, data: { stock: { decrement: need[pid] } } });
        // FEFO: যে ব্যাচের মেয়াদ আগে শেষ হবে সেটা আগে বিক্রি
        let left = need[pid];
        const batches = await tx.productBatch.findMany({
          where: { tenantId: t, productId: pid, qty: { gt: 0 }, OR: [{ expiry: null }, { expiry: { gte: new Date() } }] },
          orderBy: [{ expiry: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        });
        for (const b of batches) {
          if (left <= 0) break;
          const take = Math.min(b.qty, left);
          await tx.productBatch.update({ where: { id: b.id }, data: { qty: { decrement: take } } });
          left -= take;
        }
      }
      if (due > 0) await tx.customer.update({ where: { id: i.customerId }, data: { balance: { increment: due } } });
      return sale;
    });
  }

  // ---------- কোম্পানি থেকে মাল কেনা (বক্স / পাতা / পিস) ----------
  async purchase(t: string, i: any) {
    if (!i.items?.length) throw new BadRequestException('কমপক্ষে একটি ওষুধ যোগ করুন');
    const ids = [...new Set(i.items.map((x: any) => x.productId))] as string[];
    const products = await this.db.product.findMany({ where: { tenantId: t, id: { in: ids } } });

    const lines = i.items.map((x: any) => {
      const p = products.find((p) => p.id === x.productId);
      if (!p) throw new BadRequestException('ওষুধ পাওয়া যায়নি');
      const qty = n(x.qty), cost = n(x.cost);
      if (!(qty > 0)) throw new BadRequestException('পরিমাণ দিন');
      const f = factor(p, x.unit);
      return { productId: p.id, name: p.name, unit: x.unit, qty, cost, pieces: qty * f, perPiece: r4(cost / f), batchNo: x.batchNo || null, expiry: parseExpiry(x.expiry) };
    });

    const total = r2(sum(lines.map((l: any) => l.qty * l.cost)));
    if (!(total > 0)) throw new BadRequestException('মোট টাকা ০ হতে পারে না');
    const paid = i.paid == null ? total : Math.min(Math.max(n(i.paid), 0), total);
    const due = r2(total - paid);
    if (i.supplierId) {
      if (!(await this.db.supplier.findFirst({ where: { id: i.supplierId, tenantId: t } }))) throw new NotFoundException('কোম্পানি পাওয়া যায়নি');
    } else if (due > 0) throw new BadRequestException('বাকির জন্য কোম্পানি বেছে নিন');

    return this.db.$transaction(async (tx) => {
      const pu = await tx.purchase.create({
        data: {
          tenantId: t, supplierId: i.supplierId || null, total, paid, due,
          items: { create: lines.map((l: any) => ({ productId: l.productId, name: l.name, qty: l.qty, cost: l.cost, unit: l.unit, pieces: l.pieces })) },
        },
      });
      for (const l of lines) {
        await tx.product.update({ where: { id: l.productId }, data: { stock: { increment: l.pieces }, purchasePrice: l.perPiece } });
        await tx.productBatch.create({ data: { tenantId: t, productId: l.productId, batchNo: l.batchNo, expiry: l.expiry, qty: l.pieces, cost: l.perPiece, purchaseId: pu.id } });
      }
      if (due > 0) await tx.supplier.update({ where: { id: i.supplierId }, data: { balance: { increment: due } } });
      return pu;
    });
  }

  // ---------- কোম্পানিকে ধার দেওয়া (তখন কোম্পানি আপনাকে দেবে) ----------
  async lend(t: string, supplierId: string, amount: number, method = 'CASH') {
    if (!(await this.db.supplier.findFirst({ where: { id: supplierId, tenantId: t } }))) throw new NotFoundException('কোম্পানি পাওয়া যায়নি');
    if (!(amount > 0)) throw new BadRequestException('সঠিক টাকার পরিমাণ দিন');
    const [, s] = await this.db.$transaction([
      this.db.payment.create({ data: { tenantId: t, type: 'SUPPLIER_LEND', supplierId, amount, method } }),
      this.db.supplier.update({ where: { id: supplierId }, data: { balance: { decrement: amount } } }),
    ]);
    return s;
  }

  // ---------- মেয়াদোত্তীর্ণ / নষ্ট মাল স্টক থেকে বাদ ----------
  async discardBatch(t: string, batchId: string) {
    const b = await this.db.productBatch.findFirst({ where: { id: batchId, tenantId: t } });
    if (!b) throw new NotFoundException('ব্যাচ পাওয়া যায়নি');
    await this.db.$transaction([
      this.db.product.update({ where: { id: b.productId }, data: { stock: { decrement: b.qty } } }),
      this.db.productBatch.update({ where: { id: b.id }, data: { qty: 0 } }),
    ]);
    return true;
  }

  // ---------- রিপোর্ট ----------
  // ট্রেন্ডে ফেরত বাদ দিয়ে নেট বিক্রি ও লাভ দেখায়
  async trend(t: string, days: number) {
    const base = await this.baseTrend(t, days);
    const from = new Date(range('TODAY').from.getTime() - (base.length - 1) * DAY);
    const rets = await this.db.saleReturn.findMany({
      where: { tenantId: t, createdAt: { gte: from } },
      select: { total: true, cost: true, dueAdjusted: true, createdAt: true },
    });
    const byDay: Record<string, any> = {};
    for (const r of rets) {
      const d = dhakaDay(r.createdAt);
      const m = (byDay[d] ||= { total: 0, cost: 0, due: 0 });
      m.total += r.total; m.cost += r.cost; m.due += r.dueAdjusted;
    }
    return base.map((d: any) => {
      const r = byDay[d.date];
      return r ? { ...d, sale: d.sale - r.total, due: d.due - r.due, profit: d.profit - r.total + r.cost } : d;
    });
  }

  private async baseTrend(t: string, days: number) {
    days = Math.min(Math.max(Math.floor(days) || 7, 1), 90);
    const from = new Date(range('TODAY').from.getTime() - (days - 1) * DAY);
    const where = { tenantId: t, createdAt: { gte: from } };
    const [sales, exps] = await Promise.all([
      this.db.sale.findMany({ where, select: { total: true, dueAmount: true, cost: true, createdAt: true } }),
      this.db.expense.findMany({ where, select: { amount: true, createdAt: true } }),
    ]);
    const map: Record<string, any> = {};
    for (let k = 0; k < days; k++) {
      const d = dhakaDay(new Date(from.getTime() + k * DAY));
      map[d] = { date: d, sale: 0, due: 0, expense: 0, cost: 0 };
    }
    for (const s of sales) {
      const m = map[dhakaDay(s.createdAt)];
      if (m) { m.sale += s.total; m.due += s.dueAmount; m.cost += s.cost; }
    }
    for (const e of exps) {
      const m = map[dhakaDay(e.createdAt)];
      if (m) m.expense += e.amount;
    }
    return Object.values(map).map((d: any) => ({ date: d.date, sale: d.sale, due: d.due, expense: d.expense, profit: d.sale - d.cost - d.expense }));
  }

  async lowStock(t: string) {
    const list = await this.db.product.findMany({ where: { tenantId: t, minStock: { gt: 0 } } });
    return list.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock / a.minStock - b.stock / b.minStock).slice(0, 50);
  }

  async expiring(t: string, days: number) {
    const until = new Date(Date.now() + n(days) * DAY);
    const rows = await this.db.productBatch.findMany({
      where: { tenantId: t, qty: { gt: 0 }, expiry: { not: null, lte: until } },
      include: { product: true },
      orderBy: { expiry: 'asc' },
      take: 100,
    });
    const now = new Date();
    return rows.map((b) => ({
      id: b.id, productName: b.product.name, batchNo: b.batchNo, expiry: b.expiry, qty: b.qty,
      expired: b.expiry! < now, piecesPerStrip: b.product.piecesPerStrip, stripsPerBox: b.product.stripsPerBox,
    }));
  }

  async topSelling(t: string, days: number) {
    const from = new Date(Date.now() - n(days) * DAY);
    const items = await this.db.saleItem.findMany({
      where: { productId: { not: null }, sale: { tenantId: t, createdAt: { gte: from } } },
      select: { productId: true, name: true, qty: true, price: true, pieces: true },
    });
    const agg: Record<string, any> = {};
    for (const it of items) {
      const a = (agg[it.productId!] ||= { productId: it.productId, name: it.name, pieces: 0, revenue: 0 });
      a.pieces += it.pieces || it.qty;
      a.revenue += it.qty * it.price;
    }
    const top = Object.values(agg).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10) as any[];
    const products = await this.db.product.findMany({ where: { tenantId: t, id: { in: top.map((x) => x.productId) } } });
    return top.map((x) => {
      const p = products.find((p) => p.id === x.productId);
      return { ...x, piecesPerStrip: p?.piecesPerStrip || 1, stripsPerBox: p?.stripsPerBox || 1 };
    });
  }
}