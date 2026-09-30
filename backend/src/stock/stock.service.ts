import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StockService {
  constructor(private db: PrismaService) {}

  // প্রতিটি ওষুধ + তার চালু ব্যাচগুলো (যে ব্যাচের মেয়াদ আগে শেষ হবে সেটা আগে)
  async batchStock(t: string) {
    const products = await this.db.product.findMany({
      where: { tenantId: t },
      include: {
        batches: {
          where: { qty: { gt: 0 } },
          orderBy: [{ expiry: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
      take: 1000,
    });
    return products.map((p) => ({
      id: p.id, name: p.name, genericName: p.genericName, company: p.company, form: p.form,
      piecesPerStrip: p.piecesPerStrip, stripsPerBox: p.stripsPerBox,
      stock: p.stock, minStock: p.minStock, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice,
      batches: p.batches.map((b) => ({ id: b.id, batchNo: b.batchNo, expiry: b.expiry, qty: b.qty, cost: b.cost, receivedAt: b.createdAt })),
    }));
  }
}