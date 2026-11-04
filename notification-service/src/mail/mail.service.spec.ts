import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

describe('MailService (Notification Service)', () => {
  let service: MailService;

  const mockPayload: ScheduleEmailJobPayload = {
    scheduleId: 's1111111-1111-1111-1111-111111111111',
    customerName: 'Teddy',
    customerEmail: 'teddy@test.com',
    doctorName: 'Doctor Lukman',
    scheduledAt: new Date('2026-12-01T10:00:00.000Z'),
    objective: 'Pemeriksaan Rutin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'SMTP_FROM') return 'noreply@healthcare.com';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendScheduleCreatedEmail', () => {
    it('should send confirmation email to customer', async () => {
      const sendMailSpy = jest
        .spyOn((service as any).transporter, 'sendMail')
        .mockResolvedValue({ messageId: 'msg-created' });

      const result = await service.sendScheduleCreatedEmail(mockPayload);

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'teddy@test.com',
          subject: expect.stringContaining('Konfirmasi Jadwal Konsultasi Dokter'),
        }),
      );
      expect(result).toHaveProperty('messageId', 'msg-created');
    });
  });

  describe('sendScheduleCancelledEmail', () => {
    it('should send cancellation email to customer', async () => {
      const sendMailSpy = jest
        .spyOn((service as any).transporter, 'sendMail')
        .mockResolvedValue({ messageId: 'msg-cancelled' });

      const result = await service.sendScheduleCancelledEmail(mockPayload);

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'teddy@test.com',
          subject: expect.stringContaining('Pembatalan Jadwal Konsultasi Dokter'),
        }),
      );
      expect(result).toHaveProperty('messageId', 'msg-cancelled');
    });
  });
});
