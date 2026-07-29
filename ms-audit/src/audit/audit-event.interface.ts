export interface AuditEvent {
  servicio: string;
  accion: string;
  entidad: string;
  datos?: Record<string, unknown>;
  usuarioId?: string;
  usuarioEmail?: string;
  timestamp?: string;
}