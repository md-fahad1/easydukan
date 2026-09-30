import { Module } from '@nestjs/common';
import { EditsService } from './edits.service';
import { EditsResolver } from './edits.resolver';

@Module({ providers: [EditsService, EditsResolver] })
export class EditsModule {}