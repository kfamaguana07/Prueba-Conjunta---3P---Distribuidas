# CavaLocal

<<<<<<< HEAD
Marketplace intermediario de vinos para Caracas: descubre etiquetas, compara precios entre tiendas y **reserva** en la más cercana pagando una **seña online**.

---
=======
Marketplace intermediario de vinos para Caracas + **microservicio de auditoría** con RabbitMQ y dashboard en tiempo real (SSE).

> Identidad: burdeos `#641E2E` · dorado `#C2912B` · crema `#F3ECDD`.
>>>>>>> 9f0a3b1f9964f286e783ff1bd54f4d928af6a395

## Arquitectura

| Servicio | Descripción | Puerto |
|---|---|---|
<<<<<<< HEAD
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
=======
| `backend/` | API REST principal (publica eventos en RabbitMQ) | NestJS + TypeScript + Prisma + PostgreSQL |
| `ms-audit/` | **Microservicio de auditoría** (consume RabbitMQ, persiste, SSE) | NestJS + Prisma + PostgreSQL |
| `web/` | Tienda e-commerce | HTML/CSS/JS puro (ES modules) |
| `dashboard/` | Panel de auditoría en tiempo real (SSE) | HTML/CSS/JS + EventSource |
| Raíz (`index.html`, `main.js`, `assets/`) | Landing de marketing | HTML + GSAP |
| `app/` | App móvil (deprecada) | React Native + Expo |
| `k8s/` | Manifiestos de Kubernetes | Deployments, Services, Ingress, etc. |

## Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   web/      │────────▶│   backend    │──publish▶  RabbitMQ   │
│  (tienda)   │  REST   │  (NestJS)    │         │  (exchange)  │
│  :8080      │         │  :3001       │         │  :5672       │
└─────────────┘         └──────────────┘         └──────┬───────┘
                                                        │ consume
                                                        ▼
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│ dashboard/  │◀──SSE──│   ms-audit   │◀────────│  consume ACK │
│  :8082      │         │  (NestJS)    │         │  manual      │
│             │         │  :3002       │         └──────────────┘
└─────────────┘         └──────┬───────┘
                               │ persist
                               ▼
                        ┌──────────────┐
                        │ PostgreSQL   │
                        │  (audit)     │
                        └──────────────┘
>>>>>>> 9f0a3b1f9964f286e783ff1bd54f4d928af6a395
```

---

<<<<<<< HEAD
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
=======
## Despliegue en Kubernetes (evaluación)

El docente seguirá estos pasos. Toda la orquestación está en `k8s/` y se aplica con un solo comando.

### 1. Clonar el repositorio

```bash
git clone https://github.com/kfamaguana07/Prueba-Conjunta---3P---Distribuidas.git
cd Prueba-Conjunta---3P---Distribuidas
```

### 2. Construir las imágenes Docker y subirlas a un registro público

Cada servicio tiene su `Dockerfile`. Construí las imágenes y subilas a un registro público (GitHub Container Registry, Docker Hub, etc.) para que Kubernetes pueda pullarlas.

```bash
# Elegí tu registro (ej: ghcr.io/kfamaguana07 o docker.io/<tu-usuario>)
export REGISTRY=ghcr.io/kfamaguana07

# Backend
docker build -t $REGISTRY/cavalocal-backend:latest ./backend
docker push $REGISTRY/cavalocal-backend:latest

# Microservicio de auditoría
docker build -t $REGISTRY/ms-audit:latest ./ms-audit
docker push $REGISTRY/ms-audit:latest

# Tienda (nginx + estáticos)
docker build -t $REGISTRY/cavalocal-web:latest -f Dockerfile.web .
docker push $REGISTRY/cavalocal-web:latest

# Dashboard (nginx + estáticos)
docker build -t $REGISTRY/audit-dashboard:latest -f Dockerfile.dashboard .
docker push $REGISTRY/audit-dashboard:latest

