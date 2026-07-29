# CavaLocal

Marketplace intermediario de vinos para Caracas + **microservicio de auditoría** con RabbitMQ y dashboard en tiempo real (SSE).

> Identidad: burdeos `#641E2E` · dorado `#C2912B` · crema `#F3ECDD`.

## Estructura del repo

| Carpeta | Qué es | Stack |
|---|---|---|
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
```

---

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