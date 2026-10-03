import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { range } from '../shop/dates';

const n = (v: any) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const DAY = 86400000;
const txt = (v: any) => String(v ?? '').trim() || null;

// IMEI / সিরিয়াল: ফাঁকা জায়গা বাদ, বড় হাতের অক্ষর (যাতে "ab 12" আর "AB12" একই ধরা হয়)
export const cleanSerials = (a?: any[]) => (a || []).map((s) => String(s ?? '').replace(/\s+/g, '').toUpperCase()).filter(Boolean);

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

// নাম না দিলে ব্র্যান্ড + মডেল (রং, ভ্যারিয়েন্ট) থেকে নিজে তৈরি হয়: "Samsung Galaxy A15 (Black, 8/128GB)"
const compose = (i: any) => {
  const base = [i.brand, i.model].map((s) => String(s ?? '').trim()).filter(Boolean).join(' ');
  const extra = [i.color, i.variant].map((s) => String(s ?? '').trim()).filter(Boolean).join(', ');
  return [base, extra ? `(${extra})` : ''].filter(Boolean).join(' ');
};

@Injectable()
export class GadgetService {
  constructor(private db: PrismaService) {}

  private async assertNewSerials(t: string, serials: string[]) {
    if (new Set(serials).size !== serials.length) throw new BadRequestException('একই সিরিয়াল/IMEI দুইবার দেওয়া হয়েছে');
    if (!serials.length) return;
    const ex = await this.db.productUnit.findFirst({ where: { tenantId: t, serial: { in: serials } } });
    if (ex) throw new BadRequestException(`সিরিয়াল/IMEI ${ex.serial} আগেই আছে`);
  }

  private view(u: any, extra: any = {}) {
    return {
      id: u.id, serial: u.serial, status: u.status, cost: u.cost, productId: u.productId,
      productName: u.product?.name ?? '', color: u.product?.color ?? null,
      soldAt: u.soldAt, warrantyEnd: u.warrantyEnd,
      inWarranty: !!u.warrantyEnd && u.warrantyEnd.getTime() >= Date.now(),
      price: null, customerName: null, customerPhone: null, ...extra,
    };
  }

  // ---------- গ্যাজেট তৈরি / এডিট ----------
  async saveGadget(t: string, id: string | null, i: any) {
    const name = txt(i.name) || compose(i);
    if (!name) throw new BadRequestException('ব্র্যান্ড বা মডেলের নাম দিন');
    const trackSerial = !!i.trackSerial;
    const warrantyMonths = Math.min(Math.max(Math.floor(n(i.warrantyMonths)), 0), 120);

    if (i.barcode) {
      const where: any = { tenantId: t, barcode: i.barcode };
      if (id) where.NOT = { id };
      if (await this.db.product.findFirst({ where })) throw new BadRequestException('এই বারকোড আগেই অন্য পণ্যে আছে');
    }
    const dupWhere: any = { tenantId: t, name: { equals: name, mode: 'insensitive' } };
    if (id) dupWhere.NOT = { id };
    if (await this.db.product.findFirst({ where: dupWhere })) throw new BadRequestException('এই নামে আগেই একটি পণ্য আছে (একই মডেল, রং ও ভ্যারিয়েন্ট)');

    const data = {
      name, brand: txt(i.brand), model: txt(i.model), category: txt(i.category), color: txt(i.color), variant: txt(i.variant),
      barcode: txt(i.barcode), warrantyMonths, trackSerial, unit: 'pcs',
      sellingPrice: n(i.sellPrice), purchasePrice: n(i.buyPrice), minStock: n(i.minQty),
    };

    if (id) {
      const p = await this.db.product.findFirst({ where: { id, tenantId: t } });
      if (!p) throw new NotFoundException('পণ্য পাওয়া যায়নি');
      if (p.trackSerial !== trackSerial && (p.stock > 0 || (await this.db.productUnit.count({ where: { tenantId: t, productId: id } }))))
        throw new BadRequestException('স্টক থাকা অবস্থায় সিরিয়াল ট্র্যাকিং চালু/বন্ধ করা যাবে না');
      return this.db.product.update({ where: { id }, data });
    }

    const openQty = Math.max(Math.floor(n(i.openQty)), 0);
    const serials = trackSerial ? cleanSerials(i.openSerials) : [];
    if (trackSerial && serials.length !== openQty) throw new BadRequestException(`শুরুর স্টক ${openQty}টির সিরিয়াল/IMEI দিন (দিয়েছেন ${serials.length}টি)`);
    await this.assertNewSerials(t, serials);

    return this.db.$transaction(async (tx) => {
      const p = await tx.product.create({ data: { tenantId: t, ...data, stock: openQty } });
      if (serials.length) await tx.productUnit.createMany({ data: serials.map((serial) => ({ tenantId: t, productId: p.id, serial, cost: data.purchasePrice })) });
      return p;
    });
  }

