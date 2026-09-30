import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { range } from '../shop/dates';

const DAY = 86400000;
const n = (v: any) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

@Injectable()
export class ReturnsService {
  constructor(private db: PrismaService) {}

  private sinceDays(days: number) {
    const d = Math.min(Math.max(Math.floor(days) || 1, 1), 90);
    return new Date(range('TODAY').from.getTime() - (d - 1) * DAY);
  }

  // কোন বিক্রির আইটেম থেকে আগে কতটা ফেরত হয়েছে
  private async returnedMap(saleIds: string[]) {
    const rows = await this.db.saleReturnItem.groupBy({
      by: ['saleItemId'],
      where: { saleReturn: { saleId: { in: saleIds } } },
      _sum: { qty: true },
    });
    const map: Record<string, number> = {};
    for (const r of rows) map[r.saleItemId] = n(r._sum.qty);
    return map;
  }

  // ---------- ফেরত দেওয়ার মতো বিক্রির তালিকা ----------
  async returnableSales(t: string, days: number) {
    const sales = await this.db.sale.findMany({
      where: { tenantId: t, createdAt: { gte: this.sinceDays(days) } },
      include: { customer: true, items: true, returns: { select: { total: true, dueAdjusted: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const done = await this.returnedMap(sales.map((s) => s.id));
    return sales.map((s) => ({
      id: s.id,
      total: s.total,
      dueAmount: s.dueAmount,
      dueLeft: Math.max(s.dueAmount - sum(s.returns.map((r) => r.dueAdjusted)), 0),
      createdAt: s.createdAt,
      customerName: s.customer?.name || null,
      returnedTotal: sum(s.returns.map((r) => r.total)),
      items: s.items.map((it) => ({
        id: it.id, productId: it.productId, name: it.name, unit: it.unit,
        qty: it.qty, returnedQty: done[it.id] || 0, price: it.price,
      })),
    }));
  }

  // ---------- ফেরতের ইতিহাস ----------
  async history(t: string, days: number) {
    const rows = await this.db.saleReturn.findMany({
      where: { tenantId: t, createdAt: { gte: this.sinceDays(days) } },
      include: { items: true, sale: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id, saleId: r.saleId, total: r.total, refund: r.refund, dueAdjusted: r.dueAdjusted,
      refundMethod: r.refundMethod, note: r.note, createdAt: r.createdAt,
      customerName: r.sale.customer?.name || null,
      items: r.items.map((i) => ({ name: i.name, unit: i.unit, qty: i.qty })),
    }));
  }

  // ---------- নতুন ফেরত ----------
  async create(t: string, userId: string, i: any) {
    if (!i.items?.length) throw new BadRequestException('কোন আইটেম ফেরত হবে বেছে নিন');
    const sale = await this.db.sale.findFirst({
      where: { id: i.saleId, tenantId: t },
      include: { items: true, returns: true, customer: true },
    });
    if (!sale) throw new NotFoundException('বিক্রি পাওয়া যায়নি');

    const done = await this.returnedMap([sale.id]);
    const method = i.refundMethod === 'BKASH' ? 'BKASH' : 'CASH';
    const seen = new Set<string>();
    const lines: any[] = [];

    for (const x of i.items) {
      const qty = n(x.qty);
      if (!(qty > 0)) continue;
      if (seen.has(x.saleItemId)) throw new BadRequestException('একই আইটেম দুইবার দেওয়া হয়েছে');
      seen.add(x.saleItemId);
      const it = sale.items.find((s) => s.id === x.saleItemId);
      if (!it) throw new BadRequestException('আইটেম এই বিক্রিতে নেই');
      const left = it.qty - (done[it.id] || 0);
      if (qty > left + 1e-9) throw new BadRequestException(`${it.name}: সর্বোচ্চ ${left} ফেরত নেওয়া যায়`);
      const perUnit = it.pieces > 0 ? it.pieces / it.qty : 1; // ১ unit = কত পিস
      lines.push({
        saleItemId: it.id, productId: it.productId, name: it.name, unit: it.unit,
        qty, pieces: qty * perUnit, price: it.price, cost: it.cost,
      });
    }
    if (!lines.length) throw new BadRequestException('ফেরতের পরিমাণ দিন');

    const total = r2(sum(lines.map((l) => l.qty * l.price)));
    const cost = sum(lines.map((l) => l.qty * l.cost));
    // আগে বাকি কমবে, বাকি থাকলে তারপর টাকা ফেরত
    const dueLeft = Math.max(sale.dueAmount - sum(sale.returns.map((r) => r.dueAdjusted)), 0);
    const dueAdjusted = sale.customerId ? r2(Math.min(total, dueLeft)) : 0;
    const refund = r2(total - dueAdjusted);

    return this.db.$transaction(async (tx) => {
      const ret = await tx.saleReturn.create({
        data: {
          tenantId: t, saleId: sale.id, total, cost, dueAdjusted, refund, refundMethod: method,
          note: i.note || null, createdBy: userId,
          items: { create: lines },
        },
      });

      for (const l of lines) {
        if (!l.productId) continue;
        const p = await tx.product.findFirst({ where: { id: l.productId, tenantId: t } });
        if (!p) continue;
        await tx.product.update({ where: { id: p.id }, data: { stock: { increment: l.pieces } } });

        // ফার্মেসির ওষুধ হলে ব্যাচেও ফেরত যাবে (আগে মেয়াদ শেষ হওয়া, মেয়াদ থাকা ব্যাচে)
        const hasBatch = await tx.productBatch.count({ where: { tenantId: t, productId: p.id } });
        if (hasBatch) {
          const b = await tx.productBatch.findFirst({
            where: { tenantId: t, productId: p.id, OR: [{ expiry: null }, { expiry: { gte: new Date() } }] },
            orderBy: [{ expiry: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
          });
          if (b) await tx.productBatch.update({ where: { id: b.id }, data: { qty: { increment: l.pieces } } });
          else
            await tx.productBatch.create({
              data: { tenantId: t, productId: p.id, batchNo: 'RETURN', expiry: null, qty: l.pieces, cost: r4(l.cost / (l.pieces / l.qty)) },
            });
        }
      }

      if (dueAdjusted > 0 && sale.customerId)
        await tx.customer.update({ where: { id: sale.customerId }, data: { balance: { decrement: dueAdjusted } } });

      return {
        id: ret.id, saleId: sale.id, total, refund, dueAdjusted, refundMethod: method,
        note: ret.note, createdAt: ret.createdAt, customerName: sale.customer?.name || null,
        items: lines.map((l) => ({ name: l.name, unit: l.unit, qty: l.qty })),
      };
    });
  }
}