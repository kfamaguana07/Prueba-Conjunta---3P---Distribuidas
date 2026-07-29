import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SseEvent {
  type: string;
  data: unknown;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly eventSubject = new Subject<SseEvent>();

  emitEvent(type: string, data: unknown): void {
    this.logger.debug(`Evento SSE emitido: ${type}`);
    this.eventSubject.next({ type, data });
  }

  getEventStream() {
    return this.eventSubject.asObservable();
  }
}