  // ---------- সাপ্লায়ার থেকে মাল কেনা ----------
  async purchase(t: string, i: any) {
    if (!i.items?.length) throw new BadRequestException('কমপক্ষে একটি পণ্য যোগ করুন');
    const ids = [...new Set(i.items.map((x: any) => x.productId))] as string[];
    if (ids.length !== i.items.length) throw new BadRequestException('একই পণ্য দুইবার দেওয়া যাবে না — পরিমাণ বাড়ান');
    const products = await this.db.product.findMany({ where: { tenantId: t, id: { in: ids } } });

    const all: string[] = [];
    const lines = i.items.map((x: any) => {
      const p = products.find((p) => p.id === x.productId);
      if (!p) throw new BadRequestException('পণ্য পাওয়া যায়নি');
      const qty = n(x.qty), cost = n(x.cost);
      if (!(qty > 0) || !Number.isInteger(qty)) throw new BadRequestException(`${p.name}: পরিমাণ পূর্ণসংখ্যায় দিন`);
      if (cost < 0) throw new BadRequestException(`${p.name}: দাম ঠিক নয়`);
      let serials: string[] = [];
      if (p.trackSerial) {
        serials = cleanSerials(x.serials);
        if (serials.length !== qty) throw new BadRequestException(`${p.name}: ${qty}টির সিরিয়াল/IMEI দিন (দিয়েছেন ${serials.length}টি)`);
        all.push(...serials);
      }
      return { productId: p.id, name: p.name, qty, cost, serials };
    });
    await this.assertNewSerials(t, all);

    const total = r2(sum(lines.map((l: any) => l.qty * l.cost)));
    if (!(total > 0)) throw new BadRequestException('মোট টাকা ০ হতে পারে না');
    const paid = i.paid == null ? total : Math.min(Math.max(n(i.paid), 0), total);
    const due = r2(total - paid);
    if (i.supplierId) {
      if (!(await this.db.supplier.findFirst({ where: { id: i.supplierId, tenantId: t } }))) throw new NotFoundException('সাপ্লায়ার পাওয়া যায়নি');
    } else if (due > 0) throw new BadRequestException('বাকির জন্য সাপ্লায়ার বেছে নিন');

    return this.db.$transaction(async (tx) => {
      const pu = await tx.purchase.create({
        data: {
          tenantId: t, supplierId: i.supplierId || null, total, paid, due,
          items: { create: lines.map((l: any) => ({ productId: l.productId, name: l.name, qty: l.qty, cost: l.cost, unit: 'pcs', pieces: l.qty })) },
        },
      });
      for (const l of lines) {
        await tx.product.update({ where: { id: l.productId }, data: { stock: { increment: l.qty }, purchasePrice: l.cost } });
        if (l.serials.length) await tx.productUnit.createMany({ data: l.serials.map((serial: string) => ({ tenantId: t, productId: l.productId, serial, cost: l.cost, purchaseId: pu.id })) });
      }
      if (due > 0) await tx.supplier.update({ where: { id: i.supplierId }, data: { balance: { increment: due } } });
      return pu;
    });
  }

