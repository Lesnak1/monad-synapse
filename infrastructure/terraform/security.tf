# Security Infrastructure Configuration

# AWS WAF v2
resource "aws_wafv2_web_acl" "main" {
  name  = "${local.project_name}-${local.environment}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          geo_match_statement {
            # Allow all countries for now, can be restricted later
            country_codes = ["US", "CA", "GB", "AU", "DE", "FR", "JP", "KR"]
          }
        }
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # SQL injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Cross-site scripting protection
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Bot control
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 4

    override_action {
      count {}  # Count mode for testing
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesBotControlRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Gaming-specific protection
  rule {
    name     = "GamingProtectionRule"
    priority = 5

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            search_string = "union select"
            field_to_match {
              body {}
            }
            text_transformation {
              priority = 1
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }

        statement {
          byte_match_statement {
            search_string = "script"
            field_to_match {
              all_query_arguments {}
            }
            text_transformation {
              priority = 1
              type     = "HTML_ENTITY_DECODE"
            }
            positional_constraint = "CONTAINS"
          }
        }

        statement {
          size_constraint_statement {
            field_to_match {
              body {}
            }
            comparison_operator = "GT"
            size                = 8192  # 8KB limit for request body
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GamingProtectionRule"
      sampled_requests_enabled   = true
    }
  }

  # IP whitelist for admin operations (if needed)
  rule {
    name     = "AdminIPWhitelist"
    priority = 6

    action {
      allow {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string = "/admin"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }

        statement {
          ip_set_reference_statement {
            arn = aws_wafv2_ip_set.admin_ips.arn
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AdminIPWhitelist"
      sampled_requests_enabled   = true
    }
  }

  tags = local.common_tags

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.project_name}-${local.environment}-waf"
    sampled_requests_enabled   = true
  }
}

# IP set for admin access (replace with actual admin IPs)
resource "aws_wafv2_ip_set" "admin_ips" {
  name               = "${local.project_name}-${local.environment}-admin-ips"
  description        = "IP addresses allowed for admin access"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = [
    "127.0.0.1/32",  # Replace with actual admin IPs
    # "203.0.113.0/24",  # Example: Office network
  ]

  tags = local.common_tags
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# AWS GuardDuty
resource "aws_guardduty_detector" "main" {
  count  = var.enable_guardduty ? 1 : 0
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }

  tags = local.common_tags
}

# GuardDuty findings notification
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  count       = var.enable_guardduty ? 1 : 0
  name        = "${local.project_name}-${local.environment}-guardduty-findings"
  description = "GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.0, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0]
    }
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  count     = var.enable_guardduty ? 1 : 0
  rule      = aws_cloudwatch_event_rule.guardduty_findings[0].name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn
}

# AWS Config for compliance monitoring
resource "aws_config_configuration_recorder" "main" {
  count    = var.enable_config ? 1 : 0
  name     = "${local.project_name}-${local.environment}-config"
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  depends_on = [aws_config_delivery_channel.main]
}

resource "aws_config_delivery_channel" "main" {
  count           = var.enable_config ? 1 : 0
  name            = "${local.project_name}-${local.environment}-config"
  s3_bucket_name  = aws_s3_bucket.config[0].bucket
  s3_key_prefix   = "config"
  sns_topic_arn   = aws_sns_topic.alerts.arn
}

resource "aws_s3_bucket" "config" {
  count         = var.enable_config ? 1 : 0
  bucket        = "${local.project_name}-${local.environment}-config-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "production"

  tags = local.common_tags
}

