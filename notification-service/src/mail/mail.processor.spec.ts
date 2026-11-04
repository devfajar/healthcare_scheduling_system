import { Test, TestingModule } from '@nestjs/testing';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';
import { NotificationService } from '../notification/notification.service';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

describe('MailProcessor (Notification Service)', () => {
  let processor: MailProcessor;
  let mailService: any;
  let notificationService: any;

  const mockPayload: ScheduleEmailJobPayload = {
    scheduleId: 's1111111-1111-1111-1111-111111111111',
    customerName: 'Teddy',
    customerEmail: 'teddy@test.com',
    doctorName: 'Doctor Lukman',
    scheduledAt: new Date('2026-12-01T10:00:00.000Z'),
    objective: 'Pemeriksaan Rutin',
  };

  const mockJob: any = {
    id: 'job-1',
    name: 'schedule_created',
    data: mockPayload,
  };

  beforeEach(async () => {
    mailService = {
      sendScheduleCreatedEmail: jest.fn().mockResolvedValue({ messageId: 'msg-created' }),
      sendScheduleCancelledEmail: jest.fn().mockResolvedValue({ messageId: 'msg-cancelled' }),
    };

    notificationService = {
      recordNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        { provide: MailService, useValue: mailService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleScheduleCreated', () => {
    it('should process job, call mailService, and record notification log', async () => {
      const result = await processor.handleScheduleCreated(mockJob);

      expect(mailService.sendScheduleCreatedEmail).toHaveBeenCalledWith(mockPayload);
      expect(notificationService.recordNotification).toHaveBeenCalledWith(
        'teddy@test.com',
        expect.stringContaining('Konfirmasi Jadwal Konsultasi Dokter'),
        'schedule_created',
        'SENT',
      );
      expect(result).toEqual({ messageId: 'msg-created' });
    });
  });

  describe('handleScheduleCancelled', () => {
    it('should process cancellation job, call mailService, and record log', async () => {
      const cancelJob: any = { ...mockJob, name: 'schedule_cancelled' };
      const result = await processor.handleScheduleCancelled(cancelJob);

      expect(mailService.sendScheduleCancelledEmail).toHaveBeenCalledWith(mockPayload);
      expect(notificationService.recordNotification).toHaveBeenCalledWith(
        'teddy@test.com',
        expect.stringContaining('Pembatalan Jadwal Konsultasi Dokter'),
        'schedule_cancelled',
        'SENT',
      );
      expect(result).toEqual({ messageId: 'msg-cancelled' });
    });
  });
});