  // ---------- বিক্রি (IMEI সহ) ----------
  async sale(t: string, userId: string, i: any) {
    if (!i.items?.length) throw new BadRequestException('কমপক্ষে একটি পণ্য যোগ করুন');
    const ids = [...new Set(i.items.map((x: any) => x.productId))] as string[];
    if (ids.length !== i.items.length) throw new BadRequestException('একই পণ্য দুইবার দেওয়া যাবে না — পরিমাণ বাড়ান');
    const products = await this.db.product.findMany({ where: { tenantId: t, id: { in: ids } } });

    const lines: { p: any; qty: number; price: number; cost: number; units: any[] }[] = [];
    for (const x of i.items) {
      const p = products.find((p) => p.id === x.productId);
      if (!p) throw new BadRequestException('পণ্য পাওয়া যায়নি');
      const qty = n(x.qty);
      if (!(qty > 0) || !Number.isInteger(qty)) throw new BadRequestException(`${p.name}: পরিমাণ পূর্ণসংখ্যায় দিন`);
      if (p.stock < qty) throw new BadRequestException(`${p.name}: স্টকে মাত্র ${p.stock}টি আছে`);
      let units: any[] = [];
      if (p.trackSerial) {
        const serials = cleanSerials(x.serials);
        if (serials.length !== qty) throw new BadRequestException(`${p.name}: ${qty}টির সিরিয়াল/IMEI বেছে নিন (দিয়েছেন ${serials.length}টি)`);
        if (new Set(serials).size !== serials.length) throw new BadRequestException('একই সিরিয়াল/IMEI দুইবার দেওয়া হয়েছে');
        units = await this.db.productUnit.findMany({ where: { tenantId: t, productId: p.id, status: 'IN_STOCK', serial: { in: serials } } });
        const miss = serials.find((s) => !units.some((u) => u.serial === s));
        if (miss) throw new BadRequestException(`${miss}: এই সিরিয়াল/IMEI স্টকে নেই`);
      }
      const price = x.price != null ? n(x.price) : p.sellingPrice;
      if (price < 0) throw new BadRequestException(`${p.name}: দাম ঠিক নয়`);
      const cost = units.length ? r2(sum(units.map((u) => u.cost)) / qty) : p.purchasePrice; // IMEI থাকলে আসল কেনা দামে লাভ হিসাব
      lines.push({ p, qty, price, cost, units });
    }

    const total = r2(sum(lines.map((l) => l.qty * l.price)));
    const cost = sum(lines.map((l) => l.qty * l.cost));
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
          items: { create: lines.map((l) => ({ productId: l.p.id, name: l.p.name, qty: l.qty, price: l.price, cost: l.cost, unit: 'pcs', pieces: l.qty })) },
        },
        include: { items: true, customer: true },
      });
      const now = new Date();
      for (const l of lines) {
        await tx.product.update({ where: { id: l.p.id }, data: { stock: { decrement: l.qty } } });
        if (!l.units.length) continue;
        const item = sale.items.find((it) => it.productId === l.p.id)!;
        const r = await tx.productUnit.updateMany({
          where: { id: { in: l.units.map((u) => u.id) }, status: 'IN_STOCK' },
          data: { status: 'SOLD', saleId: sale.id, saleItemId: item.id, soldAt: now, warrantyEnd: l.p.warrantyMonths > 0 ? addMonths(now, l.p.warrantyMonths) : null },
        });
        if (r.count !== l.units.length) throw new BadRequestException(`${l.p.name}: কিছু সিরিয়াল/IMEI এইমাত্র অন্য বিক্রিতে চলে গেছে`);
      }
      if (due > 0) await tx.customer.update({ where: { id: i.customerId }, data: { balance: { increment: due } } });
      return sale;
    });
  }

  // ---------- বিক্রির সময় বেছে নেওয়ার জন্য স্টকে থাকা IMEI ----------
  async availableUnits(t: string, productId: string) {
    const rows = await this.db.productUnit.findMany({
      where: { tenantId: t, productId, status: 'IN_STOCK' }, include: { product: true }, orderBy: { createdAt: 'asc' }, take: 500,
    });
    return rows.map((u) => this.view(u));
  }

  // ---------- ওয়ারেন্টি / IMEI খোঁজা (শেষের কয়েকটি ডিজিট দিলেও চলবে) ----------
  async searchUnits(t: string, query: string) {
    const q = cleanSerials([query])[0];
    if (!q || q.length < 4) return [];
    const rows = await this.db.productUnit.findMany({
      where: { tenantId: t, serial: { contains: q } }, include: { product: true }, orderBy: { createdAt: 'desc' }, take: 20,
    });
    const saleIds = rows.map((r) => r.saleId).filter(Boolean) as string[];
    const itemIds = rows.map((r) => r.saleItemId).filter(Boolean) as string[];
    const [sales, items] = await Promise.all([
      this.db.sale.findMany({ where: { tenantId: t, id: { in: saleIds } }, include: { customer: true } }),
      this.db.saleItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, price: true } }),
    ]);
    return rows.map((u) => {
      const c = sales.find((s) => s.id === u.saleId)?.customer;
      return this.view(u, { customerName: c?.name ?? null, customerPhone: c?.phone ?? null, price: items.find((x) => x.id === u.saleItemId)?.price ?? null });
    });
  }

  // ---------- ব্র্যান্ড / ক্যাটাগরি / রং অনুযায়ী স্টক ও বিক্রি ----------
  async breakdown(t: string, by: string, days: number) {
    const field = by === 'category' ? 'category' : by === 'color' ? 'color' : 'brand';
    const d = Math.min(Math.max(Math.floor(days) || 30, 1), 365);
    const from = new Date(range('TODAY').from.getTime() - (d - 1) * DAY);
    const [products, items, rets] = await Promise.all([
      this.db.product.findMany({ where: { tenantId: t }, select: { id: true, brand: true, category: true, color: true, stock: true, purchasePrice: true } }),
      this.db.saleItem.findMany({ where: { productId: { not: null }, sale: { tenantId: t, createdAt: { gte: from } } }, select: { productId: true, qty: true, price: true, cost: true } }),
      this.db.saleReturnItem.findMany({ where: { productId: { not: null }, saleReturn: { tenantId: t, createdAt: { gte: from } } }, select: { productId: true, qty: true, price: true, cost: true } }),
    ]);
    const keyOf = new Map(products.map((p) => [p.id, (p[field] as string | null) || 'অন্যান্য']));
    const rows: Record<string, any> = {};
    const row = (k: string) => (rows[k] ||= { key: k, stock: 0, stockValue: 0, sold: 0, revenue: 0, profit: 0 });
    for (const p of products) { const r = row(keyOf.get(p.id)!); r.stock += p.stock; r.stockValue += p.stock * p.purchasePrice; }
    const add = (list: any[], sign: number) => {
      for (const x of list) {
        const k = keyOf.get(x.productId); if (!k) continue;
        const r = row(k);
        r.sold += sign * x.qty; r.revenue += sign * x.qty * x.price; r.profit += sign * x.qty * (x.price - x.cost);
      }
    };
    add(items, 1); add(rets, -1); // ফেরত বাদ দিয়ে নেট
    return Object.values(rows).sort((a: any, b: any) => b.revenue - a.revenue || b.stock - a.stock);
  }

  // ---------- ফর্মে সাজেশনের জন্য আগে ব্যবহার করা ব্র্যান্ড / ক্যাটাগরি / রং ----------
  async facets(t: string) {
    const rows = await this.db.product.findMany({ where: { tenantId: t }, select: { brand: true, category: true, color: true, variant: true }, take: 3000 });
    const u = (k: 'brand' | 'category' | 'color' | 'variant') => [...new Set(rows.map((r) => r[k]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
    return { brands: u('brand'), categories: u('category'), colors: u('color'), variants: u('variant') };
  }
}