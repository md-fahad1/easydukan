import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { need } from '../shop/shop.service';
import { StockService } from './stock.service';

const MGR = ['OWNER', 'MANAGER'];

@Resolver()
@UseGuards(GqlAuthGuard)
export class StockResolver {
  constructor(private s: StockService) {}

  @Query('batchStock') batchStock(@CurrentUser() u: any) { need(u, ...MGR); return this.s.batchStock(u.tenantId); }
}