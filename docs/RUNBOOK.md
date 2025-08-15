# Monad Synapse Casino Platform - Operations Runbook

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [System Overview](#system-overview)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Common Operations](#common-operations)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Performance Tuning](#performance-tuning)
8. [Security Operations](#security-operations)
9. [Backup and Recovery](#backup-and-recovery)
10. [Scaling Operations](#scaling-operations)

## Quick Reference

### Emergency Contacts
- **Critical Issues**: Slack #critical-alerts
- **Security Issues**: security@monad-synapse.com
- **On-Call Engineer**: [Phone/Pager]
- **DevOps Lead**: [Contact Info]

### Key URLs
- **Production App**: https://monad-synapse.com
- **Staging App**: https://staging.monad-synapse.com
- **Grafana**: https://monitoring.monad-synapse.com/grafana
- **Prometheus**: https://monitoring.monad-synapse.com/prometheus
- **Status Page**: https://status.monad-synapse.com

### Quick Commands
```bash
# Check application health
kubectl get pods -n production -l app.kubernetes.io/name=monad-synapse

# View application logs
stern monad-synapse -n production --since 10m

# Quick rollback
./scripts/rollback.sh rollback-blue-green --environment production

# Scale application
kubectl scale deployment monad-synapse-blue --replicas=5 -n production

# Enable maintenance mode
kubectl patch configmap monad-synapse-config -n production -p '{"data":{"MAINTENANCE_MODE":"true"}}'
```

## System Overview

### Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│  Nginx Gateway  │────│  Next.js App    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐           │
│  PostgreSQL DB  │────│  Redis Cache    │───────────┘
└─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐           │
│   Prometheus    │────│    Grafana      │───────────┘
└─────────────────┘    └─────────────────┘
```

### Service Dependencies

- **External Dependencies**:
  - Monad Blockchain RPC
  - GitHub Container Registry
  - DNS Provider
  - SSL Certificate Provider

- **Internal Dependencies**:
  - PostgreSQL Database
  - Redis Cache
  - Prometheus Monitoring
  - AlertManager

### Data Flow

1. **User Request** → Load Balancer → Nginx → Next.js App
2. **Database Operations** → App → PostgreSQL
3. **Caching** → App → Redis
4. **Blockchain Interactions** → App → Monad RPC
5. **Monitoring** → App → Prometheus → Grafana

## Monitoring and Alerting

### Key Metrics to Monitor

#### Application Metrics
```
# Request rate and response time
rate(http_requests_total[5m])
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Active users
active_users_gauge

# Game metrics
rate(game_results_total[5m])
rate(bets_total[5m])
```

#### Infrastructure Metrics
```
# CPU and Memory
rate(process_cpu_seconds_total[5m])
process_resident_memory_bytes

# Database connections
postgresql_connections_active
postgresql_connections_idle

# Cache hit rate
redis_hit_rate
redis_memory_usage_bytes
```

### Alert Severities

#### Critical (Immediate Response Required)
- Application completely down
- Database unavailable
- High error rate (>5% for 2+ minutes)
- Security breach detected
- Wallet balance critically low

#### Warning (Response Within 15 Minutes)
- High response time (>2s for 5+ minutes)
- High resource usage (>80% for 10+ minutes)
- Unusual game result patterns
- High authentication failure rate

#### Info (Monitor and Plan)
- Deployment notifications
- Scheduled maintenance alerts
- Performance trend notifications

### Grafana Dashboards

1. **Application Overview**: High-level health and performance
2. **Infrastructure**: Resource usage and capacity
3. **Business Metrics**: Game statistics and revenue
4. **Security**: Authentication and threat monitoring
5. **SLI/SLO Tracking**: Service level indicators and objectives

## Common Operations

### Health Check Procedures

#### Application Health Check
```bash
# Basic health check
curl -f https://monad-synapse.com/api/health

# Detailed health check
curl -s https://monad-synapse.com/api/health?detailed=true | jq '.'

# Kubernetes health check
kubectl get pods -n production -l app.kubernetes.io/name=monad-synapse
kubectl describe pod <pod-name> -n production
```

#### Database Health Check
```bash
# Connection test
kubectl run --rm -i db-test --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT 1, now();"

# Connection count
kubectl run --rm -i db-test --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
kubectl run --rm -i db-test --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

#### Cache Health Check
```bash
# Redis connectivity
kubectl run --rm -i redis-test --image=redis:7-alpine --restart=Never -- \
  redis-cli -u $REDIS_URL ping

# Memory usage
kubectl run --rm -i redis-test --image=redis:7-alpine --restart=Never -- \
  redis-cli -u $REDIS_URL info memory
```

### Log Analysis

#### Application Logs
```bash
# Recent errors
kubectl logs -n production -l app.kubernetes.io/name=monad-synapse --since=1h | grep -i error

# Performance issues
kubectl logs -n production -l app.kubernetes.io/name=monad-synapse --since=30m | grep -i "slow\|timeout\|performance"

# Authentication issues
kubectl logs -n production -l app.kubernetes.io/name=monad-synapse --since=1h | grep -i "auth\|login\|unauthorized"
```

#### Structured Log Queries (if using ELK/Loki)
```json
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"level": "error"}},
        {"term": {"service": "monad-synapse"}}
      ]
    }
  }
}
```

### Configuration Updates

#### Update Environment Variables
```bash
# Update ConfigMap
kubectl patch configmap monad-synapse-config -n production \
  -p '{"data":{"NEW_CONFIG_KEY":"new_value"}}'

# Restart deployments to pick up changes
kubectl rollout restart deployment/monad-synapse-blue -n production
kubectl rollout restart deployment/monad-synapse-green -n production

# Wait for rollout
kubectl rollout status deployment/monad-synapse-blue -n production
```

#### Update Secrets
```bash
# Update secret (example: JWT secret rotation)
kubectl patch secret monad-synapse-secrets -n production \
  -p '{"data":{"JWT_SECRET":"'$(echo -n "new-secret" | base64)'"}}'

# Restart applications
kubectl rollout restart deployment/monad-synapse-blue -n production
kubectl rollout restart deployment/monad-synapse-green -n production
```

## Incident Response

### Incident Classifications

#### Severity 1 (Critical)
- Complete service outage
- Data corruption or loss
- Security breach
- Financial impact >$10K/hour

**Response Time**: Immediate (0-5 minutes)
**Escalation**: Automatic to on-call engineer and management

#### Severity 2 (High)
- Partial service degradation
- Performance issues affecting >50% of users
- Security vulnerability discovered
- Database performance issues

**Response Time**: 15 minutes
**Escalation**: On-call engineer

#### Severity 3 (Medium)
- Minor feature outage
- Performance issues affecting <50% of users
- Non-critical component failure

**Response Time**: 2 hours
**Escalation**: Next business day if not resolved

### Incident Response Procedures

#### Initial Response (First 5 Minutes)
1. **Acknowledge** the incident in monitoring systems
2. **Assess** the scope and impact
3. **Communicate** via Slack #critical-alerts
4. **Begin** immediate containment actions

#### Investigation Phase (5-15 Minutes)
1. **Gather** diagnostic information
2. **Identify** root cause if obvious
3. **Implement** temporary fixes if available
4. **Communicate** findings and next steps

#### Resolution Phase
1. **Execute** permanent fix
2. **Monitor** for stability
3. **Verify** full functionality
4. **Communicate** resolution

#### Post-Incident
1. **Document** the incident
2. **Conduct** post-mortem (within 24 hours for Sev 1/2)
3. **Implement** preventive measures
4. **Update** runbooks and procedures

### Common Incident Scenarios

#### Application Not Responding
```bash
# Quick diagnosis
kubectl get pods -n production -l app.kubernetes.io/name=monad-synapse
kubectl describe pod <failing-pod> -n production
kubectl logs <failing-pod> -n production --tail=50

# Immediate actions
# 1. Check if it's a single pod issue
kubectl delete pod <failing-pod> -n production

# 2. If multiple pods affected, check resources
kubectl top pods -n production
kubectl describe nodes

# 3. Scale up if needed
kubectl scale deployment monad-synapse-blue --replicas=5 -n production

# 4. Rollback if recent deployment
./scripts/rollback.sh rollback-blue-green --environment production --force
```

#### Database Connection Issues
```bash
# Check database pod (if in cluster)
kubectl get pods -n production -l app=postgresql

# Test connectivity from app pod
kubectl exec -it <app-pod> -n production -- \
  nc -zv <database-host> 5432

# Check connection pool
kubectl logs <app-pod> -n production | grep -i "connection\|pool\|database"

# Restart app to reset connections
kubectl rollout restart deployment/monad-synapse-blue -n production
```

#### High Memory Usage
```bash
# Check memory usage
kubectl top pods -n production

# Get detailed memory stats
kubectl exec <pod-name> -n production -- cat /proc/meminfo

# Check for memory leaks in app
kubectl logs <pod-name> -n production | grep -i "memory\|heap\|gc"

# Restart pod if necessary
kubectl delete pod <pod-name> -n production

# Scale out to distribute load
kubectl scale deployment monad-synapse-blue --replicas=4 -n production
```

#### SSL Certificate Issues
```bash
# Check certificate expiration
echo | openssl s_client -connect monad-synapse.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check ingress TLS configuration
kubectl describe ingress monad-synapse-prod-ingress -n production

# Renew certificate (if using cert-manager)
kubectl delete certificate monad-synapse-prod-tls -n production
kubectl get certificate -n production -w
```

## Maintenance Procedures

### Planned Maintenance

#### Pre-Maintenance Checklist
- [ ] Schedule announced to users (24-48 hours advance)
- [ ] Backups verified and tested
- [ ] Rollback plan prepared and tested
- [ ] Team notifications sent
- [ ] Change approval obtained (for production)

#### Maintenance Window Process
1. **Enable maintenance mode**
   ```bash
   kubectl patch configmap monad-synapse-config -n production \
     -p '{"data":{"MAINTENANCE_MODE":"true"}}'
   
   kubectl rollout restart deployment/monad-synapse-blue -n production
   kubectl rollout restart deployment/monad-synapse-green -n production
   ```

2. **Perform maintenance tasks**
3. **Verify systems** after maintenance
4. **Disable maintenance mode**
   ```bash
   kubectl patch configmap monad-synapse-config -n production \
     -p '{"data":{"MAINTENANCE_MODE":"false"}}'
   
   kubectl rollout restart deployment/monad-synapse-blue -n production
   kubectl rollout restart deployment/monad-synapse-green -n production
   ```

### Regular Maintenance Tasks

#### Daily
- [ ] Check system health dashboards
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Monitor key business metrics

#### Weekly
- [ ] Review capacity trends
- [ ] Update security patches
- [ ] Clean up old logs and data
- [ ] Review and rotate secrets

#### Monthly
- [ ] Performance optimization review
- [ ] Security vulnerability assessment
- [ ] Disaster recovery testing
- [ ] Documentation updates

#### Quarterly
- [ ] Full security audit
- [ ] Capacity planning review
- [ ] SLA/SLO review and updates
- [ ] Team training on new procedures

## Performance Tuning

### Application Performance

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';

-- Analyze table statistics
ANALYZE VERBOSE table_name;
```

#### Cache Optimization
```bash
# Check Redis hit rate
kubectl exec redis-pod -n production -- redis-cli info stats | grep hit_rate

# Monitor cache memory usage
kubectl exec redis-pod -n production -- redis-cli info memory

# Check for hot keys
kubectl exec redis-pod -n production -- redis-cli --hotkeys
```

#### Application Tuning
- **Node.js Memory**: Adjust `--max-old-space-size` if needed
- **Connection Pools**: Optimize database and Redis connection pools
- **Caching Strategy**: Review cache TTL and invalidation strategies
- **Resource Limits**: Adjust Kubernetes resource requests/limits

### Infrastructure Performance

#### Kubernetes Optimization
```bash
# Check node resource usage
kubectl top nodes

# Review pod resource usage vs limits
kubectl top pods -n production --containers

# Optimize HPA settings
kubectl get hpa -n production
kubectl describe hpa monad-synapse-blue-hpa -n production
```

#### Network Performance
```bash
# Test network latency between pods
kubectl run netshoot --rm -i --tty --image nicolaka/netshoot -- /bin/bash

# Check service mesh performance (if using Istio/Linkerd)
kubectl exec -it <pod> -n production -- curl -o /dev/null -s -w "%{time_total}\n" http://service-url
```

## Security Operations

### Security Monitoring

#### Key Security Metrics
- Authentication failure rate
- Suspicious activity detection
- Failed authorization attempts
- Unusual betting patterns
- Blockchain transaction anomalies

#### Security Log Analysis
```bash
# Check for authentication failures
kubectl logs -n production -l app.kubernetes.io/name=monad-synapse --since=1h | \
  grep -i "authentication failed\|invalid credentials\|unauthorized"

# Monitor for suspicious activity
kubectl logs -n production -l app.kubernetes.io/name=monad-synapse --since=1h | \
  grep -i "suspicious\|blocked\|rate limit"
```

### Security Incident Response

#### Suspected Breach
1. **Immediately isolate** affected systems
2. **Preserve evidence** (logs, memory dumps)
3. **Notify security team** and stakeholders
4. **Begin forensic analysis**
5. **Implement containment measures**

#### DDoS Attack
```bash
# Enable rate limiting
kubectl patch ingress monad-synapse-prod-ingress -n production \
  --type='merge' -p='{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/rate-limit-connections":"10"}}}'

# Scale up infrastructure
kubectl scale deployment monad-synapse-blue --replicas=10 -n production

# Monitor attack patterns
kubectl logs -f nginx-controller-pod -n ingress-nginx | grep -E "rate|limit|block"
```

### Security Hardening

#### Regular Security Tasks
- Update and patch all systems
- Rotate secrets and API keys
- Review access controls and permissions
- Scan for vulnerabilities
- Monitor for security advisories

#### Access Review
```bash
# Check Kubernetes RBAC
kubectl get rolebindings,clusterrolebindings -A -o wide

# Review service accounts
kubectl get serviceaccounts -A

# Check for privileged containers
kubectl get pods -A -o jsonpath='{.items[*].spec.securityContext.privileged}' | grep true
```

## Backup and Recovery

### Backup Procedures

#### Database Backup
```bash
# Create manual backup
kubectl run --rm -i db-backup --image=postgres:15-alpine --restart=Never -- \
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup verification
kubectl run --rm -i backup-verify --image=postgres:15-alpine --restart=Never -- \
  pg_restore --list backup_file.sql
```

#### Application State Backup
```bash
# Backup persistent volumes
kubectl get pv,pvc -n production

# Create volume snapshots (cloud provider specific)
# AWS EBS snapshots, GCP persistent disk snapshots, etc.
```

### Recovery Procedures

#### Database Recovery
```bash
# Point-in-time recovery
kubectl run --rm -i db-restore --image=postgres:15-alpine --restart=Never -- \
  pg_restore -d $DATABASE_URL backup_file.sql

# Verify data integrity after restore
kubectl run --rm -i db-test --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM critical_table;"
```

#### Application Recovery
```bash
# Restore from previous deployment
kubectl rollout undo deployment/monad-synapse-blue -n production

# Restore configuration
kubectl apply -f k8s/production/configmap-backup.yaml

# Verify application functionality
curl -f https://monad-synapse.com/api/health?detailed=true
```

### Disaster Recovery

#### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 1 hour
- **Recovery Point Objective (RPO)**: 5 minutes

#### DR Activation Steps
1. **Assess disaster scope** and impact
2. **Activate DR site** if necessary
3. **Restore data** from backups
4. **Update DNS** to point to DR site
5. **Verify functionality** before declaring service restored
6. **Communicate status** to stakeholders

## Scaling Operations

### Horizontal Scaling

#### Application Scaling
```bash
# Scale up during high traffic
kubectl scale deployment monad-synapse-blue --replicas=8 -n production

# Check HPA status
kubectl get hpa -n production
kubectl describe hpa monad-synapse-blue-hpa -n production

# Update HPA settings
kubectl patch hpa monad-synapse-blue-hpa -n production \
  -p '{"spec":{"maxReplicas":15}}'
```

#### Database Scaling
- **Read Replicas**: Add read-only replicas for read-heavy workloads
- **Connection Pooling**: Optimize connection pool settings
- **Query Optimization**: Review and optimize slow queries

### Vertical Scaling

#### Resource Adjustment
```bash
# Update resource limits
kubectl patch deployment monad-synapse-blue -n production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"monad-synapse","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'

# Monitor resource usage after scaling
kubectl top pods -n production --containers
```

### Auto-Scaling Configuration

#### HPA Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: monad-synapse-blue-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: monad-synapse-blue
  minReplicas: 3
  maxReplicas: 20
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

#### VPA Configuration (if using Vertical Pod Autoscaler)
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: monad-synapse-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: monad-synapse-blue
  updatePolicy:
    updateMode: "Auto"
```

---

This runbook should be regularly updated as the system evolves. Team members should be trained on these procedures and regular drills should be conducted to ensure readiness for operational scenarios.

**Document Version**: 1.0  
**Last Updated**: December 2023  
**Review Schedule**: Monthly  
**Owner**: DevOps Team