import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopResolver, DateTimeScalar } from './shop.resolver';

@Module({ providers: [ShopService, ShopResolver, DateTimeScalar] })
export class ShopModule {}
