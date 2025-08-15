# Monad Synapse Casino Platform - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the Monad Synapse Casino Platform using our automated CI/CD pipeline and manual deployment procedures.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Automated Deployment](#automated-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Blue-Green Deployment](#blue-green-deployment)
7. [Database Management](#database-management)
8. [Monitoring and Observability](#monitoring-and-observability)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)
11. [Emergency Procedures](#emergency-procedures)

## Architecture Overview

The Monad Synapse platform uses a microservices architecture deployed on Kubernetes with the following components:

- **Frontend**: Next.js 15.4.6 application with TypeScript
- **Blockchain Integration**: Web3 integration with RainbowKit and Wagmi v2
- **Database**: PostgreSQL with automated migrations
- **Cache**: Redis for session and application caching
- **Monitoring**: Prometheus, Grafana, and custom metrics
- **Load Balancing**: Nginx with SSL termination
- **Container Registry**: GitHub Container Registry (GHCR)

### Deployment Environments

1. **Development**: Local development environment
2. **Staging**: Testing environment (staging namespace)
3. **Production**: Live production environment (production namespace)

## Prerequisites

### Required Tools

```bash
# Essential tools
kubectl >= 1.28.0
docker >= 24.0.0
helm >= 3.12.0
jq >= 1.6
curl >= 7.68.0

# Optional but recommended
k9s >= 0.27.0
stern >= 1.22.0
```

### Access Requirements

- Kubernetes cluster access with appropriate RBAC permissions
- GitHub repository access for CI/CD triggers
- Container registry access (GHCR)
- AWS/Cloud provider credentials (if applicable)
- Slack webhook for notifications (optional)

### Environment Setup

1. **Configure kubectl context**:
   ```bash
   kubectl config use-context <your-cluster-context>
   kubectl config set-context --current --namespace=production
   ```

2. **Verify cluster connectivity**:
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

## Environment Configuration

### Required Secrets

Create the following secrets in your Kubernetes cluster:

```bash
# Database secrets
kubectl create secret generic monad-synapse-secrets \
  --from-literal=DATABASE_URL="postgresql://user:password@host:5432/database" \
  --from-literal=REDIS_URL="redis://host:6379" \
  --namespace=production

# Application secrets
kubectl create secret generic monad-synapse-secrets \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=WALLET_PRIVATE_KEY="your-wallet-key" \
  --from-literal=ENCRYPTION_KEY="your-encryption-key" \
  --namespace=production

# External service secrets
kubectl create secret generic monad-synapse-secrets \
  --from-literal=SLACK_WEBHOOK_URL="https://hooks.slack.com/..." \
  --from-literal=SENTRY_DSN="https://sentry.io/..." \
  --namespace=production
```

### GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

```
# AWS/Cloud Provider
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
EKS_CLUSTER_NAME_STAGING
EKS_CLUSTER_NAME_PROD

# Container Registry
GITHUB_TOKEN (automatically provided)

# Database
STAGING_DATABASE_URL
PRODUCTION_DATABASE_URL

# Security Tools
SNYK_TOKEN
SONAR_TOKEN
SONAR_ORGANIZATION

# Notifications
SLACK_WEBHOOK
CRITICAL_ALERT_EMAIL

# SSL/TLS
SSL_CERT_ARN
```

## Automated Deployment

### CI/CD Pipeline Overview

The automated deployment pipeline consists of several stages:

1. **Code Quality & Security Checks**
2. **Comprehensive Testing Suite**
3. **Security Scanning**
4. **Build and Containerization**
5. **Staging Deployment**
6. **Production Deployment** (with manual approval)
7. **Post-deployment Monitoring**

### Triggering Deployments

#### Staging Deployment
Automatically triggered on:
- Push to `develop` branch
- Manual workflow dispatch with `environment: staging`

#### Production Deployment
Triggered on:
- Push to `main` branch (requires staging deployment success)
- Manual workflow dispatch with `environment: production`

### Manual Workflow Trigger

1. Go to GitHub Actions in your repository
2. Select "Monad Synapse CI/CD Pipeline"
3. Click "Run workflow"
4. Configure parameters:
   - **Environment**: staging or production
   - **Skip tests**: false (unless emergency)
   - **Auto merge**: false (for security patches)

### Monitoring Deployment Progress

Track deployment progress through:

1. **GitHub Actions**: Real-time pipeline execution
2. **Kubernetes**: Pod and service status
3. **Slack notifications**: Automated updates
4. **Grafana dashboards**: Performance metrics

## Manual Deployment

For emergency situations or when automated deployment is unavailable:

### 1. Build and Push Container

```bash
# Build the application
cd apps/web
npm run build

# Build Docker image
docker build -t ghcr.io/your-org/monad-synapse:manual-$(date +%Y%m%d-%H%M%S) -f Dockerfile.production .

# Push to registry
docker push ghcr.io/your-org/monad-synapse:manual-$(date +%Y%m%d-%H%M%S)
```

### 2. Deploy to Kubernetes

```bash
# Update image tag in deployment
export IMAGE_TAG="ghcr.io/your-org/monad-synapse:manual-$(date +%Y%m%d-%H%M%S)"

# Apply configurations
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml

# Deploy to staging
envsubst < k8s/staging/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/staging/service.yaml
kubectl apply -f k8s/staging/ingress.yaml

# Wait for rollout
kubectl rollout status deployment/monad-synapse-staging -n staging --timeout=600s
```

### 3. Health Check Verification

```bash
# Check pod status
kubectl get pods -n staging -l app.kubernetes.io/name=monad-synapse

# Test health endpoint
kubectl run --rm -i test --image=curlimages/curl --restart=Never -- \
  curl -f http://monad-synapse-staging.staging.svc.cluster.local/api/health
```

## Blue-Green Deployment

### Overview

Production uses blue-green deployment for zero-downtime updates:

- **Blue Environment**: Current production traffic
- **Green Environment**: New version being deployed
- **Switch**: Atomic traffic cutover between environments

### Deployment Process

1. **Deploy to inactive environment** (e.g., if blue is active, deploy to green)
2. **Health check** the new environment
3. **Switch traffic** to the new environment
4. **Monitor** for issues
5. **Scale down** the old environment

### Manual Blue-Green Switch

```bash
# Check current active environment
kubectl get service monad-synapse-prod -n production -o jsonpath='{.spec.selector.version}'

# Switch to green (if blue is currently active)
kubectl patch service monad-synapse-prod -n production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify the switch
kubectl get service monad-synapse-prod -n production -o jsonpath='{.spec.selector.version}'
```

### Rollback Procedure

Use the automated rollback script:

```bash
# Quick rollback (switches blue-green environments)
./scripts/rollback.sh rollback-blue-green --environment production

# Full rollback with database (requires version)
./scripts/rollback.sh rollback-full --environment production --version 20231201_120000

# Check rollback status
./scripts/rollback.sh status --environment production
```

## Database Management

### Migration Process

1. **Automated migrations** run as part of the CI/CD pipeline
2. **Manual migrations** can be triggered via GitHub Actions
3. **Rollback procedures** available for emergency situations

### Manual Migration

```bash
# Trigger migration workflow
gh workflow run database-migration.yml \
  -f environment=production \
  -f migration_action=migrate

# Check migration status
gh workflow run database-migration.yml \
  -f environment=production \
  -f migration_action=status
```

### Database Backup and Recovery

```bash
# Manual backup (production)
kubectl run --rm -i db-backup --image=postgres:15-alpine --restart=Never -- \
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
kubectl run --rm -i db-restore --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL < backup_20231201_120000.sql
```

## Monitoring and Observability

### Key Metrics Dashboards

1. **Application Performance**: Response times, error rates, throughput
2. **Infrastructure**: CPU, memory, disk usage, network
3. **Business Metrics**: Game results, betting volume, user activity
4. **Security**: Authentication failures, suspicious activity

### Health Check Endpoints

- **Basic Health**: `GET /api/health`
- **Detailed Health**: `GET /api/health?detailed=true`
- **Readiness**: `GET /api/health/ready`
- **Startup**: `GET /api/health/startup`
- **Metrics**: `GET /api/metrics`

### Log Access

```bash
# Application logs
kubectl logs -f deployment/monad-synapse-blue -n production -c monad-synapse

# Nginx logs
kubectl logs -f deployment/monad-synapse-blue -n production -c nginx

# All pods logs
stern monad-synapse -n production
```

### Alert Thresholds

- **Critical**: Application down, high error rate (>5%), database issues
- **Warning**: High response time (>2s), memory usage (>80%), unusual metrics
- **Info**: Deployment notifications, scheduled maintenance

## Security Considerations

### Network Security

- All communication encrypted in transit (TLS 1.3)
- Network policies restrict pod-to-pod communication
- Ingress controller with WAF rules
- Rate limiting and DDoS protection

### Container Security

- Non-root user execution
- Read-only root filesystem
- Minimal base images (Alpine Linux)
- Regular vulnerability scanning
- Signed container images

### Data Security

- Secrets stored in Kubernetes secrets or external secret management
- Database encryption at rest and in transit
- PCI compliance for payment processing
- Regular security audits and penetration testing

### Access Control

- RBAC for Kubernetes cluster access
- Multi-factor authentication for production access
- Audit logging for all administrative actions
- Principle of least privilege

## Troubleshooting

### Common Issues

#### Deployment Fails

```bash
# Check pod status
kubectl get pods -n production -l app.kubernetes.io/name=monad-synapse

# Describe pod for events
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production -c monad-synapse
```

#### Health Check Failures

```bash
# Test health endpoint directly
kubectl exec -it <pod-name> -n production -c monad-synapse -- \
  curl localhost:3000/api/health

# Check application logs
kubectl logs <pod-name> -n production -c monad-synapse --tail=100
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl run --rm -i db-test --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check database pod logs (if running in cluster)
kubectl logs <database-pod> -n production
```

#### Service Discovery Problems

```bash
# Check service endpoints
kubectl get endpoints monad-synapse-prod -n production

# Test service connectivity
kubectl run --rm -i connectivity-test --image=curlimages/curl --restart=Never -- \
  curl -v http://monad-synapse-prod.production.svc.cluster.local
```

### Performance Issues

#### High Response Times

1. Check database performance and slow queries
2. Review application metrics for bottlenecks
3. Verify resource limits and scaling policies
4. Check network latency and DNS resolution

#### Memory Leaks

1. Monitor heap usage trends in Grafana
2. Analyze garbage collection patterns
3. Review recent code changes for memory issues
4. Consider restarting affected pods

### Security Incidents

#### Suspected Breach

1. **Immediate**: Block suspicious traffic at load balancer
2. **Isolate**: Scale down affected pods and preserve evidence
3. **Assess**: Review audit logs and security monitoring
4. **Notify**: Alert security team and relevant stakeholders
5. **Remediate**: Apply security patches and update credentials

#### DDoS Attack

1. Enable enhanced rate limiting
2. Activate DDoS protection at cloud provider level
3. Scale up infrastructure if necessary
4. Monitor for application-level attacks

## Emergency Procedures

### Complete System Outage

1. **Assessment** (2-3 minutes)
   - Verify outage scope and impact
   - Check infrastructure status
   - Review recent changes

2. **Communication** (within 5 minutes)
   - Notify stakeholders via Slack and email
   - Update status page
   - Establish incident command

3. **Recovery** (target: 15 minutes)
   - Execute rollback if recent deployment
   - Scale up infrastructure if capacity issue
   - Activate disaster recovery if infrastructure failure

4. **Monitoring** (ongoing)
   - Track recovery progress
   - Monitor for secondary issues
   - Provide regular updates

### Database Corruption

1. **Stop application traffic** (maintenance mode)
2. **Assess corruption scope** using database tools
3. **Restore from latest backup** if necessary
4. **Replay transactions** from WAL logs if possible
5. **Verify data integrity** before resuming traffic
6. **Resume normal operations** with enhanced monitoring

### Security Incident Response

1. **Contain** the incident (isolate affected systems)
2. **Assess** the scope and impact
3. **Eradicate** the threat (patch, update credentials)
4. **Recover** systems to normal operation
5. **Learn** from the incident (post-mortem)

### Contact Information

- **On-call Engineer**: Slack #critical-alerts or phone escalation
- **DevOps Team Lead**: [contact information]
- **Security Team**: security@monad-synapse.com
- **Management Escalation**: [escalation contacts]

### Recovery Time Objectives (RTO)

- **Application Recovery**: 15 minutes
- **Database Recovery**: 30 minutes
- **Full System Recovery**: 1 hour
- **Disaster Recovery**: 4 hours

### Recovery Point Objectives (RPO)

- **Application Data**: 5 minutes (continuous replication)
- **Database**: 1 minute (streaming replication)
- **User Sessions**: Acceptable loss during outage
- **Game State**: No loss (atomic transactions)

---

## Conclusion

This deployment guide provides comprehensive procedures for managing the Monad Synapse Casino Platform deployment lifecycle. Regular practice of these procedures, especially emergency scenarios, is essential for maintaining high availability and quick recovery times.

For additional support or questions, please contact the DevOps team through the designated channels.

**Document Version**: 1.0  
**Last Updated**: December 2023  
**Next Review Date**: March 2024