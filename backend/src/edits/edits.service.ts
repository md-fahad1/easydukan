import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { dhakaDay, range } from '../shop/dates';
import { ShopService } from '../shop/shop.service';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { GadgetService } from '../gadget/gadget.service';

type Kind = 'shop' | 'pharma' | 'gadget';

const DAY = 86400000;
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const TX = { timeout: 30000, maxWait: 10000 };

@Injectable()
export class EditsService {
  constructor(private db: PrismaService) {}

  private since(days: number) {
    const d = Math.min(Math.max(Math.floor(days) || 1, 1), 90);
    return new Date(range('TODAY').from.getTime() - (d - 1) * DAY);
  }

  // transaction-এর ভেতরে পুরনো সার্ভিসের কোড চালানোর জন্য (nested transaction এড়াতে)
  private scope(tx: any): any {
    return new Proxy(tx, { get: (o: any, p: any) => (p === '$transaction' ? (fn: any) => fn(tx) : o[p]) });
  }

  // ---------- তালিকা ----------
  async sales(t: string, days: number) {
    const rows = await this.db.sale.findMany({
      where: { tenantId: t, createdAt: { gte: this.since(days) } },
      include: { customer: true, items: true, returns: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const units = await this.db.productUnit.findMany({ where: { tenantId: t, saleId: { in: rows.map((r) => r.id) } }, select: { saleItemId: true, serial: true } });
    return rows.map((s) => ({
      id: s.id, total: s.total, cashAmount: s.cashAmount, bkashAmount: s.bkashAmount, dueAmount: s.dueAmount,
      note: s.note, createdAt: s.createdAt, customerId: s.customerId, customerName: s.customer?.name || null,
      hasReturn: s.returns.length > 0,
      items: s.items.map((i) => ({ id: i.id, productId: i.productId, name: i.name, unit: i.unit, qty: i.qty, price: i.price, serials: units.filter((u) => u.saleItemId === i.id).map((u) => u.serial) })),
    }));
  }

  async purchases(t: string, days: number) {
    const rows = await this.db.purchase.findMany({
      where: { tenantId: t, createdAt: { gte: this.since(days) } },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const batches = await this.db.productBatch.findMany({ where: { tenantId: t, purchaseId: { in: rows.map((r) => r.id) } } });
    const units = await this.db.productUnit.findMany({ where: { tenantId: t, purchaseId: { in: rows.map((r) => r.id) } }, select: { purchaseId: true, productId: true, serial: true } });
    return rows.map((p) => ({
      id: p.id, total: p.total, paid: p.paid, due: p.due, createdAt: p.createdAt,
      supplierId: p.supplierId, supplierName: p.supplier?.name || null,
      items: p.items.map((i) => {
        const b = batches.find((b) => b.purchaseId === p.id && b.productId === i.productId);
        return {
          id: i.id, productId: i.productId, name: i.name, unit: i.unit, qty: i.qty, cost: i.cost,
          batchNo: b?.batchNo || null, expiry: b?.expiry ? dhakaDay(b.expiry) : null,
          serials: units.filter((u) => u.purchaseId === p.id && u.productId === i.productId).map((u) => u.serial),
        };
      }),
    }));
  }

  // ---------- বিক্রি: স্টক ও বাকি আগের অবস্থায় ফেরানো ----------
  private async putBack(tx: any, t: string, productId: string, pieces: number, pieceCost: number) {
    const p = await tx.product.findFirst({ where: { id: productId, tenantId: t } });
    if (!p) return;
    await tx.product.update({ where: { id: p.id }, data: { stock: { increment: pieces } } });
    if (!(await tx.productBatch.count({ where: { tenantId: t, productId: p.id } }))) return; // মুদি দোকানের পণ্য — ব্যাচ নেই
    const b = await tx.productBatch.findFirst({
      where: { tenantId: t, productId: p.id, OR: [{ expiry: null }, { expiry: { gte: new Date() } }] },
      orderBy: [{ expiry: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    if (b) await tx.productBatch.update({ where: { id: b.id }, data: { qty: { increment: pieces } } });
    else await tx.productBatch.create({ data: { tenantId: t, productId: p.id, batchNo: 'RETURN', expiry: null, qty: pieces, cost: pieceCost } });
  }

  private async reverseSale(tx: any, t: string, id: string) {
    const s = await tx.sale.findFirst({ where: { id, tenantId: t }, include: { items: true, returns: { select: { id: true } } } });
    if (!s) throw new NotFoundException('বিক্রি পাওয়া যায়নি');
    if (s.returns.length) throw new BadRequestException('এই বিক্রিতে ফেরত নেওয়া হয়েছে — মুছা বা সংশোধন করা যাবে না');
    for (const it of s.items) {
      if (!it.productId) continue;
      const per = it.pieces > 0 ? it.pieces / it.qty : 1;
      await this.putBack(tx, t, it.productId, it.qty * per, r4(it.cost / per));
    }
    // গ্যাজেট: এই বিক্রির IMEI/সিরিয়াল আবার স্টকে
    await tx.productUnit.updateMany({ where: { tenantId: t, saleId: id }, data: { status: 'IN_STOCK', saleId: null, saleItemId: null, soldAt: null, warrantyEnd: null } });
    if (s.dueAmount > 0 && s.customerId)
      await tx.customer.update({ where: { id: s.customerId }, data: { balance: { decrement: s.dueAmount } } });
    return s;
  }

  deleteSale(t: string, id: string) {
    return this.db.$transaction(async (tx) => {
      await this.reverseSale(tx, t, id);
      await tx.sale.delete({ where: { id } });
      return true;
    }, TX);
  }

  editSale(t: string, userId: string, id: string, input: any, kind: Kind) {
    return this.db.$transaction(async (tx) => {
      const old = await this.reverseSale(tx, t, id);
      await tx.sale.delete({ where: { id } });
      const sc = this.scope(tx);
      const made: any = kind === 'pharma' ? await new PharmacyService(sc).sale(t, userId, input)
        : kind === 'gadget' ? await new GadgetService(sc).sale(t, userId, input)
        : await new ShopService(sc).createSale(t, userId, input);
      // আগের তারিখ ও কে বিক্রি করেছিল সেটা ঠিক রাখা
      return tx.sale.update({
        where: { id: made.id },
        data: { createdAt: old.createdAt, createdBy: old.createdBy },
        include: { items: true, customer: true },
      });
    }, TX);
  }

  // ---------- মাল কেনা: স্টক ও পাওনা আগের অবস্থায় ফেরানো ----------
  private async undoPurchase(tx: any, t: string, id: string) {
    const pu = await tx.purchase.findFirst({ where: { id, tenantId: t }, include: { items: true } });
    if (!pu) throw new NotFoundException('মাল কেনার হিসাব পাওয়া যায়নি');
    // গ্যাজেট: কেনা মালের কোনো IMEI বিক্রি হয়ে গেলে মুছা যাবে না
    if (await tx.productUnit.count({ where: { tenantId: t, purchaseId: pu.id, status: 'SOLD' } }))
      throw new BadRequestException('এই কেনার কিছু IMEI/সিরিয়াল বিক্রি হয়ে গেছে, তাই মুছা বা সংশোধন করা যাবে না');
    for (const it of pu.items) {
      if (!it.productId) continue;
      const p = await tx.product.findFirst({ where: { id: it.productId, tenantId: t } });
      if (!p) continue;
      const pieces = it.pieces > 0 ? it.pieces : it.qty;
      await tx.productUnit.deleteMany({ where: { tenantId: t, purchaseId: pu.id, productId: p.id } });
      if (p.stock < pieces - 1e-9)
        throw new BadRequestException(`${it.name}: এই মালের কিছু অংশ বিক্রি হয়ে গেছে, তাই মুছা বা সংশোধন করা যাবে না`);
      await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: pieces } } });

      let left = pieces;
      const linked = await tx.productBatch.findMany({ where: { tenantId: t, productId: p.id, purchaseId: pu.id } });
      for (const b of linked) {
        left -= Math.min(b.qty, left);
        await tx.productBatch.delete({ where: { id: b.id } });
      }
      if (left > 1e-9) {
        // পুরনো ডাটায় ব্যাচের সাথে লিংক নেই — নতুন ব্যাচ থেকে কমানো হবে
        const others = await tx.productBatch.findMany({ where: { tenantId: t, productId: p.id, qty: { gt: 0 } }, orderBy: { createdAt: 'desc' } });
        for (const b of others) {
          if (left <= 1e-9) break;
          const take = Math.min(b.qty, left);
          await tx.productBatch.update({ where: { id: b.id }, data: { qty: { decrement: take } } });
          left -= take;
        }
      }
    }
    if (pu.due > 0 && pu.supplierId)
      await tx.supplier.update({ where: { id: pu.supplierId }, data: { balance: { decrement: pu.due } } });
    return pu;
  }

  deletePurchase(t: string, id: string) {
    return this.db.$transaction(async (tx) => {
      await this.undoPurchase(tx, t, id);
      await tx.purchase.delete({ where: { id } });
      return true;
    }, TX);
  }

  editPurchase(t: string, id: string, input: any, kind: Kind) {
    return this.db.$transaction(async (tx) => {
      const old = await this.undoPurchase(tx, t, id);
      await tx.purchase.delete({ where: { id } });
      const sc = this.scope(tx);
      const made: any = kind === 'pharma' ? await new PharmacyService(sc).purchase(t, input)
        : kind === 'gadget' ? await new GadgetService(sc).purchase(t, input)
        : await new ShopService(sc).createPurchase(t, input);
      return tx.purchase.update({ where: { id: made.id }, data: { createdAt: old.createdAt } });
    }, TX);
  }
}