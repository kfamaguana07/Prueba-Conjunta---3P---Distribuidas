# ms-audit — Microservicio de Auditoría de CavaLocal

Microservicio NestJS independiente que consume eventos de auditoría desde RabbitMQ, los persiste en su propia base PostgreSQL y expone una API REST (paginada y filtrada) más un endpoint **SSE** para el dashboard en tiempo real.

## Arquitectura

```
Backend CavaLocal ──publish──▶ RabbitMQ ──consume──▶ ms-audit ──persist──▶ PostgreSQL
        (NestJS)         (audit_exchange)  (ACK manual)  (Prisma)     (evento_auditoria)
                                                                   └──SSE──▶ Dashboard
```

## Estructura

```
ms-audit/
  prisma/
    schema.prisma          # model EventoAuditoria
    migrations/
  src/
    config/configuration.ts
    prisma/                # PrismaModule + PrismaService
    health/                # GET /health (readiness/liveness)
    sse/                   # SseService (Subject RxJS) + SseController (@Sse)
    audit/
      audit-event.interface.ts
      dto/create-audit-event.dto.ts   # class-validator
      audit.service.ts                 # persist + findAll paginado con filtros
      audit.consumer.ts                # amqplib, noAck:false, ACK manual tras persistir
      audit.controller.ts              # GET /audit
      audit.module.ts
    app.module.ts
    main.ts
  Dockerfile
  .env.example
```

## Cómo correrlo en local

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev          # :3002, Swagger en /docs
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/audit` | Lista paginada con filtros: `entidad`, `accion`, `usuarioId`, `usuarioEmail`, `desde`, `hasta`, `page`, `pageSize` |
| `GET` | `/sse/audit` | Stream SSE — emite un evento cada vez que se persiste una auditoría |
| `GET` | `/health` | Healthcheck para readiness/liveness probes |

## Contrato del mensaje (RabbitMQ)

```json
{
  "servicio": "cavalocal-backend",
  "accion": "CREATE",
  "entidad": "RESERVA",
  "datos": { "reservationId": "..." },
  "usuarioId": "uuid",
  "usuarioEmail": "ana@example.com",
  "timestamp": "2026-07-29T12:00:00.000Z"
}
```

- `accion` ∈ `CREATE | UPDATE | DELETE | LOGIN | LOGOUT | SELECT`
- `entidad` en MAYÚSCULAS y guiones
- ACK manual: el mensaje solo se confirma tras persistir exitosamente. Si falla la validación o la persistencia, se hace `nack` sin requeue (descarta).

## Escalado

Cola durable con prefetch=1 y ACK manual → múltiples réplicas (2+) consumen en competencia sin duplicar mensajes.