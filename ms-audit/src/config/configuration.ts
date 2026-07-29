export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3002', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL as string,
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),
  rabbitmq: {
    host: process.env.RABBITMQ_HOST ?? 'rabbitmq',
    port: parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
    user: process.env.RABBITMQ_USER ?? 'audit_user',
    password: process.env.RABBITMQ_PASSWORD ?? 'audit_pass',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'audit_exchange',
    queue: process.env.RABBITMQ_QUEUE ?? 'audit_queue',
    routingKey: process.env.RABBITMQ_ROUTING_KEY ?? 'audit.event',
  },
});