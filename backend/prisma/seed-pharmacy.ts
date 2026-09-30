import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { range } from '../src/shop/dates';

const db = new PrismaClient();
const OWNER_PHONE = '01800000000';
const H = 3600 * 1000;
const DAY = 24 * H;
const dayStart = range('TODAY').from.getTime();
// dayOffset: 0 = আজ, -1 = গতকাল ...; hour = দিনের কত ঘণ্টায় (ভবিষ্যতে গেলে এখনকার সময়)
const at = (dayOffset: number, hour: number) => new Date(Math.min(Date.now(), dayStart + dayOffset * DAY + hour * H));
// মেয়াদ: আজ থেকে n দিন পর (ঋণাত্মক হলে মেয়াদোত্তীর্ণ)
const exp = (days: number) => new Date(Date.now() + days * DAY);

async function wipe() {
  const u = await db.user.findUnique({ where: { phone: OWNER_PHONE } });
  if (!u) return;
  const t = u.tenantId;
  await db.sale.deleteMany({ where: { tenantId: t } });
  await db.purchase.deleteMany({ where: { tenantId: t } });
  await db.payment.deleteMany({ where: { tenantId: t } });
  await db.expense.deleteMany({ where: { tenantId: t } });
  await db.dailyClosing.deleteMany({ where: { tenantId: t } });
  await db.productBatch.deleteMany({ where: { tenantId: t } });
  await db.customer.deleteMany({ where: { tenantId: t } });
  await db.supplier.deleteMany({ where: { tenantId: t } });
  await db.product.deleteMany({ where: { tenantId: t } });
  await db.user.deleteMany({ where: { tenantId: t } });
  await db.tenant.delete({ where: { id: t } });
}

type Unit = 'PIECE' | 'STRIP' | 'BOX';

