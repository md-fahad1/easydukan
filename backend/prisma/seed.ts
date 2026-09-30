import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { range } from '../src/shop/dates';

const db = new PrismaClient();
const OWNER_PHONE = '01700000000';
const H = 3600 * 1000;
const dayStart = range('TODAY').from.getTime();
// dayOffset: 0 = আজ, -1 = গতকাল ... ; hour = দিনের কত ঘণ্টায় (ভবিষ্যতে গেলে এখনকার সময় ধরা হবে)
const at = (dayOffset: number, hour: number) => new Date(Math.min(Date.now(), dayStart + dayOffset * 24 * H + hour * H));

async function wipe() {
  const u = await db.user.findUnique({ where: { phone: OWNER_PHONE } });
  if (!u) return;
  const t = u.tenantId;
  await db.sale.deleteMany({ where: { tenantId: t } });
  await db.purchase.deleteMany({ where: { tenantId: t } });
  await db.payment.deleteMany({ where: { tenantId: t } });
  await db.expense.deleteMany({ where: { tenantId: t } });
  await db.dailyClosing.deleteMany({ where: { tenantId: t } });
  await db.customer.deleteMany({ where: { tenantId: t } });
  await db.supplier.deleteMany({ where: { tenantId: t } });
  await db.product.deleteMany({ where: { tenantId: t } });
  await db.user.deleteMany({ where: { tenantId: t } });
  await db.tenant.delete({ where: { id: t } });
}

