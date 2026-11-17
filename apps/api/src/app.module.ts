import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/environment.js';
import { envFilePath } from './config/env-file.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      validate: validateEnvironment,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
