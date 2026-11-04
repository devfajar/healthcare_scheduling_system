import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { NotificationLog, NotificationHealth } from './models/notification-log.model';

@Resolver()
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Query(() => NotificationHealth, {
    name: 'notificationHealth',
    description: 'Mengecek status kesehatan dan ketersediaan Notification Microservice',
  })
  getHealth(): NotificationHealth {
    return this.notificationService.getHealth();
  }

  @Query(() => [NotificationLog], {
    name: 'notificationLogs',
    description: 'Mengambil riwayat log notifikasi email yang telah diproses oleh worker Bull Queue',
  })
  getLogs(
    @Args('limit', {
      type: () => Int,
      nullable: true,
      defaultValue: 10,
      description: 'Jumlah maksimal riwayat notifikasi yang ditampilkan (default: 10)',
    })
    limit: number,
  ): NotificationLog[] {
    return this.notificationService.getLogs(limit);
  }
}
