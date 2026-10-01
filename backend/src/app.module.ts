import { EditsModule } from './edits/edits.module';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ShopModule } from './shop/shop.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { ReturnsModule } from './returns/returns.module';
import { StockModule } from './stock/stock.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(process.cwd(), 'src/**/*.graphql')],
      context: ({ req }) => ({ req }),
    }),
    PrismaModule,
    AuthModule,
    ShopModule,
    PharmacyModule,
    ReturnsModule,
    EditsModule,
    StockModule,
    CatalogModule,
  ],
})
export class AppModule {}
