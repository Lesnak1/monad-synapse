# Monad Synapse CI/CD Setup Guide

## Overview

This document provides a comprehensive overview of the CI/CD pipeline setup for the Monad Synapse Casino Platform, including all implemented workflows, configurations, and operational procedures.

## 🚀 Features Implemented

### ✅ Complete CI/CD Pipeline Architecture

- **Multi-environment deployments** (staging, production)
- **Blue-green deployment** strategy for zero-downtime updates
- **Automated rollback** mechanisms with safety checks
- **Comprehensive testing** suite with parallel execution
- **Security-first** approach with multiple scanning layers
- **Performance monitoring** and alerting integration
- **Database migration** management with automated backups

### ✅ GitHub Actions Workflows

| Workflow | Purpose | Trigger | Key Features |
|----------|---------|---------|--------------|
| `ci-cd.yml` | Main deployment pipeline | Push to main/develop, manual | Full pipeline with security, testing, and deployment |
| `security-scan.yml` | Comprehensive security analysis | Daily schedule, PR | SAST, secrets detection, container scanning |
| `dependency-updates.yml` | Automated dependency management | Weekly schedule, manual | Security patches, dependency updates |
| `database-migration.yml` | Database schema management | Migration file changes, manual | Automated migrations with rollback support |

### ✅ Infrastructure as Code

- **Kubernetes manifests** for all environments
- **Docker multi-stage builds** optimized for production
- **ConfigMaps and Secrets** management
- **Service mesh ready** configurations
- **Monitoring and logging** infrastructure

### ✅ Security & Compliance

- **SAST analysis** with multiple tools (CodeQL, Semgrep, ESLint Security)
- **Secrets scanning** with TruffleHog, GitLeaks, and custom patterns
- **Container vulnerability scanning** with Trivy, Snyk, and Grype
- **Infrastructure security scanning** with Checkov and KICS
- **Compliance reporting** and audit trails

### ✅ Quality Assurance

- **TypeScript compilation** checks
- **ESLint code analysis** with security plugins
- **Prettier code formatting** validation
- **Comprehensive test coverage** with Jest
- **License compliance** checking

## 📁 File Structure

```
.
├── .github/
│   └── workflows/
│       ├── ci-cd.yml                 # Main CI/CD pipeline
│       ├── security-scan.yml         # Security analysis
│       ├── dependency-updates.yml    # Dependency management
│       └── database-migration.yml    # Database operations
├── apps/web/
│   ├── Dockerfile.production         # Optimized production build
│   ├── .eslintrc.security.json      # Security-focused ESLint config
│   └── app/api/
│       ├── health/                   # Health check endpoints
│       │   ├── route.ts             # Basic health check
│       │   ├── ready/route.ts       # Readiness probe
│       │   └── startup/route.ts     # Startup probe
│       └── metrics/route.ts          # Prometheus metrics
├── k8s/
│   ├── base/
│   │   ├── namespace.yaml           # Kubernetes namespaces
│   │   ├── configmap.yaml           # Application configuration
│   │   ├── secret.yaml              # Secret templates
│   │   └── monitoring.yaml          # Monitoring stack config
│   ├── staging/
│   │   ├── deployment.yaml          # Staging deployment
│   │   ├── service.yaml             # Staging services
│   │   └── ingress.yaml             # Staging ingress
│   └── production/
│       ├── deployment-blue.yaml     # Blue deployment
│       ├── deployment-green.yaml    # Green deployment
│       └── service.yaml             # Production services
├── scripts/
│   └── rollback.sh                  # Automated rollback script
├── docs/
│   ├── DEPLOYMENT.md                # Deployment procedures
│   ├── RUNBOOK.md                   # Operations manual
│   └── CICD_SETUP.md               # This file
├── .prettierrc.json                 # Prettier configuration
├── .prettierignore                  # Prettier ignore patterns
└── README.md                        # Project documentation
```

## 🔧 Setup Instructions

### 1. Repository Configuration

#### Required GitHub Secrets

```bash
# AWS/Cloud Provider
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
EKS_CLUSTER_NAME_STAGING
EKS_CLUSTER_NAME_PROD

# Database
STAGING_DATABASE_URL
PRODUCTION_DATABASE_URL

# Security Tools
SNYK_TOKEN
SONAR_TOKEN
SONAR_ORGANIZATION
SEMGREP_APP_TOKEN

# Notifications
SLACK_WEBHOOK
CRITICAL_ALERT_EMAIL

# SSL/TLS
SSL_CERT_ARN
```

#### Branch Protection Rules

Configure the following branch protection rules:

