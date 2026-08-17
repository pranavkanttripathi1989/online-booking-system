import { Module } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { LanguagesResolver } from './languages.resolver';

@Module({
  providers: [LanguagesService, LanguagesResolver],
})
export class LanguagesModule {}
