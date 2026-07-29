import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AuditService } from './audit.service';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';

@Injectable()
export class AuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuditConsumer.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connectAndConsume();
  }

  private async connectAndConsume(): Promise<void> {
    const host = this.config.get<string>('rabbitmq.host') ?? 'rabbitmq';
    const port = this.config.get<number>('rabbitmq.port') ?? 5672;
    const user = this.config.get<string>('rabbitmq.user') ?? 'audit_user';
    const pass = this.config.get<string>('rabbitmq.password') ?? 'audit_pass';
    const url = `amqp://${user}:${pass}@${host}:${port}`;

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.logger.log('Conectado a RabbitMQ');

      this.connection.on('close', () => {
        this.logger.warn('Conexión RabbitMQ cerrada, reintentando en 5s...');
        this.connection = null;
        this.channel = null;
        setTimeout(() => void this.connectAndConsume(), 5000);
      });

      await this.consume();
    } catch (error) {
      this.logger.error(`Fallo de conexión RabbitMQ: ${(error as Error).message}`);
      setTimeout(() => void this.connectAndConsume(), 5000);
    }
  }

  private async consume(): Promise<void> {
    if (!this.channel) return;
    const queue = this.config.get<string>('rabbitmq.queue') ?? 'audit_queue';
    const exchange = this.config.get<string>('rabbitmq.exchange') ?? 'audit_exchange';
    const routingKey = this.config.get<string>('rabbitmq.routingKey') ?? 'audit.event';

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);
    await this.channel.prefetch(1);

    this.channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        const content = msg.content.toString();
        try {
          const raw = JSON.parse(content);
          const dto = plainToInstance(CreateAuditEventDto, raw);
          const errors = await validate(dto);

          if (errors.length > 0) {
            const msgs = errors.map((e: ValidationError) =>
              Object.values(e.constraints || {}).join(', '),
            );
            this.logger.warn(`DTO inválido descartado: ${msgs.join('; ')}`);
            this.channel?.nack(msg, false, false);
            return;
          }

          await this.auditService.create(dto);
          this.channel?.ack(msg);
        } catch (err) {
          this.logger.error(`Error procesando mensaje: ${(err as Error).message}`);
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false },
    );
    this.logger.log(`Consumiendo cola '${queue}'`);
  }
}