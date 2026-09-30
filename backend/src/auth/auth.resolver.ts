import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './gql-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private auth: AuthService) {}

  @Mutation('register')
  register(@Args('input') input: any) {
    return this.auth.register(input);
  }

  @Mutation('login')
  login(@Args('phone') phone: string, @Args('password') password: string) {
    return this.auth.login(phone, password);
  }

  @Query('me')
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() u: any) {
    return this.auth.me(u.userId);
  }
}
