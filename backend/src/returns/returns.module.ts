import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsResolver } from './returns.resolver';

@Module({ providers: [ReturnsService, ReturnsResolver] })
export class ReturnsModule {}