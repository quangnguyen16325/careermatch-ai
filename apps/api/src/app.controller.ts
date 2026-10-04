import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Service information' })
  getServiceInfo() {
    return this.appService.getServiceInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  getHealth() {
    return this.appService.getHealth();
  }
}
