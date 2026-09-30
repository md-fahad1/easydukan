import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { need } from '../shop/shop.service';
import { PharmacyService } from './pharmacy.service';

const MGR = ['OWNER', 'MANAGER'];

@Resolver()
@UseGuards(GqlAuthGuard)
export class PharmacyResolver {
  constructor(private s: PharmacyService) {}

  @Query('salesTrend') trend(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.trend(u.tenantId, d); }
  @Query('lowStockMedicines') low(@CurrentUser() u: any) { need(u, ...MGR); return this.s.lowStock(u.tenantId); }
  @Query('expiringBatches') exp(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.expiring(u.tenantId, d); }
  @Query('topSelling') top(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.topSelling(u.tenantId, d); }

  @Mutation('saveMedicine') save(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.saveMedicine(u.tenantId, id || null, i); }
  @Mutation('pharmacySale') sale(@CurrentUser() u: any, @Args('input') i: any) { return this.s.sale(u.tenantId, u.userId, i); }
  @Mutation('pharmacyPurchase') purchase(@CurrentUser() u: any, @Args('input') i: any) { need(u, ...MGR); return this.s.purchase(u.tenantId, i); }
  @Mutation('lendToSupplier') lend(@CurrentUser() u: any, @Args('supplierId') id: string, @Args('amount') a: number, @Args('method') m?: string) { need(u, ...MGR); return this.s.lend(u.tenantId, id, a, m); }
  @Mutation('discardBatch') discard(@CurrentUser() u: any, @Args('batchId') id: string) { need(u, ...MGR); return this.s.discardBatch(u.tenantId, id); }
}