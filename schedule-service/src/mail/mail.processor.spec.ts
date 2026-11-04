import { Test, TestingModule } from '@nestjs/testing';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

describe('MailProcessor', () => {
  let processor: MailProcessor;
  let mailService: any;

  const mockPayload: ScheduleEmailJobPayload = {
    scheduleId: 's1111111-1111-1111-1111-111111111111',
    customerName: 'Teddy',
    customerEmail: 'teddy@test.com',
    doctorName: 'Doctor Lukman',
    scheduledAt: new Date('2026-12-01T10:00:00.000Z'),
    objective: 'Pemeriksaan Rutin',
  };

  const mockJob: any = {
    id: 'job-999',
    name: 'schedule_created',
    data: mockPayload,
  };

  beforeEach(async () => {
    mailService = {
      sendScheduleCreatedEmail: jest.fn().mockResolvedValue({ messageId: 'msg-created' }),
      sendScheduleCancelledEmail: jest.fn().mockResolvedValue({ messageId: 'msg-cancelled' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleScheduleCreated', () => {
    it('should delegate to mailService.sendScheduleCreatedEmail', async () => {
      const result = await processor.handleScheduleCreated(mockJob);

      expect(mailService.sendScheduleCreatedEmail).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual({ messageId: 'msg-created' });
    });
  });

  describe('handleScheduleCancelled', () => {
    it('should delegate to mailService.sendScheduleCancelledEmail', async () => {
      const cancelJob: any = { ...mockJob, name: 'schedule_cancelled' };
      const result = await processor.handleScheduleCancelled(cancelJob);

      expect(mailService.sendScheduleCancelledEmail).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual({ messageId: 'msg-cancelled' });
    });
  });
});
