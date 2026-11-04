import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      service: 'notification-service',
      port: 3003,
      timestamp: new Date().toISOString(),
    };
  }
}
