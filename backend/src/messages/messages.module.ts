import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';
import { MessageAttachmentsController } from './message-attachments.controller';
import { DepartmentsModule } from '../departments/departments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DepartmentsModule, AuthModule],
  controllers: [MessageAttachmentsController],
  providers: [MessagesService, MessagesResolver],
  exports: [MessagesService],
})
export class MessagesModule {}
