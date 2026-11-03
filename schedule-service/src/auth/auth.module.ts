import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthClientService } from './auth-client.service';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AuthClientService, AuthGuard],
  exports: [AuthClientService, AuthGuard],
})
export class AuthModule {}
