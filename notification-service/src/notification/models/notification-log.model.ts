import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Data log pengiriman notifikasi email' })
export class NotificationLog {
  @Field(() => ID, { description: 'ID unik notifikasi' })
  id: string;

  @Field(() => String, { description: 'Alamat email penerima notifikasi' })
  recipientEmail: string;

  @Field(() => String, { description: 'Subjek email' })
  subject: string;

  @Field(() => String, { description: 'Tipe event notifikasi (SCHEDULE_CREATED / SCHEDULE_CANCELLED)' })
  eventType: string;

  @Field(() => String, { description: 'Status pengiriman notifikasi (SENT / FAILED)' })
  status: string;

  @Field(() => Date, { description: 'Waktu notifikasi dikirimkan' })
  sentAt: Date;
}

@ObjectType({ description: 'Status kesehatan Notification Microservice' })
export class NotificationHealth {
  @Field(() => String, { description: 'Status layanan' })
  status: string;

  @Field(() => String, { description: 'Nama microservice' })
  service: string;

  @Field(() => Date, { description: 'Timestamp server' })
  timestamp: Date;
}