**Main Branch (`main`)**:
- [x] Require pull request reviews (2 reviewers)
- [x] Require status checks to pass
- [x] Require branches to be up to date
- [x] Include administrators
- [x] Restrict pushes to specific people/teams

**Develop Branch (`develop`)**:
- [x] Require pull request reviews (1 reviewer)
- [x] Require status checks to pass
- [x] Require branches to be up to date

### 2. Kubernetes Cluster Setup

#### Prerequisites
- Kubernetes cluster (v1.28+)
- NGINX Ingress Controller
- Cert-Manager for SSL certificates
- Prometheus and Grafana for monitoring

#### Apply Base Configuration
```bash
# Create namespaces
kubectl apply -f k8s/base/namespace.yaml

# Apply ConfigMaps and secrets
kubectl apply -f k8s/base/configmap.yaml
envsubst < k8s/base/secret.yaml | kubectl apply -f -

# Setup monitoring
kubectl apply -f k8s/base/monitoring.yaml
```

#### Configure Secrets
```bash
# Create application secrets
kubectl create secret generic monad-synapse-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --namespace=production

# Create staging secrets
kubectl create secret generic monad-synapse-secrets \
  --from-literal=DATABASE_URL="$STAGING_DATABASE_URL" \
  --from-literal=REDIS_URL="$STAGING_REDIS_URL" \
  --from-literal=JWT_SECRET="$STAGING_JWT_SECRET" \
  --namespace=staging
```

### 3. Monitoring Setup

#### Prometheus Configuration
The monitoring stack includes:
- **Application metrics** via `/api/metrics` endpoint
- **Infrastructure metrics** via node-exporter
- **Custom business metrics** for casino operations
- **Security metrics** for threat detection

#### Grafana Dashboards
Pre-configured dashboards for:
- Application performance and health
- Infrastructure resource usage
- Business metrics and KPIs
- Security monitoring and alerts

#### Alerting Rules
Configured alerts for:
- **Critical**: Service down, high error rate, security incidents
- **Warning**: Performance degradation, resource constraints
- **Info**: Deployment notifications, maintenance events

## 🚦 Operational Workflows

### Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-casino-game
   # Develop and commit changes
   git push origin feature/new-casino-game
   ```

2. **Pull Request**
   - Create PR to `develop` branch
   - Automated checks run (tests, security, quality)
   - Code review and approval
   - Merge to `develop`

3. **Staging Deployment**
   - Automatic deployment to staging
   - Integration testing
   - QA validation

4. **Production Release**
   - Create PR from `develop` to `main`
   - Additional review and approval
   - Merge triggers production deployment

### Emergency Procedures

#### Quick Rollback
```bash
# Automated rollback script
./scripts/rollback.sh rollback-blue-green --environment production --force

# Manual rollback
kubectl patch service monad-synapse-prod -n production \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

#### Maintenance Mode
```bash
# Enable maintenance mode
kubectl patch configmap monad-synapse-config -n production \
  -p '{"data":{"MAINTENANCE_MODE":"true"}}'

# Restart deployments
kubectl rollout restart deployment/monad-synapse-blue -n production
```

#### Emergency Scaling
```bash
# Scale up quickly
kubectl scale deployment monad-synapse-blue --replicas=10 -n production

# Check scaling status
kubectl get pods -n production -w
```

## 🔍 Monitoring & Observability

### Key Metrics

#### Application Metrics
- **Request Rate**: `rate(http_requests_total[5m])`
- **Response Time**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- **Error Rate**: `rate(http_requests_total{status=~"5.."}[5m])`
- **Active Users**: `active_users_gauge`

#### Business Metrics
- **Games Played**: `rate(game_results_total[5m])`
- **Bets Placed**: `rate(bets_total[5m])`
- **Wallet Balance**: `wallet_balance_total`
- **Win/Loss Ratio**: Game outcome analysis

#### Security Metrics
- **Auth Failures**: `rate(auth_failures_total[5m])`
- **Suspicious Activity**: `rate(suspicious_activity_total[5m])`
- **Rate Limit Hits**: Connection and request limiting

### Health Check Endpoints

| Endpoint | Purpose | Usage |
|----------|---------|-------|
| `/api/health` | Basic health check | Load balancer health checks |
| `/api/health?detailed=true` | Comprehensive health | Detailed diagnostics |
| `/api/health/ready` | Readiness probe | Kubernetes readiness |
| `/api/health/startup` | Startup probe | Kubernetes startup |
| `/api/metrics` | Prometheus metrics | Monitoring scraping |

### Log Analysis

