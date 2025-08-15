# Variables for Monad Synapse Casino Platform Infrastructure

variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "casino_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "redis_auth_token" {
  description = "Redis authentication token"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "monadsynapse.com"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for DNS management"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for DNS management"
  type        = string
  sensitive   = true
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = false
}

variable "node_group_instance_types" {
  description = "Instance types for EKS node group"
  type        = list(string)
  default     = ["m5.large"]
}

variable "node_group_capacity_type" {
  description = "Capacity type for EKS node group (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"
  validation {
    condition     = contains(["ON_DEMAND", "SPOT"], var.node_group_capacity_type)
    error_message = "Capacity type must be either 'ON_DEMAND' or 'SPOT'."
  }
}

variable "min_nodes" {
  description = "Minimum number of nodes in the EKS cluster"
  type        = number
  default     = 1
}

variable "max_nodes" {
  description = "Maximum number of nodes in the EKS cluster"
  type        = number
  default     = 10
}

variable "desired_nodes" {
  description = "Desired number of nodes in the EKS cluster"
  type        = number
  default     = 3
}

variable "enable_alb_access_logs" {
  description = "Enable ALB access logs"
  type        = bool
  default     = true
}

variable "alb_log_retention_days" {
  description = "Number of days to retain ALB access logs"
  type        = number
  default     = 90
}

variable "enable_waf" {
  description = "Enable AWS WAF for application protection"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5-minute period)"
  type        = number
  default     = 2000
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "vpc_flow_logs_retention_days" {
  description = "Retention period for VPC Flow Logs"
  type        = number
  default     = 30
}

variable "enable_secrets_manager" {
  description = "Enable AWS Secrets Manager for sensitive data"
  type        = bool
  default     = true
}

variable "backup_schedule" {
  description = "Cron schedule for automated backups"
  type        = string
  default     = "cron(0 3 * * ? *)" # Daily at 3 AM UTC
}

variable "monitoring_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "AWS region for backup replication"
  type        = string
  default     = "us-east-1"
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 1
}

variable "enable_redis_multi_az" {
  description = "Enable Multi-AZ for Redis"
  type        = bool
  default     = false
}

variable "application_port" {
  description = "Port on which the application runs"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Health check path for the application"
  type        = string
  default     = "/api/health/basic"
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "healthy_threshold" {
  description = "Number of consecutive successful health checks"
  type        = number
  default     = 3
}

variable "unhealthy_threshold" {
  description = "Number of consecutive failed health checks"
  type        = number
  default     = 3
}

variable "enable_container_insights" {
  description = "Enable Container Insights for EKS"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 30
}

variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all storage services"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit for all network communications"
  type        = bool
  default     = true
}

variable "kms_key_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
}

variable "enable_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = false
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for RDS"
  type        = bool
  default     = true
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Environment-specific defaults
locals {
  environment_defaults = {
    staging = {
      db_instance_class          = "db.t3.medium"
      db_allocated_storage      = 20
      db_max_allocated_storage  = 100
      redis_node_type          = "cache.t3.micro"
      redis_num_cache_nodes    = 1
      node_group_instance_types = ["t3.medium"]
      min_nodes                = 1
      max_nodes                = 3
      desired_nodes            = 1
      enable_multi_az          = false
      enable_redis_multi_az    = false
      backup_retention_days    = 7
      log_retention_days       = 7
      enable_deletion_protection = false
      node_group_capacity_type = "SPOT"
    }
    production = {
      db_instance_class          = "db.r6g.xlarge"
      db_allocated_storage      = 100
      db_max_allocated_storage  = 1000
      redis_node_type          = "cache.r6g.large"
      redis_num_cache_nodes    = 3
      node_group_instance_types = ["m5.large", "m5.xlarge"]
      min_nodes                = 3
      max_nodes                = 10
      desired_nodes            = 3
      enable_multi_az          = true
      enable_redis_multi_az    = true
      backup_retention_days    = 30
      log_retention_days       = 30
      enable_deletion_protection = true
      node_group_capacity_type = "ON_DEMAND"
    }
  }
}