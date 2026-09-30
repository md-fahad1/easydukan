import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { dhakaDay, range } from './dates';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const n = (v: any) => Number(v) || 0;

@Injectable()
export class ShopService {
  constructor(private db: PrismaService) {}

  // ---------- helpers ----------
  private async ownCustomer(t: string, id: string) {
    const c = await this.db.customer.findFirst({ where: { id, tenantId: t } });
    if (!c) throw new NotFoundException('কাস্টমার পাওয়া যায়নি');
    return c;
  }
  private async ownSupplier(t: string, id: string) {
    const s = await this.db.supplier.findFirst({ where: { id, tenantId: t } });
    if (!s) throw new NotFoundException('মালদাতা পাওয়া যায়নি');
    return s;
  }

  // ---------- আজকের হিসাব / রিপোর্ট ----------
  async summary(t: string, period: string) {
    const { from, to } = range(period);
    const where = { tenantId: t, createdAt: { gte: from, lt: to } };
    const [s, e, pays, pu, cust, sup, prods] = await Promise.all([
      this.db.sale.aggregate({
        where,
        _count: true,
        _sum: { total: true, cashAmount: true, bkashAmount: true, dueAmount: true, cost: true },
      }),
      this.db.expense.aggregate({ where, _sum: { amount: true } }),
      this.db.payment.groupBy({ by: ['type'], where, _sum: { amount: true } }),
      this.db.purchase.aggregate({ where, _sum: { paid: true } }),
      this.db.customer.aggregate({ where: { tenantId: t }, _sum: { balance: true } }),
      this.db.supplier.aggregate({ where: { tenantId: t }, _sum: { balance: true } }),
      this.db.product.findMany({ where: { tenantId: t, minStock: { gt: 0 } }, select: { stock: true, minStock: true } }),
    ]);
    const received = n(pays.find((p) => p.type === 'CUSTOMER_RECEIVE')?._sum.amount);
    const paidSupplier = n(pays.find((p) => p.type === 'SUPPLIER_PAY')?._sum.amount);
    const totalSale = n(s._sum.total), cash = n(s._sum.cashAmount), bkash = n(s._sum.bkashAmount);
    const expense = n(e._sum.amount);
    return {
      totalSale,
      cash,
      bkash,
      due: n(s._sum.dueAmount),
      expense,
      profit: totalSale - n(s._sum.cost) - expense, // আনুমানিক লাভ
      received,
      cashInHand: cash + bkash + received - expense - paidSupplier - n(pu._sum.paid),
      saleCount: s._count,
      customerDue: n(cust._sum.balance),
      supplierDue: n(sup._sum.balance),
      lowStockCount: prods.filter((p) => p.stock <= p.minStock).length,
    };
  }

  async closeDay(t: string) {
    const s = await this.summary(t, 'TODAY');
    const data = {
      totalSale: s.totalSale, cash: s.cash, bkash: s.bkash, due: s.due,
      expense: s.expense, profit: s.profit, cashInHand: s.cashInHand,
    };
    const date = dhakaDay();
    return this.db.dailyClosing.upsert({
      where: { tenantId_date: { tenantId: t, date } },
      update: data,
      create: { tenantId: t, date, ...data },
    });
  }

  closings(t: string) {
    return this.db.dailyClosing.findMany({ where: { tenantId: t }, orderBy: { date: 'desc' }, take: 60 });
  }

  // ---------- কাস্টমার / বাকি ----------
  customers(t: string) {
    return this.db.customer.findMany({ where: { tenantId: t }, orderBy: [{ balance: 'desc' }, { name: 'asc' }] });
  }
  customer(t: string, id: string) {
    return this.db.customer.findFirst({ where: { id, tenantId: t } });
  }
  createCustomer(t: string, name: string, phone?: string) {
    if (!name?.trim()) throw new BadRequestException('নাম দিন');
    return this.db.customer.create({ data: { tenantId: t, name: name.trim(), phone: phone || null } });
  }

