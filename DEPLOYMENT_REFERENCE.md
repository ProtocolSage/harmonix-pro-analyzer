# Harmonix Pro Analyzer - Deployment & DevOps Reference

This document provides deployment configurations and procedures for production deployment.

---

## Deployment Architecture

### Recommended Setup: Docker + Nginx

```
┌─────────────────────────────────────────────────────────────┐
│ Load Balancer (HAProxy, Nginx, AWS ALB)                     │
│ - HTTPS termination                                         │
│ - Request distribution                                      │
│ - Health check (GET /)                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Container 1  │ │ Container 2  │ │ Container 3  │
│ harmonix:v1  │ │ harmonix:v1  │ │ harmonix:v1  │
│ nginx:8080   │ │ nginx:8080   │ │ nginx:8080   │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Shared Storage      │      │ Monitoring Stack    │
│ (asset cache)       │      │ - Prometheus        │
│                     │      │ - Grafana           │
│                     │      │ - ELK Stack         │
└─────────────────────┘      └─────────────────────┘
```

---

## Nginx Configuration

### File: `deployment/default.conf`

```nginx
# Harmonix Pro Analyzer - Production Nginx Configuration
# Place in: /etc/nginx/conf.d/default.conf (in container)

upstream harmonix {
    # Define backend servers (if using reverse proxy)
    # server backend:3000;
    # server backend:3001;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=analysis:10m rate=5r/s;

# HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# Main HTTPS server block
server {
    listen 8080 ssl http2;
    server_name harmonix.example.com;

    # SSL certificates (mounted from secrets/config)
    # ssl_certificate /etc/nginx/ssl/harmonix.crt;
    # ssl_certificate_key /etc/nginx/ssl/harmonix.key;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # HSTS - Enforce HTTPS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # CSP - Content Security Policy
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'wasm-unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        font-src 'self';
        connect-src 'self' https://api.harmonix.example.com;
        worker-src 'self';
        media-src 'self';
    " always;

    # CORS headers (if needed)
    add_header Access-Control-Allow-Origin "https://harmonix.example.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;

    # Cross-Origin headers (for SharedArrayBuffer support)
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # Enable compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Buffer sizes
    client_max_body_size 100M;  # Max file upload
    client_body_buffer_size 1m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    # Timeouts
    client_body_timeout 60s;
    client_header_timeout 60s;
    keepalive_timeout 65s;
    send_timeout 60s;

    # Access and error logging
    access_log /var/log/nginx/harmonix_access.log;
    error_log /var/log/nginx/harmonix_error.log;

    # Root directory
    root /usr/share/nginx/html;
    index index.html;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Static assets with long cache
    location ~* ^/assets/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        # Use content hash for cache busting
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # WASM files specific cache
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing - redirect 404s to index.html
    location / {
        limit_req zone=general burst=20 nodelay;

        # Try file, then directory, else index.html (SPA)
        try_files $uri $uri/ /index.html;

        # Don't cache HTML
        add_header Cache-Control "public, max-age=0, must-revalidate";
        add_header ETag "";
        expires -1;
    }

    # API proxy (if backend needed)
    location /api/ {
        limit_req zone=analysis burst=10 nodelay;
        proxy_pass http://harmonix;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Monitoring endpoint (no SSL)
server {
    listen 8081;
    server_name _;

    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    location /metrics {
        access_log off;
        # Could expose nginx metrics here
        return 200 "metrics endpoint\n";
    }
}
```

### File: `deployment/nginx.conf`

```nginx
# Harmonix Pro Analyzer - Main Nginx Configuration
# Place in: /etc/nginx/nginx.conf

user harmonix;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    log_format json_combined escape=json
    '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
    '}';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Include server blocks
    include /etc/nginx/conf.d/*.conf;
}
```

---

## Docker Compose for Local Development

### File: `deployment/docker-compose.yml`

```yaml
version: '3.9'

services:
  # Main application
  harmonix:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: harmonix-app
    ports:
      - "3000:8080"  # Web app
      - "9001:8081"  # Metrics
    environment:
      NODE_ENV: production
    volumes:
      # For development: mount source code
      - ./frontend/src:/app/src:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - mongodb
    networks:
      - harmonix-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/index.html"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # MongoDB for analysis results (optional)
  mongodb:
    image: mongo:7-alpine
    container_name: harmonix-db
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: harmonix
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-changeme}
      MONGO_INITDB_DATABASE: harmonix
    volumes:
      - mongodb-data:/data/db
      - ./deployment/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    networks:
      - harmonix-network
    healthcheck:
      test: ["CMD", "mongo", "admin", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis for caching (optional)
  redis:
    image: redis:7-alpine
    container_name: harmonix-cache
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - harmonix-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Prometheus for metrics (optional)
  prometheus:
    image: prom/prometheus:latest
    container_name: harmonix-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./deployment/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - harmonix-network

  # Grafana for dashboards (optional)
  grafana:
    image: grafana/grafana:latest
    container_name: harmonix-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_SECURITY_ADMIN_USER: admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - harmonix-network

volumes:
  mongodb-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  harmonix-network:
    driver: bridge
```

