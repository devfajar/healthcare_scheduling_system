import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ScheduleEmailJobPayload } from './interfaces/mail-job.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log(`MailService initialized with SMTP host: ${smtpHost}:${smtpPort}`);
    } else {
      // JSON / Mock transport for development and testing
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.log('MailService initialized with JSON fallback transporter (development/testing mode)');
    }
  }

  private formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  async sendScheduleCreatedEmail(payload: ScheduleEmailJobPayload): Promise<any> {
    const fromAddress = this.configService.get<string>('SMTP_FROM', 'noreply@healthcare.com');
    const formattedDate = this.formatDate(payload.scheduledAt);

    const subject = 'Konfirmasi Jadwal Konsultasi Dokter - Healthcare System';
    const text = `Halo ${payload.customerName},\n\nJadwal konsultasi Anda telah berhasil dibuat!\n\nDetail:\n- Dokter: ${payload.doctorName}\n- Waktu: ${formattedDate}\n- Tujuan: ${payload.objective}\n- ID: ${payload.scheduleId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0284c7; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Healthcare Scheduling System</h2>
          <p style="margin: 5px 0 0;">Konfirmasi Jadwal Konsultasi</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo <strong>${payload.customerName}</strong>,</p>
          <p>Jadwal konsultasi Anda telah berhasil dibuat:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Dokter:</td>
              <td style="padding: 8px 0; font-weight: bold;">${payload.doctorName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Waktu:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0284c7;">${formattedDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Tujuan Konsultasi:</td>
              <td style="padding: 8px 0;">${payload.objective}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">ID Jadwal:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${payload.scheduleId}</td>
            </tr>
          </table>
          <p style="font-size: 14px; color: #666;">Harap hadir 10 menit sebelum jadwal konsultasi.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          &copy; ${new Date().getFullYear()} Healthcare Scheduling System. All rights reserved.
        </div>
      </div>
    `;

    const info = await this.transporter.sendMail({
      from: `"Healthcare System" <${fromAddress}>`,
      to: payload.customerEmail,
      subject,
      text,
      html,
    });

    this.logger.log(`[Notification Service] Sent schedule created email to ${payload.customerEmail}`);
    return info;
  }

  async sendScheduleCancelledEmail(payload: ScheduleEmailJobPayload): Promise<any> {
    const fromAddress = this.configService.get<string>('SMTP_FROM', 'noreply@healthcare.com');
    const formattedDate = this.formatDate(payload.scheduledAt);

    const subject = 'Pembatalan Jadwal Konsultasi Dokter - Healthcare System';
    const text = `Halo ${payload.customerName},\n\nJadwal konsultasi Anda telah dibatalkan / dihapus dari sistem.\n\nDetail:\n- Dokter: ${payload.doctorName}\n- Waktu Sebelumnya: ${formattedDate}\n- ID: ${payload.scheduleId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Healthcare Scheduling System</h2>
          <p style="margin: 5px 0 0;">Pemberitahuan Pembatalan Jadwal</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo <strong>${payload.customerName}</strong>,</p>
          <p>Jadwal konsultasi Anda telah <strong style="color: #dc2626;">dibatalkan / dihapus</strong> dari sistem:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Dokter:</td>
              <td style="padding: 8px 0; font-weight: bold;">${payload.doctorName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">Waktu Sebelumnya:</td>
              <td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">ID Jadwal:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${payload.scheduleId}</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          &copy; ${new Date().getFullYear()} Healthcare Scheduling System. All rights reserved.
        </div>
      </div>
    `;

    const info = await this.transporter.sendMail({
      from: `"Healthcare System" <${fromAddress}>`,
      to: payload.customerEmail,
      subject,
      text,
      html,
    });

    this.logger.log(`[Notification Service] Sent schedule cancelled email to ${payload.customerEmail}`);
    return info;
  }
}
