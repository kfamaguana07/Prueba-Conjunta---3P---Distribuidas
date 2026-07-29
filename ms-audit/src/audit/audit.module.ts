import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditConsumer } from './audit.consumer';
import { AuditController } from './audit.controller';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [SseModule],
  controllers: [AuditController],
  providers: [AuditService, AuditConsumer],
})
export class AuditModule {}