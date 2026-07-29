import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { AuditEvent } from './audit-event.interface';

@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPublisher.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange: string;
  private readonly routingKey: string;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.exchange = this.configService.get<string>('rabbitmq.exchange') ?? 'audit_exchange';
    this.routingKey = this.configService.get<string>('rabbitmq.routingKey') ?? 'audit.event';
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;
    this.connectionPromise = this.doConnect();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    const host = this.configService.get<string>('rabbitmq.host') ?? 'rabbitmq';
    const port = this.configService.get<number>('rabbitmq.port') ?? 5672;
    const user = this.configService.get<string>('rabbitmq.user') ?? 'audit_user';
    const pass = this.configService.get<string>('rabbitmq.password') ?? 'audit_pass';
    const url = `amqp://${user}:${pass}@${host}:${port}`;

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      this.isConnected = true;
      this.logger.log('Conectado a RabbitMQ');

      this.connection.on('close', () => {
        this.logger.warn('Conexión RabbitMQ cerrada, reconectando...');
        this.handleDisconnect();
      });
      this.connection.on('error', (err: Error) => {
        this.logger.error(`Error en conexión RabbitMQ: ${err.message}`);
        this.handleDisconnect();
      });
    } catch (error) {
      this.handleDisconnect();
      this.logger.error(`Error conectando a RabbitMQ: ${(error as Error).message}`);
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.channel = null;
    this.connection = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => void this.connect(), 5000);
  }

  async publish(event: AuditEvent): Promise<void> {
    if (!this.isConnected || !this.channel) {
      this.logger.warn('Canal RabbitMQ no listo, intentando conectar...');
      await this.connect();
      if (!this.isConnected || !this.channel) {
        this.logger.error('No se pudo conectar a RabbitMQ, evento descartado (fire-and-forget).');
        return;
      }
    }
    try {
      const payload: AuditEvent = {
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      };
      const message = Buffer.from(JSON.stringify(payload));
      this.channel.publish(this.exchange, this.routingKey, message, {
        persistent: true,
      });
      this.logger.debug(`Evento publicado: ${event.accion} en ${event.entidad}`);
    } catch (error) {
      this.logger.error(`Error publicando evento: ${(error as Error).message}`);
      this.handleDisconnect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // ignore
    }
    this.logger.log('Conexión RabbitMQ cerrada');
  }
}