# Monitoring and Observability Infrastructure

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.project_name}-${local.environment}-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.monitoring_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.monitoring_email
}

resource "aws_sns_topic_subscription" "slack_alerts" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# CloudWatch Dashboards
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.project_name}-${local.environment}-main"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "RequestCount", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Application Load Balancer Metrics"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EKS", "cluster_failed_request_count", "cluster_name", aws_eks_cluster.main.name],
            [".", "cluster_request_total", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "EKS Cluster Metrics"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Database Metrics"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_replication_group.main.replication_group_id],
            [".", "CurrConnections", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Cache Metrics"
          view   = "timeSeries"
        }
      }
    ]
  })
}

# CloudWatch Alarms - Application Load Balancer
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  alarm_name          = "${local.project_name}-${local.environment}-alb-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "120"
  statistic           = "Average"
  threshold           = var.environment == "production" ? "1" : "2"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${local.project_name}-${local.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.environment == "production" ? "10" : "20"
  alarm_description   = "This metric monitors ALB 5XX errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = local.common_tags
}

# CloudWatch Alarms - RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${local.project_name}-${local.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "120"
  statistic           = "Average"
  threshold           = var.environment == "production" ? "80" : "90"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.project_name}-${local.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "120"
  statistic           = "Average"
  threshold           = var.environment == "production" ? "80" : "40"
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "${local.project_name}-${local.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000"  # 2GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = local.common_tags
}

# CloudWatch Alarms - ElastiCache
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.project_name}-${local.environment}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.replication_group_id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${local.project_name}-${local.environment}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "120"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.replication_group_id
  }

  tags = local.common_tags
}

# Application-specific Custom Metrics (for use with application monitoring)
resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/application/${local.project_name}-${local.environment}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# Custom metric filters for application logs
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "${local.project_name}-${local.environment}-error-count"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, request_id, ERROR]"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "MonadSynapse/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "critical_errors" {
  name           = "${local.project_name}-${local.environment}-critical-errors"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, request_id, CRITICAL]"

  metric_transformation {
    name      = "CriticalErrorCount"
    namespace = "MonadSynapse/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "game_transactions" {
  name           = "${local.project_name}-${local.environment}-game-transactions"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, request_id, INFO, \"Game transaction:\"]"

  metric_transformation {
    name      = "GameTransactionCount"
    namespace = "MonadSynapse/Application"
    value     = "1"
  }
}

# Alarms for custom application metrics
resource "aws_cloudwatch_metric_alarm" "application_errors" {
  alarm_name          = "${local.project_name}-${local.environment}-application-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "MonadSynapse/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.environment == "production" ? "10" : "20"
  alarm_description   = "This metric monitors application error count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "critical_application_errors" {
  alarm_name          = "${local.project_name}-${local.environment}-critical-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CriticalErrorCount"
  namespace           = "MonadSynapse/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors critical application errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# CloudWatch Synthetics for uptime monitoring
resource "aws_synthetics_canary" "uptime_check" {
  name                 = "${local.project_name}-${local.environment}-uptime"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics_artifacts.bucket}/"
  execution_role_arn   = aws_iam_role.synthetics_execution.arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file             = "synthetics-canary.zip"
  runtime_version      = "syn-nodejs-puppeteer-3.8"

  schedule {
    expression = "rate(5 minutes)"
  }

  run_config {
    timeout_in_seconds    = 60
    memory_in_mb         = 960
    active_tracing       = true
  }

  failure_retention_period = 30
  success_retention_period = 30

  tags = local.common_tags
}

# S3 bucket for synthetics artifacts
resource "aws_s3_bucket" "synthetics_artifacts" {
  bucket        = "${local.project_name}-${local.environment}-synthetics-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "production"

  tags = local.common_tags
}

resource "aws_s3_bucket_lifecycle_configuration" "synthetics_artifacts" {
  bucket = aws_s3_bucket.synthetics_artifacts.id

  rule {
    id     = "synthetics_artifacts_lifecycle"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# IAM role for synthetics execution
resource "aws_iam_role" "synthetics_execution" {
  name = "${local.project_name}-${local.environment}-synthetics-execution"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "synthetics_execution" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsExecutionRolePolicy"
  role       = aws_iam_role.synthetics_execution.name
}

# AWS X-Ray for distributed tracing
resource "aws_xray_sampling_rule" "main" {
  rule_name      = "${local.project_name}-${local.environment}"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  resource_arn   = "*"
  service_name   = "*"
  service_type   = "*"

  tags = local.common_tags
}

# EventBridge rules for monitoring system events
resource "aws_cloudwatch_event_rule" "rds_events" {
  name        = "${local.project_name}-${local.environment}-rds-events"
  description = "Capture RDS events"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail-type = ["RDS DB Instance Event", "RDS DB Cluster Event"]
    detail = {
      EventCategories = ["failure", "failover", "maintenance", "notification"]
    }
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "rds_events_sns" {
  rule      = aws_cloudwatch_event_rule.rds_events.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn
}

# System Manager Parameter Store for monitoring configuration
resource "aws_ssm_parameter" "monitoring_config" {
  name  = "/${local.project_name}/${local.environment}/monitoring/config"
  type  = "String"
  value = jsonencode({
    alert_email     = var.monitoring_email
    slack_webhook   = var.slack_webhook_url != "" ? "configured" : "not_configured"
    environment     = var.environment
    log_level       = var.environment == "production" ? "INFO" : "DEBUG"
    metrics_enabled = true
    tracing_enabled = true
  })

  tags = local.common_tags
}

# Outputs
output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "application_log_group" {
  description = "Application log group name"
  value       = aws_cloudwatch_log_group.application_logs.name
}

output "synthetics_canary_name" {
  description = "CloudWatch Synthetics canary name"
  value       = aws_synthetics_canary.uptime_check.name
}