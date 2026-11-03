import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

@InputType({ description: 'Pagination parameters' })
export class PaginationInput {
  @Field(() => Int, { defaultValue: 0, description: 'Number of records to skip' })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @Field(() => Int, { defaultValue: 10, description: 'Number of records to fetch' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 10;
}
