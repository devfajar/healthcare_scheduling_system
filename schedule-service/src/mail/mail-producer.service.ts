import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { MAIL_QUEUE, SCHEDULE_CREATED_JOB, SCHEDULE_CANCELLED_JOB } from './mail.constants';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

@Injectable()
export class MailProducerService {
  private readonly logger = new Logger(MailProducerService.name);

  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue) {}

  /**
   * Queue email job when schedule is created
   */
  async queueScheduleCreated(payload: ScheduleEmailJobPayload): Promise<void> {
    try {
      const job = await this.mailQueue.add(SCHEDULE_CREATED_JOB, payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `Enqueued "${SCHEDULE_CREATED_JOB}" job (ID: ${job.id}) for customer: ${payload.customerEmail}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to enqueue "${SCHEDULE_CREATED_JOB}" job for customer ${payload.customerEmail}: ${error?.message || error}`,
        error?.stack,
      );
    }
  }

  /**
   * Queue email job when schedule is cancelled / deleted
   */
  async queueScheduleCancelled(payload: ScheduleEmailJobPayload): Promise<void> {
    try {
      const job = await this.mailQueue.add(SCHEDULE_CANCELLED_JOB, payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `Enqueued "${SCHEDULE_CANCELLED_JOB}" job (ID: ${job.id}) for customer: ${payload.customerEmail}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to enqueue "${SCHEDULE_CANCELLED_JOB}" job for customer ${payload.customerEmail}: ${error?.message || error}`,
        error?.stack,
      );
    }
  }
}
