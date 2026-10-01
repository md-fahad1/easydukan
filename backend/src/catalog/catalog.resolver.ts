import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CatalogService } from './catalog.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class CatalogResolver {
  constructor(private s: CatalogService) {}

  @Query('searchCatalog') search(@Args('q') q: string) { return this.s.search(q); }
}