async function main() {
  await wipe();
  const pw = await bcrypt.hash('123456', 10);

  const tenant = await db.tenant.create({
    data: {
      name: 'আল-শিফা ফার্মেসি',
      ownerName: 'ফারুক সাহেব',
      phone: OWNER_PHONE,
      shopType: 'ফার্মেসি', // এই নামেই ফ্রন্টএন্ডে ফার্মেসি মোড চালু হয়
      users: {
        create: [
          { name: 'ফারুক সাহেব', phone: OWNER_PHONE, password: pw, role: 'OWNER' },
          { name: 'সুমন (ম্যানেজার)', phone: '01800000001', password: pw, role: 'MANAGER' },
          { name: 'তানভীর (কর্মচারী)', phone: '01800000002', password: pw, role: 'EMPLOYEE' },
        ],
      },
    },
    include: { users: true },
  });
  const t = tenant.id;
  const ownerId = tenant.users[0].id;

  // ---------- ওষুধ ----------
  // দাম দেওয়া হয়েছে প্রতি পিসের (সিরাপ/ইনজেকশনে প্রতি বোতল/অ্যাম্পুল)
  const med = (o: {
    name: string; generic: string; company: string; form: string;
    ppS: number; spB: number; sell: number; buy: number; min: number; barcode?: string;
  }) =>
    db.product.create({
      data: {
        tenantId: t, name: o.name, genericName: o.generic, company: o.company, form: o.form,
        piecesPerStrip: o.ppS, stripsPerBox: o.spB, sellingPrice: o.sell, purchasePrice: o.buy,
        minStock: o.min, unit: 'pcs', barcode: o.barcode || null, stock: 0,
      },
    });

  const M: Record<string, any> = {
    napa: await med({ name: 'Napa 500mg', generic: 'Paracetamol', company: 'Beximco', form: 'TABLET', ppS: 10, spB: 10, sell: 1.2, buy: 0.95, min: 200, barcode: '8901000000011' }),
    napaExtra: await med({ name: 'Napa Extra', generic: 'Paracetamol + Caffeine', company: 'Beximco', form: 'TABLET', ppS: 10, spB: 10, sell: 2.5, buy: 2.0, min: 150 }),
    seclo: await med({ name: 'Seclo 20', generic: 'Omeprazole', company: 'Square', form: 'CAPSULE', ppS: 10, spB: 10, sell: 6, buy: 4.8, min: 150, barcode: '8901000000028' }),
    maxpro: await med({ name: 'Maxpro 20', generic: 'Esomeprazole', company: 'Renata', form: 'TABLET', ppS: 10, spB: 10, sell: 7, buy: 5.6, min: 100 }),
    ace: await med({ name: 'Ace 500', generic: 'Paracetamol', company: 'Square', form: 'TABLET', ppS: 10, spB: 10, sell: 1.2, buy: 0.95, min: 100 }),
    fexo: await med({ name: 'Fexo 120', generic: 'Fexofenadine', company: 'Square', form: 'TABLET', ppS: 10, spB: 5, sell: 8, buy: 6.4, min: 50 }),
    monas: await med({ name: 'Monas 10', generic: 'Montelukast', company: 'Acme', form: 'TABLET', ppS: 10, spB: 3, sell: 12, buy: 9.6, min: 30 }),
    azithro: await med({ name: 'Azithro 500', generic: 'Azithromycin', company: 'Square', form: 'TABLET', ppS: 6, spB: 5, sell: 30, buy: 24, min: 30 }),
    cef: await med({ name: 'Cef-3 200', generic: 'Cefixime', company: 'Square', form: 'CAPSULE', ppS: 6, spB: 5, sell: 25, buy: 20, min: 30 }),
    met: await med({ name: 'Met 500', generic: 'Metformin', company: 'Square', form: 'TABLET', ppS: 10, spB: 10, sell: 2, buy: 1.5, min: 100 }),
    amlo: await med({ name: 'Amlo 5', generic: 'Amlodipine', company: 'Square', form: 'TABLET', ppS: 10, spB: 10, sell: 3, buy: 2.3, min: 100 }),
    napaSyrup: await med({ name: 'Napa Syrup 60ml', generic: 'Paracetamol', company: 'Beximco', form: 'SYRUP', ppS: 1, spB: 24, sell: 30, buy: 24, min: 20 }),
    alatrol: await med({ name: 'Alatrol Syrup 100ml', generic: 'Cetirizine', company: 'Square', form: 'SYRUP', ppS: 1, spB: 24, sell: 55, buy: 44, min: 10 }),
    ors: await med({ name: 'Orsaline-N', generic: 'Oral Saline', company: 'Square', form: 'OTHER', ppS: 1, spB: 100, sell: 5, buy: 3.8, min: 50 }),
    ceftriaxone: await med({ name: 'Ceftron 1gm Inj', generic: 'Ceftriaxone', company: 'Square', form: 'INJECTION', ppS: 1, spB: 10, sell: 90, buy: 72, min: 10 }),
  };

  // ---------- কাস্টমার / কোম্পানি ----------
  const C = {
    anwar: await db.customer.create({ data: { tenantId: t, name: 'আনোয়ার হোসেন', phone: '01711000001', balance: 1200 } }),
    sufia: await db.customer.create({ data: { tenantId: t, name: 'সুফিয়া বেগম', phone: '01811000002', balance: 0 } }),
    jahid: await db.customer.create({ data: { tenantId: t, name: 'জাহিদ ভাই', phone: '01911000003', balance: 450 } }),
  };
  const S = {
    square: await db.supplier.create({ data: { tenantId: t, name: 'Square Pharma (ডিলার)', phone: '01644000001', balance: 15000 } }),
    beximco: await db.supplier.create({ data: { tenantId: t, name: 'Beximco ডিস্ট্রিবিউটর', phone: '01555000002', balance: 0 } }),
    renata: await db.supplier.create({ data: { tenantId: t, name: 'Renata ডিলার', phone: '01755000003', balance: 0 } }),
  };

  const factor = (p: any, unit: Unit) => (unit === 'BOX' ? p.piecesPerStrip * p.stripsPerBox : unit === 'STRIP' ? p.piecesPerStrip : 1);

  // ---------- মাল কেনা (ব্যাচ + মেয়াদসহ) ----------
  async function buy(o: {
    supplier: string; paid?: number; when: Date;
    items: { key: string; unit: Unit; qty: number; cost: number; batch: string; expiryDays: number }[];
  }) {
    const lines = o.items.map((x) => {
      const p = M[x.key];
      const f = factor(p, x.unit);
      return { p, x, f, pieces: x.qty * f, perPiece: Math.round((x.cost / f) * 10000) / 10000 };
    });
    const total = lines.reduce((a, l) => a + l.x.qty * l.x.cost, 0);
    const paid = o.paid == null ? total : o.paid;
    const due = total - paid;
    const pu = await db.purchase.create({
      data: {
        tenantId: t, supplierId: o.supplier, total, paid, due, createdAt: o.when,
        items: { create: lines.map((l) => ({ productId: l.p.id, name: l.p.name, qty: l.x.qty, cost: l.x.cost, unit: l.x.unit, pieces: l.pieces })) },
      },
    });
    for (const l of lines) {
      await db.product.update({ where: { id: l.p.id }, data: { stock: { increment: l.pieces }, purchasePrice: l.perPiece } });
      await db.productBatch.create({
        data: { tenantId: t, productId: l.p.id, batchNo: l.x.batch, expiry: exp(l.x.expiryDays), qty: l.pieces, cost: l.perPiece, createdAt: o.when, purchaseId: pu.id },
      });
    }
    if (due > 0) await db.supplier.update({ where: { id: o.supplier }, data: { balance: { increment: due } } });
  }

  // ---------- বিক্রি (FEFO: আগে মেয়াদ শেষ হওয়া ব্যাচ আগে যায়) ----------
  async function sell(o: {
    items: [string, Unit, number][]; cash?: number; bkash?: number; due?: number; cust?: string; when: Date;
  }) {
    const lines = o.items.map(([k, unit, qty]) => {
      const p = M[k];
      const f = factor(p, unit);
      return { p, unit, qty, pieces: qty * f, price: Math.round(p.sellingPrice * f * 100) / 100, cost: Math.round(p.purchasePrice * f * 10000) / 10000 };
    });
    const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
    const cost = lines.reduce((a, l) => a + l.qty * l.cost, 0);
    const noPay = !o.cash && !o.bkash && !o.due;
    const cash = noPay ? total : o.cash || 0, bkash = o.bkash || 0, due = o.due || 0;
    await db.sale.create({
      data: {
        tenantId: t, customerId: o.cust || null, total, cost, cashAmount: cash, bkashAmount: bkash, dueAmount: due,
        createdBy: ownerId, createdAt: o.when,
        items: { create: lines.map((l) => ({ productId: l.p.id, name: l.p.name, unit: l.unit, qty: l.qty, pieces: l.pieces, price: l.price, cost: l.cost })) },
      },
    });
    for (const l of lines) {
      await db.product.update({ where: { id: l.p.id }, data: { stock: { decrement: l.pieces } } });
      let left = l.pieces;
      const batches = await db.productBatch.findMany({
        where: { tenantId: t, productId: l.p.id, qty: { gt: 0 }, OR: [{ expiry: null }, { expiry: { gte: new Date() } }] },
        orderBy: [{ expiry: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      });
      for (const b of batches) {
        if (left <= 0) break;
        const take = Math.min(b.qty, left);
        await db.productBatch.update({ where: { id: b.id }, data: { qty: { decrement: take } } });
        left -= take;
      }
    }
    if (due > 0 && o.cust) await db.customer.update({ where: { id: o.cust }, data: { balance: { increment: due } } });
  }

  const expense = (category: string, amount: number, when: Date, note?: string) =>
    db.expense.create({ data: { tenantId: t, category, amount, note: note || null, createdAt: when } });

  // =====================================================
  //  স্টক ঢোকানো (৫ দিন আগে ও ৩ দিন আগে)
  // =====================================================
  await buy({
    supplier: S.square.id, paid: 20000, when: at(-5, 10),
    items: [
      { key: 'seclo', unit: 'BOX', qty: 3, cost: 480, batch: 'SQ-SEC-2609', expiryDays: 420 },
      { key: 'ace', unit: 'BOX', qty: 2, cost: 95, batch: 'SQ-ACE-2608', expiryDays: 500 },
      { key: 'fexo', unit: 'BOX', qty: 2, cost: 320, batch: 'SQ-FEX-2607', expiryDays: 380 },
      { key: 'azithro', unit: 'BOX', qty: 2, cost: 720, batch: 'SQ-AZI-2606', expiryDays: 300 },
      { key: 'cef', unit: 'BOX', qty: 2, cost: 600, batch: 'SQ-CEF-2605', expiryDays: 260 },
      { key: 'met', unit: 'BOX', qty: 3, cost: 150, batch: 'SQ-MET-2608', expiryDays: 600 },
      { key: 'amlo', unit: 'BOX', qty: 3, cost: 230, batch: 'SQ-AML-2609', expiryDays: 540 },
      { key: 'alatrol', unit: 'BOX', qty: 1, cost: 1056, batch: 'SQ-ALA-2604', expiryDays: 18 }, // ১৮ দিনে মেয়াদ শেষ → সতর্কতা
      { key: 'ors', unit: 'BOX', qty: 1, cost: 380, batch: 'SQ-ORS-2608', expiryDays: 700 },
      { key: 'ceftriaxone', unit: 'BOX', qty: 1, cost: 720, batch: 'SQ-CEI-2607', expiryDays: 200 },
    ],
  });

  await buy({
    supplier: S.beximco.id, when: at(-3, 11),
    items: [
      { key: 'napa', unit: 'BOX', qty: 4, cost: 95, batch: 'BX-NAP-2608', expiryDays: 550 },
      { key: 'napaExtra', unit: 'BOX', qty: 2, cost: 200, batch: 'BX-NEX-2607', expiryDays: 480 },
      { key: 'napaSyrup', unit: 'BOX', qty: 1, cost: 576, batch: 'BX-NSY-2606', expiryDays: 25 }, // ২৫ দিনে মেয়াদ শেষ
    ],
  });

  await buy({
    supplier: S.renata.id, when: at(-3, 14),
    items: [
      { key: 'maxpro', unit: 'BOX', qty: 2, cost: 560, batch: 'RN-MAX-2608', expiryDays: 450 },
    ],
  });

  // ---------- মেয়াদোত্তীর্ণ পুরনো ব্যাচ (ইচ্ছা করে — "নষ্ট মাল বাদ" টেস্টের জন্য) ----------
  {
    const p = M.monas;
    const pieces = 60; // পুরনো ব্যাচে ৬০ পিস (মেয়াদ ১২ দিন আগে শেষ)
    await db.product.update({ where: { id: p.id }, data: { stock: { increment: pieces }, purchasePrice: 9.6 } });
    await db.productBatch.create({ data: { tenantId: t, productId: p.id, batchNo: 'AC-MON-2411', expiry: exp(-12), qty: pieces, cost: 9.6, createdAt: at(-60, 10) } });
    // নতুন ব্যাচও আছে
    const fresh = 30; // নতুন ব্যাচ ৩০ পিস (১ বক্স)
    await db.product.update({ where: { id: p.id }, data: { stock: { increment: fresh } } });
    await db.productBatch.create({ data: { tenantId: t, productId: p.id, batchNo: 'AC-MON-2608', expiry: exp(480), qty: fresh, cost: 9.6, createdAt: at(-5, 10) } });
  }

  // =====================================================
  //  বিক্রি
  // =====================================================
  // ৪ দিন আগে
  await sell({ items: [['napa', 'STRIP', 5], ['seclo', 'STRIP', 2]], when: at(-4, 10) });
  await sell({ items: [['met', 'STRIP', 3], ['amlo', 'STRIP', 3]], cust: C.anwar.id, cash: 0, due: 150, when: at(-4, 13) }); // ১৫০ টাকা বাকি
  await expense('দোকান ভাড়া', 6000, at(-4, 11));

  // ৩ দিন আগে
  await sell({ items: [['azithro', 'STRIP', 1], ['fexo', 'STRIP', 1]], when: at(-3, 16) });
  await sell({ items: [['napa', 'PIECE', 8], ['ors', 'PIECE', 5]], when: at(-3, 18) });
  await expense('বিদ্যুৎ', 850, at(-3, 12));

  // গতকাল
  await sell({ items: [['napa', 'STRIP', 10], ['napaExtra', 'STRIP', 4]], when: at(-1, 10) });
  await sell({ items: [['cef', 'STRIP', 2], ['seclo', 'STRIP', 3]], bkash: 480, cash: 0, when: at(-1, 12) });
  await sell({ items: [['napaSyrup', 'PIECE', 3], ['alatrol', 'PIECE', 1]], when: at(-1, 15) });
  await sell({ items: [['amlo', 'STRIP', 6], ['met', 'STRIP', 6]], cust: C.jahid.id, cash: 100, due: 200, when: at(-1, 18) });
  await expense('কর্মচারী', 500, at(-1, 14), 'দৈনিক');
  await expense('পরিবহন', 200, at(-1, 13));

  // আজ
  await sell({ items: [['napa', 'PIECE', 20], ['ace', 'PIECE', 10]], when: at(0, 9) });
  await sell({ items: [['seclo', 'STRIP', 4], ['maxpro', 'STRIP', 2]], when: at(0, 10) });
  await sell({ items: [['ceftriaxone', 'PIECE', 2]], bkash: 180, cash: 0, when: at(0, 11) });
  await sell({ items: [['azithro', 'STRIP', 2], ['monas', 'STRIP', 2]], cust: C.anwar.id, cash: 100, due: 500, when: at(0, 12) });
  await sell({ items: [['fexo', 'STRIP', 3], ['napaExtra', 'STRIP', 2]], when: at(0, 13) });
  await sell({ items: [['napaSyrup', 'PIECE', 2], ['ors', 'PIECE', 10]], when: at(0, 14) });
  await expense('বিদ্যুৎ', 1200, at(0, 10), 'সেপ্টেম্বরের বিল');
  await expense('পরিবহন', 300, at(0, 12));

  // আজ বাকি আদায় ও কোম্পানিকে পরিশোধ
  await db.payment.create({ data: { tenantId: t, type: 'CUSTOMER_RECEIVE', customerId: C.anwar.id, amount: 500, method: 'CASH', createdAt: at(0, 16) } });
  await db.customer.update({ where: { id: C.anwar.id }, data: { balance: { decrement: 500 } } });
  await db.payment.create({ data: { tenantId: t, type: 'SUPPLIER_PAY', supplierId: S.square.id, amount: 3000, method: 'CASH', createdAt: at(0, 16) } });
  await db.supplier.update({ where: { id: S.square.id }, data: { balance: { decrement: 3000 } } });

  // কোম্পানিকে ধার দেওয়া (কোম্পানি আমাকে টাকা দেবে)
  await db.payment.create({ data: { tenantId: t, type: 'SUPPLIER_LEND', supplierId: S.renata.id, amount: 2000, method: 'CASH', createdAt: at(-2, 15) } });
  await db.supplier.update({ where: { id: S.renata.id }, data: { balance: { decrement: 2000 } } });

  console.log('\n✅ ফার্মেসি Demo data তৈরি হয়েছে — "আল-শিফা ফার্মেসি"\n');
  console.log('Owner     → 01800000000 / 123456');
  console.log('Manager   → 01800000001 / 123456');
  console.log('Employee  → 01800000002 / 123456 (শুধু বিক্রি)\n');
  console.log('টেস্টের জন্য ইচ্ছা করে রাখা হয়েছে:');
  console.log(' • কম স্টক: Napa Syrup ও Ceftron Inj (লো-স্টক লিস্টে দেখাবে)');
  console.log(' • মেয়াদ কাছাকাছি: Alatrol Syrup (১৮ দিন), Napa Syrup (২৫ দিন)');
  console.log(' • মেয়াদোত্তীর্ণ: Monas 10 ব্যাচ AC-MON-2411 (বিক্রি হবে না, "বাদ দিন" টেস্ট করুন)\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());