import { Module } from '@nestjs/common';
import { GadgetService } from './gadget.service';
import { GadgetResolver } from './gadget.resolver';

@Module({ providers: [GadgetService, GadgetResolver] })
export class GadgetModule {}