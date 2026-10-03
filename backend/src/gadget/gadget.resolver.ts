import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { need } from '../shop/shop.service';
import { GadgetService } from './gadget.service';

const MGR = ['OWNER', 'MANAGER'];

@Resolver()
@UseGuards(GqlAuthGuard)
export class GadgetResolver {
  constructor(private s: GadgetService) {}

  // বিক্রির সময় কর্মচারীও IMEI বেছে নেবে / ওয়ারেন্টি দেখবে
  @Query('availableUnits') units(@CurrentUser() u: any, @Args('productId') id: string) { return this.s.availableUnits(u.tenantId, id); }
  @Query('searchUnits') search(@CurrentUser() u: any, @Args('query') q: string) { return this.s.searchUnits(u.tenantId, q); }
  @Query('gadgetBreakdown') breakdown(@CurrentUser() u: any, @Args('by') by: string, @Args('days') d: number) { need(u, ...MGR); return this.s.breakdown(u.tenantId, by, d); }
  @Query('gadgetFacets') facets(@CurrentUser() u: any) { need(u, ...MGR); return this.s.facets(u.tenantId); }

  @Mutation('saveGadget') save(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.saveGadget(u.tenantId, id || null, i); }
  @Mutation('gadgetSale') sale(@CurrentUser() u: any, @Args('input') i: any) { return this.s.sale(u.tenantId, u.userId, i); }
  @Mutation('gadgetPurchase') purchase(@CurrentUser() u: any, @Args('input') i: any) { need(u, ...MGR); return this.s.purchase(u.tenantId, i); }
}