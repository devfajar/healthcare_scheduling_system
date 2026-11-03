import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'schedule-service',
      port: 3002,
      timestamp: new Date().toISOString(),
    };
  }
}
