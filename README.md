# CavaLocal

Marketplace intermediario de vinos para Caracas: descubre etiquetas, compara precios entre tiendas y **reserva** en la más cercana pagando una **seña online**.

---

## Arquitectura

| Servicio | Descripción | Puerto |
|---|---|---|
| `web` | Frontend e-commerce (HTML/CSS/JS) | 8080 |
| `backend` | API REST (NestJS + Prisma + PostgreSQL) | 3001 |
| `ms-audit` | Microservicio de auditoría (NestJS + RabbitMQ + SSE) | 3002 |
| `dashboard` | Dashboard de auditoría en tiempo real | — |
| `landing` | Página de marketing | — |
| `postgres` | Base de datos principal | 5432 |
| `postgres-audit` | Base de datos de auditoría | 5432 |
| `rabbitmq` | Message broker (auditoría de eventos) | 5672 |

---

## Imágenes Docker (DockerHub)

Las imágenes están publicadas en DockerHub bajo el usuario `kfamaguana`:

| Imagen | Tag |
|---|---|
| `kfamaguana/cavalocal-backend` | `latest` |
| `kfamaguana/cavalocal-ms-audit` | `latest` |
| `kfamaguana/cavalocal-web` | `latest` |
| `kfamaguana/cavalocal-dashboard` | `latest` |
| `kfamaguana/cavalocal-landing` | `latest` |

> No es necesario construir las imágenes localmente. Kubernetes las descarga automáticamente desde DockerHub al aplicar los manifests.

Si de todas formas quieres construirlas:

```bash
docker build -t kfamaguana/cavalocal-backend:latest -f backend/Dockerfile backend/
docker build -t kfamaguana/cavalocal-ms-audit:latest -f ms-audit/Dockerfile ms-audit/
docker build -t kfamaguana/cavalocal-web:latest -f Dockerfile.web .
docker build -t kfamaguana/cavalocal-dashboard:latest -f Dockerfile.dashboard .
docker build -t kfamaguana/cavalocal-landing:latest -f Dockerfile.landing .
```

---

## Despliegue en Kubernetes (Minikube)

### Requisitos previos

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) instalado y corriendo
- [kubectl](https://kubernetes.io/docs/tasks/tools/) instalado

### 1. Iniciar Minikube

```bash
minikube start
```

### 2. Habilitar el addon de Ingress

```bash
minikube addons enable ingress
```

### 3. Aplicar todos los manifests

```bash
kubectl apply -f k8s/
```

### 4. Verificar que los pods estén Running

```bash
kubectl get pods -n cavalocal -w
```

Esperar hasta que todos los pods muestren `Running`. Puede tomar 2-3 minutos la primera vez.

### 5. Cargar datos de prueba (una sola vez)

```bash
kubectl exec -n cavalocal deploy/backend -- npx prisma db seed
```

### 6. Acceder a la aplicación

```bash
kubectl port-forward svc/web 8080:80 -n cavalocal
```

Abrir `http://localhost:8080` en el navegador.

---

## Acceso por dominio (Ingress)

Para acceder mediante el dominio `conjunta3p.espe.edu.ec`, obtén la IP de Minikube:

```bash
minikube ip
```

Agrega esta línea al archivo de hosts del sistema (reemplaza `<MINIKUBE_IP>` con el resultado):

**Windows** (ejecutar como Administrador en PowerShell):
```powershell
Add-Content C:\Windows\System32\drivers\etc\hosts "<MINIKUBE_IP>  conjunta3p.espe.edu.ec"
```

**Linux/macOS:**
```bash
echo "<MINIKUBE_IP>  conjunta3p.espe.edu.ec" | sudo tee -a /etc/hosts
```

### URLs disponibles

| URL | Descripción |
|---|---|
| `http://conjunta3p.espe.edu.ec/` | Frontend web (e-commerce) |
| `http://conjunta3p.espe.edu.ec/api/docs` | Swagger / API docs |
| `http://conjunta3p.espe.edu.ec/api/audit` | API de auditoría (filtros por query params) |
| `http://conjunta3p.espe.edu.ec/dashboard/` | Dashboard de auditoría en tiempo real |
| `http://conjunta3p.espe.edu.ec/landing/` | Landing page |

---

## API de Auditoría — Filtros

`GET /api/audit` acepta los siguientes query params:

| Parámetro | Descripción | Ejemplo |
|---|---|---|
| `entidad` | Entidad auditada | `USUARIO`, `RESERVA`, `PAGO` |
| `accion` | Acción realizada | `CREATE`, `UPDATE`, `DELETE`, `LOGIN` |
| `usuarioId` | ID del usuario | `clx...` |
| `usuarioEmail` | Email del usuario | `ana@example.com` |
| `desde` | Fecha inicio (ISO 8601) | `2024-01-01T00:00:00Z` |
| `hasta` | Fecha fin (ISO 8601) | `2024-12-31T23:59:59Z` |
| `page` | Página (default: 1) | `1` |
| `pageSize` | Resultados por página (default: 20, max: 200) | `20` |

Ejemplo:
```
GET /api/audit?entidad=RESERVA&accion=CREATE&page=1&pageSize=10
```

---

## Dashboard en tiempo real (SSE)

El dashboard en `http://conjunta3p.espe.edu.ec/dashboard/` se conecta al endpoint SSE:

```
GET /api/audit/sse/audit
```

Cada operación en el backend (registro, login, reserva, pago, cancelación) emite un evento en tiempo real visible en el dashboard.

---

## Escalado del microservicio de auditoría

El microservicio `ms-audit` corre con **2 réplicas** por defecto (configurado en `k8s/07-ms-audit.yaml`).

Usa `prefetch(1)` y acknowledgment manual sobre RabbitMQ, garantizando que cada mensaje sea procesado **exactamente una vez** sin importar cuántas réplicas haya activas (competitive queue consumption).

Para escalar manualmente:
```bash
kubectl scale deployment ms-audit --replicas=2 -n cavalocal
```

---

## Teardown

Para eliminar todos los recursos del clúster:

```bash
kubectl delete namespace cavalocal
```
