# Kubernetes Deployment for Quiz Game

This directory contains all the Kubernetes manifests needed to deploy the Gravitee Quiz Game application.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured to access your cluster
- cert-manager installed with an `http-01` ClusterIssuer
- nginx-ingress controller installed
- Container images pushed to a registry

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Ingress (HTTPS with TLS)                         │
│              apidays-2025-quiz.events.gravitee.io                   │
├─────────────────────────────────────────────────────────────────────┤
│  /api/*       │  /game/*      │  /admin/*     │  /scoreboard/*      │
│      ↓        │      ↓        │      ↓        │       ↓             │
│  Backend      │  Game Client  │ Admin Console │   Scoreboard        │
│  (FastAPI)    │   (Nginx)     │   (Nginx)     │    (Nginx)          │
└───────┬───────┴───────────────┴───────────────┴─────────────────────┘
        │
        ↓
   PostgreSQL DB
```

## URLs

After deployment, the application will be available at:

| Service       | URL                                                      |
|---------------|----------------------------------------------------------|
| Game Client   | https://apidays-2025-quiz.events.gravitee.io/game        |
| Admin Console | https://apidays-2025-quiz.events.gravitee.io/admin       |
| Scoreboard    | https://apidays-2025-quiz.events.gravitee.io/scoreboard  |
| Backend API   | https://apidays-2025-quiz.events.gravitee.io/api         |

## Deployment Steps

### 1. Build and Push Docker Images

First, build and push the Docker images to your container registry:

```bash
# Set your registry
REGISTRY="your-registry.io"

# Build images
docker build -t $REGISTRY/quiz-backend:latest -f backend/Dockerfile ./backend
docker build -t $REGISTRY/quiz-game-client:latest -f game-client/Dockerfile .
docker build -t $REGISTRY/quiz-admin-console:latest -f admin-console/Dockerfile .
docker build -t $REGISTRY/quiz-scoreboard:latest -f scoreboard/Dockerfile .

# Push images
docker push $REGISTRY/quiz-backend:latest
docker push $REGISTRY/quiz-game-client:latest
docker push $REGISTRY/quiz-admin-console:latest
docker push $REGISTRY/quiz-scoreboard:latest
```

### 2. Update Image References

Update the image references in the deployment files or use kustomize to override:

```yaml
# In k8s/kustomization.yaml, uncomment and update:
images:
  - name: gravitee/quiz-backend
    newName: your-registry.io/quiz-backend
    newTag: v1.0.0
  # ... etc
```

### 3. Update Secrets

**Important:** Update the secrets in `secrets.yaml` with production values:

```bash
# Generate a secure secret key
openssl rand -base64 32
```

### 4. Deploy with Kustomize

```bash
# Preview the manifests
kubectl kustomize k8s/

# Apply to cluster
kubectl apply -k k8s/

# Or without kustomize, apply files individually:
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/database.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/game-client.yaml
kubectl apply -f k8s/admin-console.yaml
kubectl apply -f k8s/scoreboard.yaml
kubectl apply -f k8s/ingress.yaml
```

### 5. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n quiz-game

# Check services
kubectl get svc -n quiz-game

# Check ingress
kubectl get ingress -n quiz-game

# Check certificate status
kubectl get certificate -n quiz-game

# View logs
kubectl logs -n quiz-game -l app.kubernetes.io/name=quiz-backend
```

## Configuration

### Environment Variables

| Variable        | Description                           | Default                                            |
|-----------------|---------------------------------------|----------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string          | Set in secrets.yaml                                |
| `SECRET_KEY`    | JWT signing key                       | Set in secrets.yaml                                |
| `BASE_PATH`     | API base path prefix                  | "" (empty)                                         |
| `CORS_ORIGINS`  | Allowed CORS origins                  | https://apidays-2025-quiz.events.gravitee.io       |
| `API_BASE_URL`  | Frontend API URL                      | https://apidays-2025-quiz.events.gravitee.io/api   |

### Scaling

Adjust replicas in the deployment files:

```bash
kubectl scale deployment quiz-backend -n quiz-game --replicas=3
kubectl scale deployment quiz-game-client -n quiz-game --replicas=3
```

### TLS/Certificates

The ingress is configured to use cert-manager with the `http-01` ClusterIssuer. Make sure:

1. cert-manager is installed in your cluster
2. You have an `http-01` ClusterIssuer configured:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: http-01
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-http01
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Troubleshooting

### Certificate not issuing

```bash
# Check certificate status
kubectl describe certificate quiz-tls-cert -n quiz-game

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

### Backend not connecting to database

```bash
# Check database is running
kubectl get pods -n quiz-game -l app.kubernetes.io/name=quiz-db

# Check database logs
kubectl logs -n quiz-game -l app.kubernetes.io/name=quiz-db
```

### Ingress not working

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Cleanup

```bash
kubectl delete -k k8s/
# or
kubectl delete namespace quiz-game
```
