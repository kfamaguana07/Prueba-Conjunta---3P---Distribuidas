#!/bin/bash
set -e

DOCKERHUB_USER="kfamaguana"
TAG="latest"

echo "========================================="
echo "  CavaLocal - Build & Deploy to Minikube"
echo "========================================="

# ── 1. Build images inside Minikube's Docker daemon ──────────────────────────
echo ""
echo "[1/4] Pointing Docker to Minikube's daemon..."
eval $(minikube docker-env)

echo "[2/4] Building Docker images..."

docker build -t ${DOCKERHUB_USER}/cavalocal-backend:${TAG} -f backend/Dockerfile backend/
docker build -t ${DOCKERHUB_USER}/cavalocal-ms-audit:${TAG} -f ms-audit/Dockerfile ms-audit/
docker build -t ${DOCKERHUB_USER}/cavalocal-web:${TAG}       -f Dockerfile.web .
docker build -t ${DOCKERHUB_USER}/cavalocal-dashboard:${TAG} -f Dockerfile.dashboard .
docker build -t ${DOCKERHUB_USER}/cavalocal-landing:${TAG}   -f Dockerfile.landing .

echo "[2/4] Images built."

# ── 2. Enable NGINX Ingress addon ─────────────────────────────────────────────
echo ""
echo "[3/4] Enabling Minikube NGINX Ingress addon..."
minikube addons enable ingress
echo "Waiting for ingress controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s 2>/dev/null || true

# ── 3. Apply all manifests ─────────────────────────────────────────────────────
echo ""
echo "[4/4] Applying Kubernetes manifests..."
kubectl apply -f k8s/

echo ""
echo "Waiting for deployments to be ready (this may take a few minutes)..."
kubectl rollout status deployment/backend   -n cavalocal --timeout=180s || true
kubectl rollout status deployment/ms-audit  -n cavalocal --timeout=180s || true
kubectl rollout status deployment/web       -n cavalocal --timeout=60s  || true
kubectl rollout status deployment/dashboard -n cavalocal --timeout=60s  || true

# ── 4. Configure /etc/hosts for local domain ──────────────────────────────────
MINIKUBE_IP=$(minikube ip)
echo ""
echo "========================================="
echo "  Deployment complete!"
echo "========================================="
echo ""
echo "Minikube IP: ${MINIKUBE_IP}"
echo ""
echo "Add this line to your hosts file if not already present:"
echo "  ${MINIKUBE_IP}  conjunta3p.espe.edu.ec"
echo ""
echo "On Windows (run as Administrator):"
echo "  Add-Content C:\Windows\System32\drivers\etc\hosts '${MINIKUBE_IP}  conjunta3p.espe.edu.ec'"
echo ""

# ── 5. Port-forward web to localhost:8080 ─────────────────────────────────────
echo "Starting port-forward: http://localhost:8080 → web service"
echo "(Press Ctrl+C to stop)"
echo ""
kubectl port-forward svc/web 8080:80 -n cavalocal
