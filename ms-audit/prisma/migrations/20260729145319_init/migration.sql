-- CreateTable
CREATE TABLE "EventoAuditoria" (
    "id" TEXT NOT NULL,
    "servicio" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "datos" JSONB,
    "usuarioId" TEXT,
    "usuarioEmail" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoAuditoria_entidad_idx" ON "EventoAuditoria"("entidad");

-- CreateIndex
CREATE INDEX "EventoAuditoria_accion_idx" ON "EventoAuditoria"("accion");

-- CreateIndex
CREATE INDEX "EventoAuditoria_usuarioId_idx" ON "EventoAuditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_usuarioEmail_idx" ON "EventoAuditoria"("usuarioEmail");

-- CreateIndex
CREATE INDEX "EventoAuditoria_timestamp_idx" ON "EventoAuditoria"("timestamp");
