import { Test, TestingModule } from '@nestjs/testing';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';

describe('NotificationResolver', () => {
  let resolver: NotificationResolver;
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationResolver, NotificationService],
    }).compile();

    resolver = module.get<NotificationResolver>(NotificationResolver);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('notificationHealth', () => {
    it('should return health status', () => {
      const health = resolver.getHealth();
      expect(health.status).toBe('OK');
      expect(health.service).toBe('notification-service');
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('notificationLogs', () => {
    it('should return empty list initially', () => {
      const logs = resolver.getLogs(10);
      expect(logs).toEqual([]);
    });

    it('should return recorded logs', () => {
      service.recordNotification('teddy@test.com', 'Subject', 'schedule_created', 'SENT');
      const logs = resolver.getLogs(5);
      expect(logs).toHaveLength(1);
      expect(logs[0].recipientEmail).toBe('teddy@test.com');
      expect(logs[0].status).toBe('SENT');
    });
  });
});
