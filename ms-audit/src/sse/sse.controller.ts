import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('audit')
  streamAudit(): Observable<MessageEvent> {
    return this.sseService.getEventStream().pipe(
      map((event) => ({
        data: JSON.stringify(event.data),
        type: event.type,
      })),
    );
  }
}