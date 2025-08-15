# Staging Environment Configuration
# Monad Synapse Casino Platform

# Basic Configuration
environment = "staging"
aws_region  = "us-west-2"

# Domain Configuration
domain_name = "monadsynapse.com"
# Will create staging.monadsynapse.com
# cloudflare_zone_id will be set via environment variable
# cloudflare_api_token will be set via environment variable

# Database Configuration
db_username = "casino_admin"
# db_password will be set via environment variable
db_instance_class = "db.t3.medium"
db_allocated_storage = 20
db_max_allocated_storage = 100
enable_multi_az = false
enable_point_in_time_recovery = true
backup_retention_days = 7

# Redis Configuration
redis_node_type = "cache.t3.micro"
redis_num_cache_nodes = 1
enable_redis_multi_az = false
enable_automatic_failover = false
# redis_auth_token will be set via environment variable

# EKS Configuration
node_group_instance_types = ["t3.medium"]
node_group_capacity_type = "SPOT"  # Use SPOT instances for cost savings in staging
min_nodes = 1
max_nodes = 3
desired_nodes = 1

# Security Configuration
enable_waf = true
waf_rate_limit = 1000  # Lower rate limit for staging
enable_guardduty = false  # Disable to save costs in staging
enable_config = false     # Disable to save costs in staging
enable_cloudtrail = false # Disable to save costs in staging
enable_vpc_flow_logs = false
vpc_flow_logs_retention_days = 7
enable_secrets_manager = true
enable_deletion_protection = false  # Allow easy cleanup in staging

# SSL Configuration
# ssl_certificate_arn will be set via environment variable or AWS Certificate Manager

# Monitoring Configuration
# monitoring_email will be set via environment variable
# slack_webhook_url will be set via environment variable
enable_enhanced_monitoring = false  # Disable to save costs in staging
enable_performance_insights = false  # Disable to save costs in staging
log_retention_days = 7

# Backup Configuration
backup_schedule = "cron(0 6 * * ? *)"  # Daily at 6 AM UTC (less critical timing)
enable_cross_region_backup = false
backup_region = "us-east-1"

# Application Configuration
application_port = 3000
health_check_path = "/api/health/basic"
health_check_interval = 30
health_check_timeout = 5
healthy_threshold = 2  # Faster health checks
unhealthy_threshold = 2

# Container and Kubernetes Configuration
enable_container_insights = false  # Disable to save costs in staging
enable_encryption_at_rest = true
enable_encryption_in_transit = true
kms_key_deletion_window = 7  # Shorter deletion window for staging

# Maintenance Configuration
maintenance_window = "sun:06:00-sun:07:00"
backup_window = "05:00-06:00"

# ALB Configuration
enable_alb_access_logs = true
alb_log_retention_days = 30

# Development-friendly settings
tags = {
  Environment = "staging"
  Project     = "monad-synapse-casino"
  Owner       = "development-team"
  CostCenter  = "engineering"
  Purpose     = "testing"
  AutoShutdown = "enabled"  # Can be used by cost optimization scripts
}