# Landing
docker build -t $REGISTRY/cavalocal-landing:latest -f Dockerfile.landing .
docker push $REGISTRY/cavalocal-landing:latest
```

> Si no querés subir imágenes, podés buildarlas localmente y cargarlas en Minikube/Kind con `minikube image load` o `kind load docker-image` (ver sección "Sin registro público" más abajo).

### 3. Iniciar el clúster de Kubernetes

**Minikube** (recomendado):
```bash
minikube start --driver=docker
minikube addons enable ingress   # habilita el NGINX Ingress Controller
```

**Kind** (alternativa):
```bash
kind create cluster --name cavalocal
# Kind requiere instalar el Ingress Controller manualmente:
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

Verificá que el clúster y el Ingress Controller estén listos:
```bash
kubectl get nodes
kubectl get pods -n ingress-nginx -w   # esperar a que estén Running
```

### 4. Aplicar los manifiestos

```bash
kubectl apply -f k8s/
```

Este único comando crea:
- **Deployments** (con réplicas configurables) para backend, ms-audit, web, dashboard, landing
- **Services** (ClusterIP para comunicación interna)
- **StatefulSets** para PostgreSQL y RabbitMQ con persistencia (PVC)
- **ConfigMaps** y **Secrets** para variables de entorno
- **Ingress** con dominio `conjunta3p.espe.edu.ec`
- **Probes** de readiness y liveness en todos los Deployments

> Si el comando falla (errores sintácticos, recursos no encontrados, dependencias faltantes) → revisá que el Ingress Controller esté activo y que las imágenes existan en el registro.

### 5. Configurar el dominio local

Para que `conjunta3p.espe.edu.ec` resuelva al clúster, agregá una entrada en `/etc/hosts`:

```bash
# Obtené la IP del clúster
minikube ip        # o: kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}'

# Agregá al /etc/hosts (reemplazá <IP> con la salida anterior)
echo "<IP>  conjunta3p.espe.edu.ec" | sudo tee -a /etc/hosts
```

En Windows: editá `C:\Windows\System32\drivers\etc\hosts` como administrador.

### 6. Verificar el despliegue

#### 6.1 Pods en estado Running con healthchecks pasando
```bash
kubectl get pods -w
```
Todos los pods deben estar `Running` y los probes `1/1`. Esperá a que `ms-audit` y `backend` pasen readiness (tardan unos segundos por Prisma migrate).

#### 6.2 Ingress activo respondiendo al dominio
```bash
kubectl get ingress
curl http://conjunta3p.espe.edu.ec/dashboard        # panel de auditoría
curl http://conjunta3p.espe.edu.ec/api/audit        # API de auditoría
curl http://conjunta3p.espe.edu.ec/                 # tienda
```

#### 6.3 Tablero mostrando eventos en tiempo real
1. Abrí `http://conjunta3p.espe.edu.ec/dashboard` en el navegador.
2. Generá una operación en el backend (ej: registrá un usuario):
   ```bash
   curl -X POST http://conjunta3p.espe.edu.ec/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com","password":"12345678"}'
   ```
3. El dashboard debe reflejar el evento en ≤ 2 segundos (SSE).

#### 6.4 API de auditoría con filtros
```bash
curl "http://conjunta3p.espe.edu.ec/api/audit?entidad=USUARIO&page=1&pageSize=10"
curl "http://conjunta3p.espe.edu.ec/api/audit?accion=LOGIN"
curl "http://conjunta3p.espe.edu.ec/api/audit?usuarioEmail=test@example.com"
```

#### 6.5 Escalar ms-audit a 2 réplicas sin duplicar mensajes
```bash
kubectl scale deployment ms-audit --replicas=2
kubectl get pods -l app=ms-audit -w
```

Verificá que no haya duplicados: RabbitMQ usa cola competitiva con `prefetch=1` y **ACK manual** — cada mensaje lo consume una sola réplica.

```bash
# Generá varios eventos y controlá que cada uno aparezca una sola vez
curl "http://conjunta3p.espe.edu.ec/api/audit?pageSize=50" | python3 -m json.tool | grep '"id"' | sort | uniq -d
# (no debe devolver IDs duplicados)
```

