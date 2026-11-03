import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Customer } from '../../customer/models/customer.model';
import { Doctor } from '../../doctor/models/doctor.model';

@ObjectType({ description: 'Healthcare Consultation Schedule' })
export class Schedule {
  @Field(() => ID, { description: 'Schedule UUID' })
  id: string;

  @Field(() => String, { description: 'Consultation objective / purpose' })
  objective: string;

  @Field(() => ID, { description: 'Customer UUID' })
  customerId: string;

  @Field(() => ID, { description: 'Doctor UUID' })
  doctorId: string;

  @Field(() => Date, { description: 'Scheduled appointment timestamp' })
  scheduledAt: Date;

  @Field(() => Date, { description: 'Record creation timestamp' })
  createdAt: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt: Date;

  @Field(() => Customer, { nullable: true, description: 'Customer details' })
  customer?: Customer;

  @Field(() => Doctor, { nullable: true, description: 'Doctor details' })
  doctor?: Doctor;
}
