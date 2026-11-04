import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { MAIL_QUEUE } from './mail.constants';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
    NotificationModule,
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
