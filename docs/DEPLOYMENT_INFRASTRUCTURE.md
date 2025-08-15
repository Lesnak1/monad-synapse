# Deployment Configuration and Infrastructure Guide

This document provides comprehensive guidance for deploying the Monad Synapse Casino Platform infrastructure.

## 🏗️ Infrastructure Overview

The platform uses a modern, scalable cloud-native architecture:

- **AWS EKS** - Kubernetes orchestration
- **RDS PostgreSQL** - Primary database
- **ElastiCache Redis** - Caching and session storage
- **Application Load Balancer** - Traffic distribution
- **Cloudflare** - DNS, CDN, and security
- **Docker** - Containerization
- **Terraform** - Infrastructure as Code

## 📋 Prerequisites

### Required Tools
- [Terraform](https://terraform.io) >= 1.0
- [kubectl](https://kubernetes.io/docs/tasks/tools/) >= 1.28
- [AWS CLI](https://aws.amazon.com/cli/) >= 2.0
- [Docker](https://docker.com) >= 20.0
- [Helm](https://helm.sh) >= 3.0

### AWS Permissions
Your AWS credentials need the following services:
- EC2 (VPC, Security Groups, Load Balancers)
- EKS (Cluster management)
- RDS (Database instances)
- ElastiCache (Redis clusters)
- IAM (Roles and policies)
- CloudWatch (Monitoring)
- S3 (Storage)
- Route53 (Optional DNS)
- WAF (Security)
- Secrets Manager (Credential storage)

## 🚀 Deployment Steps

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd monad-synapse

# Set up environment variables
cp .env.example .env
# Edit .env with your specific values
```

### 2. Configure Terraform Variables

Create environment-specific variable files:

```bash
# For staging
cp infrastructure/terraform/environments/staging.tfvars.example \
   infrastructure/terraform/environments/staging.tfvars

# For production  
cp infrastructure/terraform/environments/production.tfvars.example \
   infrastructure/terraform/environments/production.tfvars
```

Edit the files with your specific configuration:

```hcl
# Example production.tfvars
environment = "production"
aws_region = "us-west-2"
domain_name = "yourdomain.com"

# Database
db_instance_class = "db.r6g.xlarge"
db_allocated_storage = 100

# EKS
min_nodes = 3
max_nodes = 10
node_group_instance_types = ["m5.large", "m5.xlarge"]
```

### 3. Set Environment Variables

```bash
export AWS_REGION="us-west-2"
export TF_VAR_db_password="your-secure-db-password"
export TF_VAR_redis_auth_token="your-redis-auth-token"
export TF_VAR_cloudflare_api_token="your-cloudflare-token"
export TF_VAR_cloudflare_zone_id="your-cloudflare-zone-id"
export TF_VAR_monitoring_email="alerts@yourdomain.com"
export TF_VAR_slack_webhook_url="your-slack-webhook"
```

### 4. Initialize and Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan the deployment (staging)
terraform plan -var-file="environments/staging.tfvars"

# Apply the infrastructure (staging)
terraform apply -var-file="environments/staging.tfvars"

# For production
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"
```

### 5. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name monad-synapse-casino-production

# Verify connection
kubectl get nodes
```

### 6. Deploy Application

```bash
# Apply Kubernetes configurations
kubectl apply -f k8s/base/
kubectl apply -f k8s/production/  # or k8s/staging/

# Verify deployment
kubectl get pods -n monad-synapse
kubectl get services -n monad-synapse
```

## 🔒 Security Configuration

### 1. Secrets Management

```bash
# Create secrets in Kubernetes
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  -n monad-synapse

# Or use AWS Secrets Manager (recommended)
aws secretsmanager create-secret \
  --name "monad-synapse/production/database" \
  --secret-string '{"username":"admin","password":"secure-password"}'
```

### 2. SSL Certificate

```bash
# Request SSL certificate via AWS Certificate Manager
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region us-west-2
```

### 3. WAF Configuration

The WAF is automatically configured via Terraform with:
- Rate limiting (2000 requests/5min)
- SQL injection protection
- XSS protection
- Bot control
- Gaming-specific rules

## 📊 Monitoring Setup

### 1. Prometheus and Grafana

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values k8s/monitoring/grafana-values.yml
```

### 2. Application Monitoring

```bash
# Deploy custom monitoring
kubectl apply -f k8s/monitoring/

# Access Grafana dashboard
kubectl port-forward svc/grafana 3000:80 -n monitoring
# Open http://localhost:3000
```

## 🗄️ Database Setup

### 1. Migration

```bash
# Run database migrations
kubectl apply -f k8s/jobs/db-migration.yml

# Verify migration
kubectl logs -f job/db-migration -n monad-synapse
```

### 2. Backup Configuration

```bash
# Set up automated backups
aws rds modify-db-instance \
  --db-instance-identifier monad-synapse-production-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"
```

## 🌐 DNS and CDN Setup

### 1. Cloudflare Configuration

The Terraform configuration automatically sets up:
- DNS records (A, CNAME)
- SSL/TLS settings
- Security rules
- Caching rules
- Page rules for optimization

### 2. Manual DNS Setup (Alternative)

If not using Cloudflare automation:

```bash
# Get Load Balancer DNS name
kubectl get svc monad-synapse-alb -n monad-synapse

# Create DNS records:
# yourdomain.com -> ALB DNS name
# api.yourdomain.com -> ALB DNS name  
# www.yourdomain.com -> yourdomain.com
```

## 📱 Application Deployment

### 1. Build and Push Docker Image

```bash
# Build production image
docker build -f infrastructure/docker/Dockerfile -t monad-synapse:latest .

# Tag and push to registry
docker tag monad-synapse:latest your-registry/monad-synapse:v1.0.0
docker push your-registry/monad-synapse:v1.0.0
```

### 2. Deploy to Kubernetes

```bash
# Update image in deployment
kubectl set image deployment/monad-synapse-app \
  app=your-registry/monad-synapse:v1.0.0 \
  -n monad-synapse

# Verify deployment
kubectl rollout status deployment/monad-synapse-app -n monad-synapse
```

### 3. Health Checks

```bash
# Check application health
curl https://yourdomain.com/api/health/basic
curl https://yourdomain.com/api/health/detailed

# Check Kubernetes health
kubectl get pods -n monad-synapse
kubectl describe pod <pod-name> -n monad-synapse
```

## 🔄 CI/CD Integration

### 1. GitHub Actions

The repository includes comprehensive CI/CD workflows:
- `.github/workflows/ci-cd.yml` - Main pipeline
- `.github/workflows/security-scan.yml` - Security scanning
- `.github/workflows/dependency-updates.yml` - Automated updates

### 2. Required Secrets

Set these secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
KUBECONFIG_DATA
DB_PASSWORD
REDIS_AUTH_TOKEN
JWT_SECRET
API_KEY_SECRET
ENCRYPTION_KEY
SLACK_WEBHOOK_URL
```

## 🔧 Maintenance

### 1. Updates and Patches

```bash
# Update Kubernetes cluster
eksctl update cluster --name monad-synapse-casino-production --approve

# Update node groups
eksctl update nodegroup --cluster monad-synapse-casino-production --name worker-nodes

# Update application
kubectl set image deployment/monad-synapse-app app=new-image:tag -n monad-synapse
```

### 2. Backup and Restore

```bash
# Database backup
aws rds create-db-snapshot \
  --db-instance-identifier monad-synapse-production-db \
  --db-snapshot-identifier monad-synapse-backup-$(date +%Y%m%d)

# Redis backup
aws elasticache create-snapshot \
  --cache-cluster-id monad-synapse-production-redis \
  --snapshot-name monad-synapse-redis-backup-$(date +%Y%m%d)
```

### 3. Scaling

```bash
# Scale application
kubectl scale deployment monad-synapse-app --replicas=5 -n monad-synapse

# Scale cluster nodes
eksctl scale nodegroup --cluster monad-synapse-casino-production \
  --nodes 5 --nodes-max 10 --nodes-min 3 worker-nodes
```

## 🚨 Troubleshooting

### Common Issues

1. **Pod startup failures**
```bash
kubectl describe pod <pod-name> -n monad-synapse
kubectl logs <pod-name> -n monad-synapse --previous
```

2. **Database connectivity**
```bash
kubectl exec -it <app-pod> -n monad-synapse -- \
  psql postgresql://user:pass@host:5432/dbname
```

3. **Redis connectivity**
```bash
kubectl exec -it <app-pod> -n monad-synapse -- \
  redis-cli -h redis-host -p 6379 -a auth-token ping
```

4. **SSL/TLS issues**
```bash
# Check certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Performance Monitoring

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n monad-synapse

# Check application metrics
curl https://yourdomain.com/api/metrics
```

## 📚 Additional Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🆘 Support

For infrastructure issues:
1. Check the monitoring dashboards
2. Review application logs
3. Consult the troubleshooting guide
4. Contact the platform team

Remember to always test changes in staging before applying to production!