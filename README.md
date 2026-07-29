# CavaLocal

Marketplace intermediario de vinos para Caracas + **microservicio de auditoría** con RabbitMQ y dashboard en tiempo real (SSE).

---

## Estructura

| Carpeta | Descripción | Stack |
|---|---|---|
| `backend/` | API REST principal (publica eventos en RabbitMQ) | NestJS + Prisma + PostgreSQL |
| `ms-audit/` | Microservicio de auditoría (consume RabbitMQ, SSE) | NestJS + Prisma + PostgreSQL |
| `web/` | Tienda e-commerce | HTML/CSS/JS |
| `dashboard/` | Panel de auditoría en tiempo real | HTML/CSS/JS + EventSource |
| `k8s/` | Manifiestos de Kubernetes | Deployments, Services, Ingress |
| Raíz (`index.html`, `main.js`) | Landing de marketing | HTML + GSAP |

---

## Arquitectura

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│   web    │────────▶│   backend    │──publish▶│  RabbitMQ   │
│  :8080   │  REST   │  :3001       │         │  :5672       │
└──────────┘         └──────────────┘         └──────┬───────┘
                                                     │ consume
                                                     ▼
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│dashboard │◀──SSE───│   ms-audit   │─────────│  ACK manual  │
│          │         │  :3002 x2    │         └──────────────┘
└──────────┘         └──────┬───────┘
                            │ persist
                            ▼
                     ┌──────────────┐
                     │ PostgreSQL   │
                     │  (audit)     │
                     └──────────────┘
```

---

## Imágenes Docker (DockerHub)

Las imágenes están publicadas en DockerHub bajo `kfamaguana`. Kubernetes las descarga automáticamente, **no es necesario hacer build localmente**.

| Imagen | Tag |
|---|---|
| `kfamaguana/cavalocal-backend` | `latest` |
| `kfamaguana/cavalocal-ms-audit` | `latest` |
| `kfamaguana/cavalocal-web` | `latest` |
| `kfamaguana/cavalocal-dashboard` | `latest` |
| `kfamaguana/cavalocal-landing` | `latest` |

Si quieres construirlas manualmente:

```bash
docker build -t kfamaguana/cavalocal-backend:latest -f backend/Dockerfile backend/
docker build -t kfamaguana/cavalocal-ms-audit:latest -f ms-audit/Dockerfile ms-audit/
docker build -t kfamaguana/cavalocal-web:latest -f Dockerfile.web .
docker build -t kfamaguana/cavalocal-dashboard:latest -f Dockerfile.dashboard .
docker build -t kfamaguana/cavalocal-landing:latest -f Dockerfile.landing .
```

---

## Despliegue en Kubernetes (Minikube)

### Requisitos

- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

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

Esperar hasta que todos los pods muestren `Running` (2-3 minutos la primera vez).

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

Obtén la IP de Minikube:

```bash
minikube ip
```

Agrega esta línea al archivo de hosts (reemplaza `<MINIKUBE_IP>`):

**Windows** (PowerShell como Administrador):
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
| `http://conjunta3p.espe.edu.ec/api/audit` | API de auditoría |
| `http://conjunta3p.espe.edu.ec/dashboard/` | Dashboard en tiempo real |
| `http://conjunta3p.espe.edu.ec/landing/` | Landing page |

---

## API de Auditoría — Filtros

`GET /api/audit` acepta los siguientes query params:

| Parámetro | Descripción | Valores posibles |
|---|---|---|
| `entidad` | Entidad auditada | `USUARIO`, `RESERVA`, `PAGO`, `REVIEW` |
| `accion` | Acción realizada | `CREATE`, `UPDATE`, `DELETE`, `LOGIN` |
| `usuarioId` | ID del usuario | cualquier string |
| `usuarioEmail` | Email del usuario | cualquier email |
| `desde` | Fecha inicio (ISO 8601) | `2024-01-01T00:00:00Z` |
| `hasta` | Fecha fin (ISO 8601) | `2024-12-31T23:59:59Z` |
| `page` | Página (default: 1) | número |
| `pageSize` | Resultados por página (default: 20, max: 200) | número |

Ejemplo:
```
GET /api/audit?entidad=RESERVA&accion=CREATE&page=1&pageSize=10
```

---

## Dashboard en tiempo real (SSE)

El dashboard se conecta al endpoint SSE del microservicio de auditoría:

```
GET /api/audit/sse/audit
```

Cada operación en el backend (registro, login, reserva, pago, cancelación) emite un evento visible en tiempo real en el dashboard.

---

## Escalado sin duplicación de mensajes

`ms-audit` corre con **2 réplicas** (configurado en `k8s/07-ms-audit.yaml`).

Usa `prefetch(1)` + acknowledgment manual sobre RabbitMQ → cada mensaje es procesado **exactamente una vez** independientemente del número de réplicas activas.

Para escalar manualmente:
```bash
kubectl scale deployment ms-audit --replicas=2 -n cavalocal
```

---

## Teardown

```bash
kubectl delete namespace cavalocal
```