async function main() {
  await wipe();
  const pw = await bcrypt.hash('123456', 10);

  const tenant = await db.tenant.create({
    data: {
      name: 'রহমান গ্রোসারি',
      ownerName: 'রহমান সাহেব',
      phone: OWNER_PHONE,
      shopType: 'মুদি দোকান',
      users: {
        create: [
          { name: 'রহমান সাহেব', phone: OWNER_PHONE, password: pw, role: 'OWNER' },
          { name: 'জামাল (ম্যানেজার)', phone: '01700000001', password: pw, role: 'MANAGER' },
          { name: 'রুবেল (কর্মচারী)', phone: '01700000002', password: pw, role: 'EMPLOYEE' },
        ],
      },
    },
    include: { users: true },
  });
  const t = tenant.id;
  const ownerId = tenant.users[0].id;

  // ---------- পণ্য ----------
  const mk = (name: string, unit: string, buy: number, sell: number, stock: number, min: number) =>
    db.product.create({ data: { tenantId: t, name, unit, purchasePrice: buy, sellingPrice: sell, stock, minStock: min } });
  const P: Record<string, any> = {
    rice: await mk('চাল (মিনিকেট)', 'kg', 65, 75, 40, 20),
    dal: await mk('মসুর ডাল', 'kg', 110, 125, 30, 10),
    oil: await mk('সয়াবিন তেল', 'লিটার', 165, 180, 6, 10), // কম স্টক হবে
    sugar: await mk('চিনি', 'kg', 115, 130, 10, 10),
    salt: await mk('লবণ', 'kg', 35, 40, 40, 10),
    egg: await mk('ডিম', 'pcs', 11, 13, 20, 30), // কম স্টক হবে
    soap: await mk('সাবান', 'pcs', 30, 40, 60, 15),
  };

  // ---------- কাস্টমার / মালদাতা (আগের বাকিসহ) ----------
  const C = {
    karim: await db.customer.create({ data: { tenantId: t, name: 'করিম ভাই', phone: '01711111111', balance: 2450 } }),
    rahima: await db.customer.create({ data: { tenantId: t, name: 'রহিমা খাতুন', phone: '01822222222', balance: 0 } }),
    salam: await db.customer.create({ data: { tenantId: t, name: 'সালাম মিয়া', phone: '01933333333', balance: 800 } }),
  };
  const S = {
    rahman: await db.supplier.create({ data: { tenantId: t, name: 'Rahman Traders', phone: '01644444444', balance: 18500 } }),
    alam: await db.supplier.create({ data: { tenantId: t, name: 'আলম এন্টারপ্রাইজ', phone: '01555555555', balance: 0 } }),
  };

  // ---------- helpers ----------
  async function sale(o: { items?: [string, number][]; amount?: number; cash?: number; bkash?: number; due?: number; cust?: string; when: Date }) {
    let total = o.amount || 0, cost = 0;
    const items: any[] = [];
    for (const [k, qty] of o.items || []) {
      const p = P[k];
      items.push({ productId: p.id, name: p.name, qty, price: p.sellingPrice, cost: p.purchasePrice });
      total += qty * p.sellingPrice;
      cost += qty * p.purchasePrice;
    }
    const noPay = !o.cash && !o.bkash && !o.due;
    const cash = noPay ? total : o.cash || 0, bkash = o.bkash || 0, due = o.due || 0;
    await db.sale.create({
      data: { tenantId: t, customerId: o.cust || null, total, cost, cashAmount: cash, bkashAmount: bkash, dueAmount: due, createdBy: ownerId, createdAt: o.when, items: { create: items } },
    });
    for (const [k, qty] of o.items || []) await db.product.update({ where: { id: P[k].id }, data: { stock: { decrement: qty } } });
    if (due > 0 && o.cust) await db.customer.update({ where: { id: o.cust }, data: { balance: { increment: due } } });
  }

  async function purchase(o: { supplier: string; items: [string, number, number][]; paid: number; when: Date }) {
    const lines = o.items.map(([k, qty, cost]) => ({ productId: P[k].id, name: P[k].name, qty, cost }));
    const total = lines.reduce((a, l) => a + l.qty * l.cost, 0);
    const due = total - o.paid;
    await db.purchase.create({ data: { tenantId: t, supplierId: o.supplier, total, paid: o.paid, due, createdAt: o.when, items: { create: lines } } });
    for (const l of lines) await db.product.update({ where: { id: l.productId }, data: { stock: { increment: l.qty }, purchasePrice: l.cost } });
    if (due > 0) await db.supplier.update({ where: { id: o.supplier }, data: { balance: { increment: due } } });
  }

  const expense = (category: string, amount: number, when: Date, note?: string) =>
    db.expense.create({ data: { tenantId: t, category, amount, note: note || null, createdAt: when } });

  // ---------- ৩ দিন আগে ----------
  await sale({ amount: 3100, when: at(-3, 10) });
  await sale({ amount: 1800, cash: 0, due: 1800, cust: C.karim.id, when: at(-3, 15) });
  await expense('বিদ্যুৎ', 950, at(-3, 12));

  // ---------- গতকাল ----------
  await purchase({ supplier: S.rahman.id, items: [['rice', 50, 65], ['sugar', 30, 115], ['salt', 20, 35]], paid: 5000, when: at(-1, 9) });
  await sale({ amount: 2400, when: at(-1, 11) });
  await sale({ amount: 950, bkash: 950, cash: 0, when: at(-1, 14) });
  await sale({ amount: 700, cash: 0, due: 700, cust: C.salam.id, when: at(-1, 18) });
  await expense('দোকান ভাড়া', 2000, at(-1, 10));
  await expense('পরিবহন', 250, at(-1, 13));

  // ---------- আজ ----------
  await sale({ amount: 500, when: at(0, 9) });
  await sale({ items: [['rice', 5], ['dal', 2]], when: at(0, 10) }); // ৬২৫ নগদ
  await sale({ items: [['oil', 3], ['sugar', 2]], bkash: 800, cash: 0, when: at(0, 11) });
  await sale({ amount: 500, cash: 0, due: 500, cust: C.karim.id, when: at(0, 12) });
  await sale({ items: [['rice', 10], ['egg', 12]], cash: 400, due: 506, cust: C.rahima.id, when: at(0, 13) });
  await sale({ amount: 1200, bkash: 1200, cash: 0, when: at(0, 14) });
  await expense('বিদ্যুৎ', 1200, at(0, 10), 'সেপ্টেম্বরের বিল');
  await expense('পরিবহন', 300, at(0, 12));
  await expense('কর্মচারী', 500, at(0, 15), 'দৈনিক');

  // আজ বাকি আদায় ও মালদাতাকে পরিশোধ
  await db.payment.create({ data: { tenantId: t, type: 'CUSTOMER_RECEIVE', customerId: C.karim.id, amount: 1000, method: 'CASH', createdAt: at(0, 16) } });
  await db.customer.update({ where: { id: C.karim.id }, data: { balance: { decrement: 1000 } } });
  await db.payment.create({ data: { tenantId: t, type: 'SUPPLIER_PAY', supplierId: S.rahman.id, amount: 2000, method: 'CASH', createdAt: at(0, 16) } });
  await db.supplier.update({ where: { id: S.rahman.id }, data: { balance: { decrement: 2000 } } });

  console.log('\n✅ Demo data তৈরি হয়েছে — "রহমান গ্রোসারি"\n');
  console.log('Owner     → 01700000000 / 123456');
  console.log('Manager   → 01700000001 / 123456');
  console.log('Employee  → 01700000002 / 123456 (শুধু বিক্রি)\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());