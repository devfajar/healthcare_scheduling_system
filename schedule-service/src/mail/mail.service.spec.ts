import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

describe('MailService', () => {
  let service: MailService;
  let configService: ConfigService;

  const mockPayload: ScheduleEmailJobPayload = {
    scheduleId: 's1111111-1111-1111-1111-111111111111',
    customerName: 'Teddy',
    customerEmail: 'teddy@test.com',
    doctorName: 'Doctor Lukman',
    scheduledAt: new Date('2026-12-01T10:00:00.000Z'),
    objective: 'Konsultasi Kesehatan Rutin',
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
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendScheduleCreatedEmail', () => {
    it('should successfully send consultation confirmation email with HTML and text', async () => {
      const sendMailSpy = jest
        .spyOn((service as any).transporter, 'sendMail')
        .mockResolvedValue({ messageId: 'test-created-msg-id' });

      const result = await service.sendScheduleCreatedEmail(mockPayload);

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'teddy@test.com',
          subject: expect.stringContaining('Konfirmasi Jadwal Konsultasi Dokter'),
          text: expect.stringContaining('Teddy'),
          html: expect.stringContaining('Doctor Lukman'),
        }),
      );
      expect(result).toHaveProperty('messageId', 'test-created-msg-id');
    });
  });

  describe('sendScheduleCancelledEmail', () => {
    it('should successfully send cancellation notification email to customer', async () => {
      const sendMailSpy = jest
        .spyOn((service as any).transporter, 'sendMail')
        .mockResolvedValue({ messageId: 'test-cancelled-msg-id' });

      const result = await service.sendScheduleCancelledEmail(mockPayload);

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'teddy@test.com',
          subject: expect.stringContaining('Pembatalan Jadwal Konsultasi'),
          text: expect.stringContaining('dibatalkan'),
          html: expect.stringContaining('Doctor Lukman'),
        }),
      );
      expect(result).toHaveProperty('messageId', 'test-cancelled-msg-id');
    });
  });
});
