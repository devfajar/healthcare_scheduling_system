import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { MailProducerService } from './mail-producer.service';
import { MAIL_QUEUE, SCHEDULE_CREATED_JOB, SCHEDULE_CANCELLED_JOB } from './mail.constants';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

describe('MailProducerService', () => {
  let service: MailProducerService;
  let mockQueue: any;

  const mockPayload: ScheduleEmailJobPayload = {
    scheduleId: 's1111111-1111-1111-1111-111111111111',
    customerName: 'Teddy',
    customerEmail: 'teddy@test.com',
    doctorName: 'Doctor Lukman',
    scheduledAt: new Date('2026-12-01T10:00:00.000Z'),
    objective: 'Konsultasi Rutin',
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProducerService,
        {
          provide: getQueueToken(MAIL_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<MailProducerService>(MailProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueScheduleCreated', () => {
    it('should add schedule created job to Bull queue with retry config and deterministic jobId', async () => {
      await service.queueScheduleCreated(mockPayload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SCHEDULE_CREATED_JOB,
        mockPayload,
        expect.objectContaining({
          jobId: `schedule-created-${mockPayload.scheduleId}`,
          attempts: 3,
          backoff: expect.objectContaining({ type: 'exponential', delay: 2000 }),
          removeOnComplete: true,
        }),
      );
    });

    it('should catch and log error gracefully without crashing when queue fails', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection lost'));

      await expect(service.queueScheduleCreated(mockPayload)).resolves.not.toThrow();
    });
  });

  describe('queueScheduleCancelled', () => {
    it('should add schedule cancelled job to Bull queue with deterministic jobId', async () => {
      await service.queueScheduleCancelled(mockPayload);

      expect(mockQueue.add).toHaveBeenCalledWith(
        SCHEDULE_CANCELLED_JOB,
        mockPayload,
        expect.objectContaining({
          jobId: `schedule-cancelled-${mockPayload.scheduleId}`,
          attempts: 3,
          removeOnComplete: true,
        }),
      );
    });

    it('should catch error gracefully when queue fails', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis is down'));

      await expect(service.queueScheduleCancelled(mockPayload)).resolves.not.toThrow();
    });
  });
});
