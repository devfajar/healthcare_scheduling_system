import { Injectable } from '@nestjs/common';
import { NotificationLog, NotificationHealth } from './models/notification-log.model';

@Injectable()
export class NotificationService {
  private logs: NotificationLog[] = [];

  recordNotification(recipientEmail: string, subject: string, eventType: string, status: string): NotificationLog {
    const log: NotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      recipientEmail,
      subject,
      eventType,
      status,
      sentAt: new Date(),
    };
    this.logs.unshift(log);
    // Keep last 100 logs
    if (this.logs.length > 100) {
      this.logs.pop();
    }
    return log;
  }

  getLogs(limit = 10): NotificationLog[] {
    return this.logs.slice(0, limit);
  }

  getHealth(): NotificationHealth {
    return {
      status: 'OK',
      service: 'notification-service',
      timestamp: new Date(),
    };
  }
}
