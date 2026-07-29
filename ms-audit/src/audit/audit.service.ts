import { Injectable } from '@nestjs/common';
import { Prisma, EventoAuditoria } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { SseService } from '../sse/sse.service';

export interface AuditQuery {
  entidad?: string;
  accion?: string;
  usuarioId?: string;
  usuarioEmail?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditPage {
  items: EventoAuditoria[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sse: SseService,
  ) {}

  async create(dto: CreateAuditEventDto): Promise<EventoAuditoria> {
    const rawTime = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const timestamp = isNaN(rawTime.getTime()) ? new Date() : rawTime;
    const event = await this.prisma.eventoAuditoria.create({
      data: {
        servicio: dto.servicio,
        accion: dto.accion,
        entidad: dto.entidad,
        datos: (dto.datos as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        usuarioId: dto.usuarioId,
        usuarioEmail: dto.usuarioEmail,
        timestamp,
      },
    });
    this.sse.emitEvent('audit-created', event);
    return event;
  }

  async findAll(query: AuditQuery): Promise<AuditPage> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20));
    const where: Prisma.EventoAuditoriaWhereInput = {};
    if (query.entidad) where.entidad = query.entidad;
    if (query.accion) where.accion = query.accion;
    if (query.usuarioId) where.usuarioId = query.usuarioId;
    if (query.usuarioEmail) where.usuarioEmail = query.usuarioEmail;
    if (query.desde || query.hasta) {
      where.timestamp = {};
      if (query.desde) where.timestamp.gte = new Date(query.desde);
      if (query.hasta) where.timestamp.lte = new Date(query.hasta);
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.eventoAuditoria.count({ where }),
      this.prisma.eventoAuditoria.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  }
}