#### Structured Logging
All logs are structured in JSON format with:
- **Timestamp**: ISO 8601 format
- **Level**: error, warn, info, debug
- **Service**: monad-synapse
- **TraceID**: Request correlation
- **Metadata**: Context-specific data

#### Log Aggregation
- **Fluent Bit** for log collection
- **Elasticsearch** for storage and indexing
- **Kibana** for visualization and analysis

## 🛡️ Security Implementation

### Multi-Layer Security

#### 1. Static Analysis Security Testing (SAST)
- **CodeQL**: GitHub's semantic code analysis
- **Semgrep**: Pattern-based vulnerability detection
- **ESLint Security**: JavaScript/TypeScript security rules
- **SonarCloud**: Code quality and security

#### 2. Secrets Detection
- **TruffleHog**: High-entropy string detection
- **GitLeaks**: Git history scanning
- **Custom patterns**: Casino-specific secret patterns

#### 3. Container Security
- **Trivy**: Comprehensive vulnerability scanner
- **Snyk**: Dependency vulnerability analysis
- **Grype**: Container image analysis
- **Docker Scout**: Docker security scanning

#### 4. Infrastructure Security
- **Checkov**: Infrastructure as Code scanning
- **KICS**: Kubernetes security analysis
- **Network policies**: Pod-to-pod communication control
- **RBAC**: Role-based access control

### Security Automation

#### Automated Security Patches
- **Daily security scans** for critical vulnerabilities
- **Automatic PR creation** for security updates
- **Auto-merge capability** for verified patches
- **Immediate notifications** for critical issues

#### Compliance Monitoring
- **OWASP Top 10** coverage verification
- **CIS Controls** implementation tracking
- **SOC 2** framework alignment
- **PCI DSS** compliance monitoring

## 📈 Performance & Scaling

### Auto-Scaling Configuration

#### Horizontal Pod Autoscaler (HPA)
```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80
```

#### Cluster Autoscaler
- **Node scaling** based on pod scheduling requirements
- **Cost optimization** with appropriate instance types
- **Zone distribution** for high availability

### Performance Optimization

#### Application Level
- **Connection pooling** for database and Redis
- **Caching strategies** with appropriate TTL
- **Resource limits** optimized for workload
- **Garbage collection** tuning for Node.js

#### Infrastructure Level
- **Pod anti-affinity** for distribution
- **Resource requests/limits** optimization
- **Network performance** tuning
- **Storage performance** optimization

## 🔄 Continuous Improvement

### Regular Reviews

#### Weekly
- [ ] Performance metrics analysis
- [ ] Security scan results review
- [ ] Dependency update status
- [ ] Cost optimization opportunities

#### Monthly
- [ ] SLA/SLO compliance review
- [ ] Capacity planning assessment
- [ ] Security posture evaluation
- [ ] Process improvement identification

#### Quarterly
- [ ] Full architecture review
- [ ] Disaster recovery testing
- [ ] Team training and knowledge transfer
- [ ] Technology stack evaluation

### Metrics & KPIs

#### Operational Excellence
- **Deployment Frequency**: Daily deployments
- **Lead Time**: < 2 hours from commit to production
- **MTTR**: < 15 minutes for critical issues
- **Change Failure Rate**: < 5%

#### Security Posture
- **Vulnerability Response Time**: < 24 hours for critical
- **Security Scan Coverage**: 100% of code and infrastructure
- **False Positive Rate**: < 10%
- **Compliance Score**: > 95%

#### Performance Targets
- **Availability**: 99.9% uptime
- **Response Time**: < 200ms P95
- **Error Rate**: < 0.1%
- **Scalability**: Handle 10x traffic spikes

## 📚 Additional Resources

### Documentation
- [Deployment Guide](./DEPLOYMENT.md) - Comprehensive deployment procedures
- [Operations Runbook](./RUNBOOK.md) - Day-to-day operational procedures
- [Security Guidelines](../security-report.md) - Security best practices
- [Architecture Overview](./TECH_STACK.md) - Technical architecture details

### Tools & Integrations
- **GitHub Actions**: CI/CD pipeline automation
- **Kubernetes**: Container orchestration
- **Prometheus/Grafana**: Monitoring and alerting
- **Slack**: Team communication and alerts
- **Docker**: Containerization platform

### Contact & Support
- **DevOps Team**: #devops-support
- **Security Team**: security@monad-synapse.com
- **On-Call Engineer**: #critical-alerts
- **Documentation Updates**: Create PR in this repository

---

**Document Version**: 1.0  
**Last Updated**: December 2023  
**Next Review**: March 2024  
**Maintained By**: DevOps Team