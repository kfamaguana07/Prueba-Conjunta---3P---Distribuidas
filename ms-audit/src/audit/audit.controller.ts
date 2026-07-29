import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService, AuditQuery } from './audit.service';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de eventos de auditoría con paginación y filtros' })
  @ApiQuery({ name: 'entidad', required: false })
  @ApiQuery({ name: 'accion', required: false })
  @ApiQuery({ name: 'usuarioId', required: false })
  @ApiQuery({ name: 'usuarioEmail', required: false })
  @ApiQuery({ name: 'desde', required: false, description: 'ISO 8601' })
  @ApiQuery({ name: 'hasta', required: false, description: 'ISO 8601' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findAll(@Query() query: AuditQuery) {
    return this.auditService.findAll(query);
  }
}