import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { need } from '../shop/shop.service';
import { ReturnsService } from './returns.service';

const MGR = ['OWNER', 'MANAGER'];

@Resolver()
@UseGuards(GqlAuthGuard)
export class ReturnsResolver {
  constructor(private s: ReturnsService) {}

  @Query('returnableSales') returnable(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.returnableSales(u.tenantId, d); }
  @Query('saleReturns') history(@CurrentUser() u: any, @Args('days') d: number) { need(u, ...MGR); return this.s.history(u.tenantId, d); }
  @Mutation('createSaleReturn') create(@CurrentUser() u: any, @Args('input') i: any) { need(u, ...MGR); return this.s.create(u.tenantId, u.userId, i); }
}