resource "aws_s3_bucket_policy" "config" {
  count  = var.enable_config ? 1 : 0
  bucket = aws_s3_bucket.config[0].id

  policy = jsonencode({
    Statement = [
      {
        Sid    = "AWSConfigBucketPermissionsCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketExistenceCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.config[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"     = "bucket-owner-full-control"
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
    Version = "2012-10-17"
  })
}

# IAM role for AWS Config
resource "aws_iam_role" "config" {
  count = var.enable_config ? 1 : 0
  name  = "${local.project_name}-${local.environment}-config-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "config.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "config" {
  count      = var.enable_config ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigServiceRolePolicy"
  role       = aws_iam_role.config[0].name
}

# AWS CloudTrail
resource "aws_cloudtrail" "main" {
  count                         = var.enable_cloudtrail ? 1 : 0
  name                          = "${local.project_name}-${local.environment}-cloudtrail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail[0].bucket
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.cloudtrail[0].arn}/*"]
    }

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["arn:aws:lambda:*"]
    }
  }

  tags = local.common_tags
}

resource "aws_s3_bucket" "cloudtrail" {
  count         = var.enable_cloudtrail ? 1 : 0
  bucket        = "${local.project_name}-${local.environment}-cloudtrail-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "production"

  tags = local.common_tags
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail[0].id

  policy = jsonencode({
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/${local.project_name}-${local.environment}-cloudtrail"
          }
        }
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"  = "bucket-owner-full-control"
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/${local.project_name}-${local.environment}-cloudtrail"
          }
        }
      }
    ]
    Version = "2012-10-17"
  })
}

# VPC Flow Logs
resource "aws_flow_log" "vpc" {
  count           = var.enable_vpc_flow_logs ? 1 : 0
  iam_role_arn    = aws_iam_role.flow_log[0].arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count             = var.enable_vpc_flow_logs ? 1 : 0
  name              = "/aws/vpc/flowlogs/${local.project_name}-${local.environment}"
  retention_in_days = var.vpc_flow_logs_retention_days

  tags = local.common_tags
}

resource "aws_iam_role" "flow_log" {
  count = var.enable_vpc_flow_logs ? 1 : 0
  name  = "${local.project_name}-${local.environment}-flow-log-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "flow_log" {
  count = var.enable_vpc_flow_logs ? 1 : 0
  name  = "${local.project_name}-${local.environment}-flow-log-policy"
  role  = aws_iam_role.flow_log[0].id

  policy = jsonencode({
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
    Version = "2012-10-17"
  })
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "db_credentials" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "${local.project_name}/${local.environment}/database/credentials"
  description = "Database credentials for ${local.project_name} ${local.environment}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.db_credentials[0].id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    engine   = "postgres"
    host     = aws_db_instance.main.endpoint
    port     = 5432
    dbname   = aws_db_instance.main.db_name
  })
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "${local.project_name}/${local.environment}/redis/credentials"
  description = "Redis credentials for ${local.project_name} ${local.environment}"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.redis_credentials[0].id
  secret_string = jsonencode({
    host      = aws_elasticache_replication_group.main.primary_endpoint_address
    port      = 6379
    auth_token = var.redis_auth_token
  })
}

# Security Group for Secrets Manager VPC endpoint
resource "aws_security_group" "secrets_manager_vpc_endpoint" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "${local.project_name}-${local.environment}-secrets-manager-vpc-endpoint-sg"
  description = "Security group for Secrets Manager VPC endpoint"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "HTTPS from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-secrets-manager-vpc-endpoint-sg"
  })
}

# VPC Endpoint for Secrets Manager (for secure access from EKS)
resource "aws_vpc_endpoint" "secrets_manager" {
  count              = var.enable_secrets_manager ? 1 : 0
  vpc_id             = aws_vpc.main.id
  service_name       = "com.amazonaws.${var.aws_region}.secretsmanager"
  route_table_ids    = aws_route_table.private[*].id
  policy             = null
  vpc_endpoint_type  = "Interface"
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.secrets_manager_vpc_endpoint[0].id]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-secrets-manager-vpc-endpoint"
  })
}

# Outputs
output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.main.arn
}

output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = var.enable_guardduty ? aws_guardduty_detector.main[0].id : null
}

output "config_recorder_name" {
  description = "AWS Config recorder name"
  value       = var.enable_config ? aws_config_configuration_recorder.main[0].name : null
}

output "cloudtrail_arn" {
  description = "CloudTrail ARN"
  value       = var.enable_cloudtrail ? aws_cloudtrail.main[0].arn : null
}

output "secrets_manager_db_secret_arn" {
  description = "Secrets Manager database secret ARN"
  value       = var.enable_secrets_manager ? aws_secretsmanager_secret.db_credentials[0].arn : null
  sensitive   = true
}

output "secrets_manager_redis_secret_arn" {
  description = "Secrets Manager Redis secret ARN"
  value       = var.enable_secrets_manager ? aws_secretsmanager_secret.redis_credentials[0].arn : null
  sensitive   = true
}