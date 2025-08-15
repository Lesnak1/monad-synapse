# Production Environment Configuration
# Monad Synapse Casino Platform

# Basic Configuration
environment = "production"
aws_region  = "us-west-2"

# Domain Configuration
domain_name = "monadsynapse.com"
# cloudflare_zone_id will be set via environment variable
# cloudflare_api_token will be set via environment variable

# Database Configuration
db_username = "casino_admin"
# db_password will be set via environment variable
db_instance_class = "db.r6g.xlarge"
db_allocated_storage = 100
db_max_allocated_storage = 1000
enable_multi_az = true
enable_point_in_time_recovery = true
backup_retention_days = 30

# Redis Configuration
redis_node_type = "cache.r6g.large"
redis_num_cache_nodes = 3
enable_redis_multi_az = true
enable_automatic_failover = true
# redis_auth_token will be set via environment variable

# EKS Configuration
node_group_instance_types = ["m5.large", "m5.xlarge"]
node_group_capacity_type = "ON_DEMAND"
min_nodes = 3
max_nodes = 10
desired_nodes = 3

# Security Configuration
enable_waf = true
waf_rate_limit = 2000
enable_guardduty = true
enable_config = true
enable_cloudtrail = true
enable_vpc_flow_logs = true
vpc_flow_logs_retention_days = 30
enable_secrets_manager = true
enable_deletion_protection = true

# SSL Configuration
# ssl_certificate_arn will be set via environment variable or AWS Certificate Manager

# Monitoring Configuration
# monitoring_email will be set via environment variable
# slack_webhook_url will be set via environment variable
enable_enhanced_monitoring = true
enable_performance_insights = true
log_retention_days = 30

# Backup Configuration
backup_schedule = "cron(0 3 * * ? *)"  # Daily at 3 AM UTC
enable_cross_region_backup = true
backup_region = "us-east-1"

# Application Configuration
application_port = 3000
health_check_path = "/api/health/basic"
health_check_interval = 30
health_check_timeout = 5
healthy_threshold = 3
unhealthy_threshold = 3

# Container and Kubernetes Configuration
enable_container_insights = true
enable_encryption_at_rest = true
enable_encryption_in_transit = true
kms_key_deletion_window = 30  # Longer deletion window for production

# Maintenance Configuration
maintenance_window = "sun:04:00-sun:05:00"
backup_window = "03:00-04:00"

# ALB Configuration
enable_alb_access_logs = true
alb_log_retention_days = 90

# Additional Security Tags
tags = {
  Environment = "production"
  Project     = "monad-synapse-casino"
  Owner       = "platform-team"
  CostCenter  = "engineering"
  Compliance  = "required"
  Backup      = "required"
  Monitoring  = "required"
  Security    = "high"
}