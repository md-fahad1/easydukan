import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ShopModule } from './shop/shop.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';

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
  ],
})
export class AppModule {}
