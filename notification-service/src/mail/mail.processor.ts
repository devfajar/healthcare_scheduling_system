import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { MAIL_QUEUE, SCHEDULE_CREATED_JOB, SCHEDULE_CANCELLED_JOB } from './mail.constants';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';
import { MailService } from './mail.service';
import { NotificationService } from '../notification/notification.service';

@Processor(MAIL_QUEUE)
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process(SCHEDULE_CREATED_JOB)
  async handleScheduleCreated(job: Job<ScheduleEmailJobPayload>): Promise<any> {
    this.logger.log(`[Notification Worker] Processing ${SCHEDULE_CREATED_JOB} for ${job.data.customerEmail}`);
    try {
      const result = await this.mailService.sendScheduleCreatedEmail(job.data);
      this.notificationService.recordNotification(
        job.data.customerEmail,
        'Konfirmasi Jadwal Konsultasi Dokter - Healthcare System',
        SCHEDULE_CREATED_JOB,
        'SENT',
      );
      return result;
    } catch (err: any) {
      this.notificationService.recordNotification(
        job.data.customerEmail,
        'Konfirmasi Jadwal Konsultasi Dokter - Healthcare System',
        SCHEDULE_CREATED_JOB,
        'FAILED',
      );
      throw err;
    }
  }

  @Process(SCHEDULE_CANCELLED_JOB)
  async handleScheduleCancelled(job: Job<ScheduleEmailJobPayload>): Promise<any> {
    this.logger.log(`[Notification Worker] Processing ${SCHEDULE_CANCELLED_JOB} for ${job.data.customerEmail}`);
    try {
      const result = await this.mailService.sendScheduleCancelledEmail(job.data);
      this.notificationService.recordNotification(
        job.data.customerEmail,
        'Pembatalan Jadwal Konsultasi Dokter - Healthcare System',
        SCHEDULE_CANCELLED_JOB,
        'SENT',
      );
      return result;
    } catch (err: any) {
      this.notificationService.recordNotification(
        job.data.customerEmail,
        'Pembatalan Jadwal Konsultasi Dokter - Healthcare System',
        SCHEDULE_CANCELLED_JOB,
        'FAILED',
      );
      throw err;
    }
  }

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`[Notification Queue] Job ${job.id} of type "${job.name}" is now ACTIVE.`);
  }

  @OnQueueCompleted()
  onComplete(job: Job): void {
    this.logger.log(`[Notification Queue] Job ${job.id} of type "${job.name}" has COMPLETED.`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error): void {
    this.logger.error(
      `[Notification Queue] Job ${job.id} of type "${job.name}" FAILED with error: ${error.message}`,
      error.stack,
    );
  }
}
