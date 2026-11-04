import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { MAIL_QUEUE } from './mail.constants';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { MailProducerService } from './mail-producer.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  providers: [MailService, MailProcessor, MailProducerService],
  exports: [MailProducerService, MailService],
})
export class MailModule {}
