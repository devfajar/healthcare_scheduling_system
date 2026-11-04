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

@Processor(MAIL_QUEUE)
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process(SCHEDULE_CREATED_JOB)
  async handleScheduleCreated(job: Job<ScheduleEmailJobPayload>): Promise<any> {
    this.logger.log(`Processing schedule created email job ${job.id} for: ${job.data.customerEmail}`);
    return this.mailService.sendScheduleCreatedEmail(job.data);
  }

  @Process(SCHEDULE_CANCELLED_JOB)
  async handleScheduleCancelled(job: Job<ScheduleEmailJobPayload>): Promise<any> {
    this.logger.log(`Processing schedule cancelled email job ${job.id} for: ${job.data.customerEmail}`);
    return this.mailService.sendScheduleCancelledEmail(job.data);
  }

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`[Queue] Job ${job.id} of type "${job.name}" is now ACTIVE.`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any): void {
    this.logger.log(`[Queue] Job ${job.id} of type "${job.name}" has COMPLETED.`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error): void {
    this.logger.error(
      `[Queue] Job ${job.id} of type "${job.name}" FAILED with error: ${error.message}`,
      error.stack,
    );
  }
}
