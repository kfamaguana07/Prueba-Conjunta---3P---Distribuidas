export interface AuditEvent {
  entity: string;
  action: string;
  userId?: string;
  userEmail?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}