---

## Environment Configuration

### File: `.env.example`

```bash
# Application
NODE_ENV=production
HARMONIX_VERSION=1.0.0
HARMONIX_PORT=8080

# Database (if using backend)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/harmonix
MONGODB_USERNAME=harmonix
MONGODB_PASSWORD=your-secure-password

# Redis (if using cache)
REDIS_URL=redis://localhost:6379

# API Configuration
API_BASE_URL=https://api.harmonix.example.com
API_TIMEOUT=30000

# Analytics & Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0

# Feature Flags
FEATURE_STREAMING_ANALYSIS=true
FEATURE_ML_MODELS=true
FEATURE_EXPORT_PDF=true

# Performance
MAX_FILE_SIZE=104857600  # 100MB
ANALYSIS_TIMEOUT=300000  # 5 minutes
WORKER_THREADS=4

# Security
CORS_ALLOWED_ORIGINS=https://harmonix.example.com,https://app.harmonix.example.com
SESSION_SECRET=your-super-secret-key-change-in-production
```

### File: `.env.staging`

```bash
NODE_ENV=production
HARMONIX_VERSION=1.0.0-staging
HARMONIX_PORT=8080

# Staging database
MONGODB_URI=mongodb://staging-db:27017/harmonix
MONGODB_USERNAME=harmonix_staging
MONGODB_PASSWORD=${STAGING_DB_PASSWORD}

# Staging API
API_BASE_URL=https://api-staging.harmonix.example.com
API_TIMEOUT=30000

# Staging monitoring
SENTRY_DSN=https://staging-sentry-dsn@sentry.io/staging-project
SENTRY_ENVIRONMENT=staging
SENTRY_SAMPLE_RATE=0.5  # Sample 50% in staging

# Feature flags (test all features in staging)
FEATURE_STREAMING_ANALYSIS=true
FEATURE_ML_MODELS=true
FEATURE_EXPORT_PDF=true

# Security
CORS_ALLOWED_ORIGINS=https://staging.harmonix.example.com
```

### File: `.env.production`

```bash
NODE_ENV=production
HARMONIX_VERSION=1.0.0
HARMONIX_PORT=8080

# Production database
MONGODB_URI=${PROD_MONGODB_URI}
MONGODB_USERNAME=${PROD_MONGODB_USERNAME}
MONGODB_PASSWORD=${PROD_MONGODB_PASSWORD}

# Production API
API_BASE_URL=https://api.harmonix.example.com
API_TIMEOUT=30000

# Production monitoring
SENTRY_DSN=${PROD_SENTRY_DSN}
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=0.1  # Sample 10% in production

# Feature flags (conservative in production)
FEATURE_STREAMING_ANALYSIS=true
FEATURE_ML_MODELS=true
FEATURE_EXPORT_PDF=true

# Security
CORS_ALLOWED_ORIGINS=https://harmonix.example.com
SESSION_SECRET=${PROD_SESSION_SECRET}

# Performance tuning for production
MAX_FILE_SIZE=104857600
ANALYSIS_TIMEOUT=300000
WORKER_THREADS=8  # More threads in production
```

---

## Deployment Scripts

### File: `deployment/deploy.sh`