---

## Sin registro público (desarrollo local con Minikube)

Si no querés pushar imágenes a un registro, podés cargarlas directamente en Minikube:

```bash
# Activar el daemon de Docker de Minikube
eval $(minikube docker-env)

# Buildar (las imágenes quedan disponibles dentro de Minikube)
docker build -t cavalocal-backend:latest ./backend
docker build -t ms-audit:latest ./ms-audit
docker build -t cavalocal-web:latest -f Dockerfile.web .
docker build -t audit-dashboard:latest -f Dockerfile.dashboard .

# Asegurate de que los manifiestos k8s usen imagePullPolicy: Never
# (para que K8s use la imagen local en vez de intentar pullar)
```

---

## Variables de entorno (Secrets)

Las credenciales se inyectan vía **Secrets** de Kubernetes. Los manifiestos referencian `secretKeyRef` para:

| Secret key | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL del backend |
| `AUDIT_DATABASE_URL` | Conexión PostgreSQL del ms-audit |
| `JWT_SECRET` | Secreto para tokens JWT |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | Credenciales del broker |
| `RABBITMQ_EXCHANGE` / `RABBITMQ_QUEUE` / `RABBITMQ_ROUTING_KEY` | Config del exchange/queue |

Creá los secrets antes de aplicar (o usá el manifiesto `k8s/secrets.yaml` con tus valores):
```bash
kubectl create secret generic cavalocal-secrets \
  --from-literal=DATABASE_URL='postgresql://espe:espe123@postgres-svc:5432/cavalocal?schema=public' \
  --from-literal=AUDIT_DATABASE_URL='postgresql://audit:audit@postgres-audit-svc:5432/audit?schema=public' \
  --from-literal=JWT_SECRET='cambia-esto-en-produccion' \
  --from-literal=RABBITMQ_USER='audit_user' \
  --from-literal=RABBITMQ_PASSWORD='audit_pass' \
  --from-literal=RABBITMQ_EXCHANGE='audit_exchange' \
  --from-literal=RABBITMQ_QUEUE='audit_queue' \
  --from-literal=RABBITMQ_ROUTING_KEY='audit.event'
```

> No commitees secrets reales. El archivo `k8s/secrets.yaml` debe tener placeholders o estar en `.gitignore`.

---

## Credenciales de prueba

El seed del backend crea un usuario admin:
- **Email**: `admin@cavalocal.com`
- **Contraseña**: `Admin123`
- **Rol**: `ADMIN` (único que ve el botón "Dashboard" en la tienda)

RabbitMQ Management UI: `audit_user` / `audit_pass`.

---

## Desarrollo local (sin Kubernetes)

Con Docker Compose (stack completo de 9 servicios con un comando):
```bash
cp .env.example .env
docker compose up --build
```

| Servicio | URL |
|---|---|
| Tienda | http://localhost:8080 |
| Landing | http://localhost:3000 |
| Backend (Swagger) | http://localhost:3001/docs |
| ms-audit (Swagger) | http://localhost:3002/docs |
| Dashboard | http://localhost:8082 |
| App Expo | http://localhost:8081 |
| RabbitMQ UI | http://localhost:15672 |

Sin Docker (cada componente por separado):
```bash
# Backend
cd backend && cp .env.example .env && npm install
npx prisma migrate deploy && npx prisma generate && npm run prisma:seed
npm run start:dev

# ms-audit
cd ms-audit && cp .env.example .env && npm install
npx prisma migrate dev && npx prisma generate
npm run start:dev

# Tienda
npx http-server web -p 8080

# Dashboard
npx http-server dashboard -p 8082
```

## Tests
```bash
cd backend && npm test   # Jest (auth, payments, reservations, notifications, reviews)
cd web && npm test       # node --test (validadores, carrusel, tarjeta)
```

## Licencia
Privado / académico. Todos los derechos reservados a sus autores.
>>>>>>> 9f0a3b1f9964f286e783ff1bd54f4d928af6a395
