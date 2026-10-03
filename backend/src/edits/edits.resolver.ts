import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { need } from '../shop/shop.service';
import { EditsService } from './edits.service';

const MGR = ['OWNER', 'MANAGER'];

@Resolver()
@UseGuards(GqlAuthGuard)
export class EditsResolver {
  constructor(private s: EditsService) {}

  @Query('manageSales') sales(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.sales(u.tenantId, d); }
  @Query('managePurchases') purchases(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.purchases(u.tenantId, d); }

  @Mutation('deleteSale') delSale(@CurrentUser() u: any, @Args('id') id: string) { need(u, ...MGR); return this.s.deleteSale(u.tenantId, id); }
  @Mutation('deletePurchase') delPurchase(@CurrentUser() u: any, @Args('id') id: string) { need(u, ...MGR); return this.s.deletePurchase(u.tenantId, id); }
  @Mutation('editSale') editSale(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.editSale(u.tenantId, u.userId, id, i, 'shop'); }
  @Mutation('editPharmacySale') editPSale(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.editSale(u.tenantId, u.userId, id, i, 'pharma'); }
  @Mutation('editGadgetSale') editGSale(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.editSale(u.tenantId, u.userId, id, i, 'gadget'); }
  @Mutation('editPurchase') editPurchase(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.editPurchase(u.tenantId, id, i, 'shop'); }
  @Mutation('editPharmacyPurchase') editPPurchase(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.editPurchase(u.tenantId, id, i, 'pharma'); }
  @Mutation('editGadgetPurchase') editGPurchase(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.editPurchase(u.tenantId, id, i, 'gadget'); }
}