  async receivePayment(t: string, customerId: string, amount: number, method = 'CASH') {
    await this.ownCustomer(t, customerId);
    if (!(amount > 0)) throw new BadRequestException('সঠিক টাকার পরিমাণ দিন');
    const [, c] = await this.db.$transaction([
      this.db.payment.create({ data: { tenantId: t, type: 'CUSTOMER_RECEIVE', customerId, amount, method } }),
      this.db.customer.update({ where: { id: customerId }, data: { balance: { decrement: amount } } }),
    ]);
    return c;
  }

  async customerLedger(t: string, customerId: string) {
    await this.ownCustomer(t, customerId);
    const [sales, pays] = await Promise.all([
      this.db.sale.findMany({ where: { tenantId: t, customerId, dueAmount: { gt: 0 } }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.db.payment.findMany({ where: { tenantId: t, customerId, type: 'CUSTOMER_RECEIVE' }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return [
      ...sales.map((s) => ({ date: s.createdAt, type: 'BAKI', amount: s.dueAmount, note: s.note })),
      ...pays.map((p) => ({ date: p.createdAt, type: 'JOMA', amount: p.amount, note: p.method })),
    ].sort((a, b) => +b.date - +a.date);
  }

  // ---------- মালদাতা ----------
  suppliers(t: string) {
    return this.db.supplier.findMany({ where: { tenantId: t }, orderBy: [{ balance: 'desc' }, { name: 'asc' }] });
  }
  createSupplier(t: string, name: string, phone?: string) {
    if (!name?.trim()) throw new BadRequestException('নাম দিন');
    return this.db.supplier.create({ data: { tenantId: t, name: name.trim(), phone: phone || null } });
  }
  async paySupplier(t: string, supplierId: string, amount: number, method = 'CASH') {
    await this.ownSupplier(t, supplierId);
    if (!(amount > 0)) throw new BadRequestException('সঠিক টাকার পরিমাণ দিন');
    const [, s] = await this.db.$transaction([
      this.db.payment.create({ data: { tenantId: t, type: 'SUPPLIER_PAY', supplierId, amount, method } }),
      this.db.supplier.update({ where: { id: supplierId }, data: { balance: { decrement: amount } } }),
    ]);
    return s;
  }

  // ---------- পণ্য ----------
  products(t: string) {
    return this.db.product.findMany({ where: { tenantId: t }, orderBy: { name: 'asc' } });
  }
  createProduct(t: string, i: any) {
    if (!i.name?.trim()) throw new BadRequestException('পণ্যের নাম দিন');
    return this.db.product.create({
      data: {
        tenantId: t, name: i.name.trim(), unit: i.unit || 'pcs',
        purchasePrice: n(i.purchasePrice), sellingPrice: n(i.sellingPrice), stock: n(i.stock), minStock: n(i.minStock),
      },
    });
  }
  async updateProduct(t: string, id: string, i: any) {
    const p = await this.db.product.findFirst({ where: { id, tenantId: t } });
    if (!p) throw new NotFoundException('পণ্য পাওয়া যায়নি');
    return this.db.product.update({
      where: { id },
      data: {
        name: i.name ?? p.name, unit: i.unit ?? p.unit,
        purchasePrice: i.purchasePrice ?? p.purchasePrice, sellingPrice: i.sellingPrice ?? p.sellingPrice,
        stock: i.stock ?? p.stock, minStock: i.minStock ?? p.minStock,
      },
    });
  }

  // ---------- বিক্রি ----------
  sales(t: string, period: string) {
    const { from, to } = range(period);
    return this.db.sale.findMany({
      where: { tenantId: t, createdAt: { gte: from, lt: to } },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createSale(t: string, userId: string, i: any) {
    let total = n(i.amount);
    let cost = 0;
    let items: any[] = [];
    if (i.items?.length) {
      const products = await this.db.product.findMany({ where: { tenantId: t, id: { in: i.items.map((x: any) => x.productId) } } });
      items = i.items.map((x: any) => {
        const p = products.find((p) => p.id === x.productId);
        if (!p) throw new BadRequestException('পণ্য পাওয়া যায়নি');
        return { productId: p.id, name: p.name, qty: n(x.qty), price: x.price ?? p.sellingPrice, cost: p.purchasePrice };
      });
      total = sum(items.map((x) => x.qty * x.price));
      cost = sum(items.map((x) => x.qty * x.cost));
    }
    if (!(total > 0)) throw new BadRequestException('টাকার পরিমাণ দিন');

    let cash = n(i.cashAmount), bkash = n(i.bkashAmount), due = n(i.dueAmount);
    if (!cash && !bkash && !due) cash = total; // ডিফল্ট: নগদ
    if (Math.abs(cash + bkash + due - total) > 0.01) throw new BadRequestException('নগদ + বিকাশ + বাকি মিলছে না');
    if (due > 0) {
      if (!i.customerId) throw new BadRequestException('বাকির জন্য কাস্টমার বেছে নিন');
      await this.ownCustomer(t, i.customerId);
    }

    return this.db.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId: t, customerId: i.customerId || null, total, cost,
          cashAmount: cash, bkashAmount: bkash, dueAmount: due, note: i.note || null, createdBy: userId,
          items: { create: items },
        },
        include: { items: true, customer: true },
      });
      for (const it of items)
        await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.qty } } });
      if (due > 0) await tx.customer.update({ where: { id: i.customerId }, data: { balance: { increment: due } } });
      return sale;
    });
  }

