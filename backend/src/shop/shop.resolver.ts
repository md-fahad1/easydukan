import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ShopService, need } from './shop.service';

const MGR = ['OWNER', 'MANAGER'];

@Scalar('DateTime')
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'ISO DateTime';
  parseValue(v: string) { return new Date(v); }
  serialize(v: Date) { return new Date(v).toISOString(); }
  parseLiteral(ast: ValueNode) { return ast.kind === Kind.STRING ? new Date(ast.value) : null; }
}

// প্রতিটি রিকোয়েস্টে tenantId আসে JWT থেকে — ক্লায়েন্টের কাছ থেকে নয়। তাই এক দোকান অন্য দোকানের ডাটা দেখতে পারে না।
@Resolver()
@UseGuards(GqlAuthGuard)
export class ShopResolver {
  constructor(private s: ShopService) {}

  // Queries
  @Query('summary') summary(@CurrentUser() u: any, @Args('period') p: string) { need(u, ...MGR); return this.s.summary(u.tenantId, p); }
  @Query('customers') customers(@CurrentUser() u: any) { return this.s.customers(u.tenantId); }
  @Query('customer') customer(@CurrentUser() u: any, @Args('id') id: string) { need(u, ...MGR); return this.s.customer(u.tenantId, id); }
  @Query('customerLedger') ledger(@CurrentUser() u: any, @Args('customerId') id: string) { need(u, ...MGR); return this.s.customerLedger(u.tenantId, id); }
  @Query('suppliers') suppliers(@CurrentUser() u: any) { need(u, ...MGR); return this.s.suppliers(u.tenantId); }
  @Query('products') products(@CurrentUser() u: any) { return this.s.products(u.tenantId); }
  @Query('sales') sales(@CurrentUser() u: any, @Args('period') p: string) { return this.s.sales(u.tenantId, u.role === 'EMPLOYEE' ? 'TODAY' : p); }
  @Query('expenses') expenses(@CurrentUser() u: any, @Args('period') p: string) { need(u, ...MGR); return this.s.expenses(u.tenantId, p); }
  @Query('closings') closings(@CurrentUser() u: any) { need(u, ...MGR); return this.s.closings(u.tenantId); }
  @Query('users') users(@CurrentUser() u: any) { need(u, 'OWNER'); return this.s.users(u.tenantId); }

  // Mutations
  @Mutation('addUser') addUser(@CurrentUser() u: any, @Args('input') i: any) { need(u, 'OWNER'); return this.s.addUser(u.tenantId, i); }
  @Mutation('createCustomer') createCustomer(@CurrentUser() u: any, @Args('name') n: string, @Args('phone') ph?: string) { return this.s.createCustomer(u.tenantId, n, ph); }
  @Mutation('createSupplier') createSupplier(@CurrentUser() u: any, @Args('name') n: string, @Args('phone') ph?: string) { need(u, ...MGR); return this.s.createSupplier(u.tenantId, n, ph); }
  @Mutation('createProduct') createProduct(@CurrentUser() u: any, @Args('input') i: any) { need(u, ...MGR); return this.s.createProduct(u.tenantId, i); }
  @Mutation('updateProduct') updateProduct(@CurrentUser() u: any, @Args('id') id: string, @Args('input') i: any) { need(u, ...MGR); return this.s.updateProduct(u.tenantId, id, i); }
  @Mutation('createSale') createSale(@CurrentUser() u: any, @Args('input') i: any) { return this.s.createSale(u.tenantId, u.userId, i); }
  @Mutation('createExpense') createExpense(@CurrentUser() u: any, @Args('category') c: string, @Args('amount') a: number, @Args('note') note?: string) { need(u, ...MGR); return this.s.createExpense(u.tenantId, c, a, note); }
  @Mutation('receivePayment') receive(@CurrentUser() u: any, @Args('customerId') id: string, @Args('amount') a: number, @Args('method') m?: string) { need(u, ...MGR); return this.s.receivePayment(u.tenantId, id, a, m); }
  @Mutation('paySupplier') paySupplier(@CurrentUser() u: any, @Args('supplierId') id: string, @Args('amount') a: number, @Args('method') m?: string) { need(u, ...MGR); return this.s.paySupplier(u.tenantId, id, a, m); }
  @Mutation('createPurchase') createPurchase(@CurrentUser() u: any, @Args('input') i: any) { need(u, ...MGR); return this.s.createPurchase(u.tenantId, i); }
  @Mutation('closeDay') closeDay(@CurrentUser() u: any) { need(u, ...MGR); return this.s.closeDay(u.tenantId); }
}
