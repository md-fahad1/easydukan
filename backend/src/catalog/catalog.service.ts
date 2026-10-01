import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CatalogService {
  constructor(private db: PrismaService) {}

  // নাম/জেনেরিক/স্ট্রেংথ/কোম্পানির যেকোনো অংশ লিখলেই খুঁজে দেবে (যেমন: "napa 500", "seclo", "square omep")
  async search(q: string) {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const tokens = s.split(/\s+/).filter(Boolean).slice(0, 4);
    const rows = await this.db.medicineCatalog.findMany({
      where: {
        AND: tokens.map((t) => ({
          OR: [
            { brand: { contains: t, mode: 'insensitive' as const } },
            { genericName: { contains: t, mode: 'insensitive' as const } },
            { strength: { contains: t, mode: 'insensitive' as const } },
            { company: { contains: t, mode: 'insensitive' as const } },
          ],
        })),
      },
      take: 80,
    });
    // যে ব্র্যান্ডের নাম লেখার শুরুর সাথে মেলে সেগুলো আগে
    const rank = (r: { brand: string; genericName: string }) => {
      const b = r.brand.toLowerCase();
      if (b === s) return 0;
      if (b.startsWith(s)) return 1;
      if (b.startsWith(tokens[0])) return 2;
      if (r.genericName.toLowerCase().startsWith(tokens[0])) return 3;
      return 4;
    };
    return rows
      .sort((a, b) => rank(a) - rank(b) || a.brand.localeCompare(b.brand) || (a.strength || '').localeCompare(b.strength || '', undefined, { numeric: true }))
      .slice(0, 15);
  }
}