```bash
#!/bin/bash
set -euo pipefail

# Harmonix Pro Analyzer - Deployment Script
# Usage: ./deploy.sh <environment> [version]

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
REGISTRY=${DOCKER_REGISTRY:-docker.io}
IMAGE_NAME=${REGISTRY}/harmonix/analyzer
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

echo "==============================================="
echo "Deploying Harmonix Pro Analyzer"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Timestamp: $TIMESTAMP"
echo "==============================================="

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    echo "Loading environment: .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    echo "ERROR: .env.$ENVIRONMENT not found"
    exit 1
fi

# Build Docker image
echo "Building Docker image: $IMAGE_NAME:$VERSION"
docker build \
    --build-arg BUILD_TIME="$TIMESTAMP" \
    --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
    --build-arg VERSION="$VERSION" \
    -t "$IMAGE_NAME:$VERSION" \
    -t "$IMAGE_NAME:$ENVIRONMENT" \
    -t "$IMAGE_NAME:latest" \
    -f Dockerfile \
    .

# Verify build
echo "Verifying build..."
docker run --rm "$IMAGE_NAME:$VERSION" nginx -t

# Test image
echo "Testing image..."
docker run --rm -p 8080:8080 "$IMAGE_NAME:$VERSION" &
sleep 5
curl -f http://localhost:8080/index.html || exit 1
killall nginx

# Push to registry
echo "Pushing to registry..."
docker push "$IMAGE_NAME:$VERSION"
docker push "$IMAGE_NAME:$ENVIRONMENT"

# Deploy based on environment
case "$ENVIRONMENT" in
    staging)
        echo "Deploying to staging..."
        # Example: Docker Compose
        docker-compose -f deployment/docker-compose.staging.yml pull
        docker-compose -f deployment/docker-compose.staging.yml up -d

        # Wait for service to be healthy
        sleep 10
        if curl -f http://localhost:3000/health; then
            echo "✅ Staging deployment successful"
        else
            echo "❌ Staging deployment health check failed"
            exit 1
        fi
        ;;

    production)
        echo "Deploying to production..."
        # Example: Kubernetes
        kubectl set image deployment/harmonix \
            harmonix="$IMAGE_NAME:$VERSION" \
            --record \
            -n production

        # Wait for rollout
        kubectl rollout status deployment/harmonix -n production

        # Verify endpoints
        kubectl run --rm -i --tty test --image=curlimages/curl --restart=Never -- \
            curl http://harmonix-service/health || exit 1

        echo "✅ Production deployment successful"
        ;;

    *)
        echo "ERROR: Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "==============================================="
echo "Deployment complete!"
echo "==============================================="
```

### File: `deployment/rollback.sh`

```bash
#!/bin/bash
set -euo pipefail

# Harmonix Pro Analyzer - Rollback Script

ENVIRONMENT=${1:-production}
PREVIOUS_VERSION=${2}

echo "Initiating rollback for: $ENVIRONMENT"

case "$ENVIRONMENT" in
    kubernetes)
        echo "Rolling back Kubernetes deployment..."
        kubectl rollout undo deployment/harmonix -n production
        kubectl rollout status deployment/harmonix -n production
        echo "✅ Kubernetes rollback complete"
        ;;

    docker-compose)
        echo "Rolling back Docker Compose stack..."
        docker-compose -f deployment/docker-compose.prod.yml down
        docker-compose -f deployment/docker-compose.prod.yml up -d
        echo "✅ Docker Compose rollback complete"
        ;;

    *)
        echo "ERROR: Unknown deployment type"
        exit 1
        ;;
esac
```

---

## Health Checks & Monitoring

### File: `deployment/health-check.sh`

```bash
#!/bin/bash

# Harmonix Pro Analyzer - Health Check Script

ENDPOINT=${1:-http://localhost:8080}
HEALTH_URL="$ENDPOINT/health"

echo "Running health check on: $ENDPOINT"

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ HTTP health check passed"
else
    echo "❌ HTTP health check failed (code: $HTTP_CODE)"
    exit 1
fi

# Check page load
if curl -f "$ENDPOINT/index.html" > /dev/null 2>&1; then
    echo "✅ Index page check passed"
else
    echo "❌ Index page check failed"
    exit 1
fi

# Check WASM availability
if curl -f "$ENDPOINT/assets/js/index-*.js" > /dev/null 2>&1; then
    echo "✅ Assets check passed"
else
    echo "❌ Assets check failed"
    exit 1
fi

echo "✅ All health checks passed"
```

---

## Kubernetes Deployment (Optional)

### File: `deployment/k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: harmonix
  namespace: production
  labels:
    app: harmonix
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: harmonix
  template:
    metadata:
      labels:
        app: harmonix
        version: v1
    spec:
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsReadOnlyRootFilesystem: true
        seccompProfile:
          type: RuntimeDefault

      # Pod disruption budget
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - harmonix
              topologyKey: kubernetes.io/hostname

      # Containers
      containers:
      - name: harmonix
        image: harmonix:v1
        imagePullPolicy: IfNotPresent

        # Ports
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 8081
          protocol: TCP

        # Environment
        env:
        - name: NODE_ENV
          value: "production"
        - name: SENTRY_DSN
          valueFrom:
            secretKeyRef:
              name: harmonix-secrets
              key: sentry-dsn

        # Resource limits
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 2

        # Security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL

        # Volumes
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run

      # Volumes
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      - name: run
        emptyDir: {}

      # Termination grace period
      terminationGracePeriodSeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: harmonix-service
  namespace: production
  labels:
    app: harmonix
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  selector:
    app: harmonix
```

---

## References & Further Reading

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Security Best Practices](https://github.com/denji/nginx-security)
- [OWASP Top 10 Web Security](https://owasp.org/www-project-top-ten/)
- [Kubernetes Security Documentation](https://kubernetes.io/docs/concepts/security/)