  // ---------- খরচ ----------
  expenses(t: string, period: string) {
    const { from, to } = range(period);
    return this.db.expense.findMany({ where: { tenantId: t, createdAt: { gte: from, lt: to } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
  createExpense(t: string, category: string, amount: number, note?: string) {
    if (!(amount > 0)) throw new BadRequestException('টাকার পরিমাণ দিন');
    return this.db.expense.create({ data: { tenantId: t, category: category || 'অন্যান্য', amount, note: note || null } });
  }

  // ---------- মাল কেনা ----------
  async createPurchase(t: string, i: any) {
    let total = n(i.total);
    const lines: any[] = [];
    if (i.items?.length) {
      const products = await this.db.product.findMany({ where: { tenantId: t, id: { in: i.items.map((x: any) => x.productId) } } });
      for (const x of i.items) {
        const p = products.find((p) => p.id === x.productId);
        if (!p) throw new BadRequestException('পণ্য পাওয়া যায়নি');
        lines.push({ productId: p.id, name: p.name, qty: n(x.qty), cost: n(x.cost) });
      }
      total = sum(lines.map((l) => l.qty * l.cost));
    }
    if (!(total > 0)) throw new BadRequestException('মালের মোট টাকা দিন');
    const paid = i.paid == null ? total : Math.min(n(i.paid), total);
    const due = total - paid;
    if (due > 0) {
      if (!i.supplierId) throw new BadRequestException('বাকির জন্য মালদাতা বেছে নিন');
    }
    if (i.supplierId) await this.ownSupplier(t, i.supplierId);

    return this.db.$transaction(async (tx) => {
      const pu = await tx.purchase.create({
        data: { tenantId: t, supplierId: i.supplierId || null, total, paid, due, items: { create: lines } },
      });
      for (const l of lines)
        await tx.product.update({ where: { id: l.productId }, data: { stock: { increment: l.qty }, purchasePrice: l.cost } });
      if (due > 0) await tx.supplier.update({ where: { id: i.supplierId }, data: { balance: { increment: due } } });
      return pu;
    });
  }

  // ---------- ইউজার (Owner) ----------
  users(t: string) {
    return this.db.user.findMany({ where: { tenantId: t }, orderBy: { createdAt: 'asc' } });
  }
  async addUser(t: string, i: any) {
    if (!/^01\d{9}$/.test(i.phone)) throw new BadRequestException('সঠিক মোবাইল নম্বর দিন');
    if (!['MANAGER', 'EMPLOYEE'].includes(i.role)) throw new BadRequestException('ভুল ভূমিকা');
    if (!i.password || i.password.length < 6) throw new BadRequestException('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    if (await this.db.user.findUnique({ where: { phone: i.phone } })) throw new BadRequestException('এই নম্বর আগেই ব্যবহার হয়েছে');
    return this.db.user.create({
      data: { tenantId: t, name: i.name, phone: i.phone, role: i.role, password: await bcrypt.hash(i.password, 10) },
    });
  }
}

export function need(user: any, ...roles: string[]) {
  if (!roles.includes(user.role)) throw new ForbiddenException('আপনার এই কাজের অনুমতি নেই');
}
