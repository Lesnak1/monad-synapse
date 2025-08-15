# Cloudflare DNS and Security Configuration

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Configure Cloudflare provider
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Get zone information
data "cloudflare_zone" "main" {
  zone_id = var.cloudflare_zone_id
}

# DNS Records
resource "cloudflare_record" "main" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "production" ? "@" : var.environment
  value   = aws_lb.main.dns_name
  type    = "CNAME"
  proxied = true
  comment = "Main application ${var.environment} environment"

  depends_on = [aws_lb.main]
}

resource "cloudflare_record" "www" {
  count   = var.environment == "production" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = var.domain_name
  type    = "CNAME"
  proxied = true
  comment = "WWW redirect for production"
}

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "production" ? "api" : "api-${var.environment}"
  value   = aws_lb.main.dns_name
  type    = "CNAME"
  proxied = true
  comment = "API endpoint ${var.environment} environment"

  depends_on = [aws_lb.main]
}

# Page Rules for performance and security
resource "cloudflare_page_rule" "api_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "${var.environment == "production" ? "api" : "api-${var.environment}"}.${data.cloudflare_zone.main.name}/api/*"
  priority = 1

  actions {
    cache_level = "bypass"
    ssl         = "full"
  }
}

resource "cloudflare_page_rule" "static_assets" {
  zone_id  = var.cloudflare_zone_id
  target   = "${var.environment == "production" ? "" : "${var.environment}."}${data.cloudflare_zone.main.name}/_next/static/*"
  priority = 2

  actions {
    cache_level                = "cache_everything"
    edge_cache_ttl            = 31536000  # 1 year
    browser_cache_ttl         = 31536000  # 1 year
    bypass_cache_on_cookie    = false
    ssl                       = "full"
  }
}

resource "cloudflare_page_rule" "images_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "${var.environment == "production" ? "" : "${var.environment}."}${data.cloudflare_zone.main.name}/*.{jpg,jpeg,png,gif,ico,svg,webp}"
  priority = 3

  actions {
    cache_level       = "cache_everything"
    edge_cache_ttl   = 2592000   # 30 days
    browser_cache_ttl = 2592000   # 30 days
    ssl              = "full"
  }
}

# Security settings
resource "cloudflare_zone_settings_override" "main" {
  zone_id = var.cloudflare_zone_id

  settings {
    # SSL/TLS settings
    ssl                      = "full"
    always_use_https        = "on"
    min_tls_version         = "1.2"
    automatic_https_rewrites = "on"
    tls_1_3                 = "zrt"

    # Security settings
    security_level          = var.environment == "production" ? "medium" : "low"
    challenge_ttl          = 1800
    browser_check          = "on"
    hotlink_protection     = "on"
    email_obfuscation      = "on"
    server_side_exclude    = "on"
    
    # Performance settings
    brotli                 = "on"
    minify {
      css  = "on"
      js   = "on"
      html = "on"
    }
    rocket_loader          = "off"  # Can interfere with React apps
    
    # Caching settings
    browser_cache_ttl      = 14400  # 4 hours
    always_online          = "on"
    development_mode       = var.environment == "production" ? "off" : "on"
    
    # Network settings
    http3                  = "on"
    zero_rtt               = "on"
    ipv6                   = "on"
    websockets            = "on"
    
    # Mobile settings
    mobile_redirect {
      status           = "off"
    }
  }
}

# WAF Rules
resource "cloudflare_ruleset" "waf_custom_rules" {
  zone_id     = var.cloudflare_zone_id
  name        = "Monad Synapse Casino WAF Rules"
  description = "Custom WAF rules for casino platform"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "block"
    description = "Block known bot attacks"
    enabled     = true
    expression  = "(http.user_agent contains \"sqlmap\" or http.user_agent contains \"nikto\" or http.user_agent contains \"nmap\")"
  }

  rules {
    action      = "block"
    description = "Block suspicious API patterns"
    enabled     = true
    expression  = "(http.request.uri.path contains \"/api/\" and http.request.method eq \"POST\" and rate(5m) > 100)"
  }

  rules {
    action      = "challenge"
    description = "Challenge high-frequency requests"
    enabled     = true
    expression  = "(rate(1m) > 60)"
  }

  rules {
    action      = "block"
    description = "Block cryptocurrency mining patterns"
    enabled     = true
    expression  = "(http.user_agent contains \"coinhive\" or http.user_agent contains \"cryptonight\" or http.request.uri.path contains \"mining\")"
  }

  rules {
    action      = "js_challenge"
    description = "JavaScript challenge for suspicious countries"
    enabled     = var.environment == "production"
    expression  = "(ip.geoip.country in {\"CN\" \"RU\" \"KP\" \"IR\"})"
  }
}

# Rate Limiting Rules
resource "cloudflare_rate_limit" "api_login" {
  zone_id   = var.cloudflare_zone_id
  threshold = 5
  period    = 60
  match {
    request {
      url_pattern = "${var.environment == "production" ? "" : "${var.environment}."}${data.cloudflare_zone.main.name}/api/auth/login"
      schemes     = ["HTTPS"]
      methods     = ["POST"]
    }
  }
  action {
    mode    = "ban"
    timeout = 600  # 10 minutes
  }
  correlate {
    by = "nat"
  }
  disabled    = false
  description = "Limit login attempts"
}

resource "cloudflare_rate_limit" "api_game" {
  zone_id   = var.cloudflare_zone_id
  threshold = 30
  period    = 60
  match {
    request {
      url_pattern = "${var.environment == "production" ? "" : "${var.environment}."}${data.cloudflare_zone.main.name}/api/game/*"
      schemes     = ["HTTPS"]
      methods     = ["POST"]
    }
  }
  action {
    mode    = "simulate"  # Log only in non-production
    timeout = 300
  }
  correlate {
    by = "nat"
  }
  disabled    = var.environment != "production"
  description = "Limit game API calls"
}

resource "cloudflare_rate_limit" "general_api" {
  zone_id   = var.cloudflare_zone_id
  threshold = var.waf_rate_limit
  period    = 300  # 5 minutes
  match {
    request {
      url_pattern = "${var.environment == "production" ? "" : "${var.environment}."}${data.cloudflare_zone.main.name}/api/*"
      schemes     = ["HTTPS"]
    }
  }
  action {
    mode    = "challenge"
    timeout = 600
  }
  correlate {
    by = "nat"
  }
  disabled    = false
  description = "General API rate limiting"
}

# Bot Management (requires Pro plan or higher)
resource "cloudflare_bot_management" "main" {
  count   = var.environment == "production" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  
  enable_js             = true
  fight_mode           = true
  using_latest_model   = true
  optimize_wordpress   = false
  
  # Allow legitimate bots
  suppress_session_score = false
  
  # Enable machine learning detection
  auto_update_model = true
}

# Access Rules for specific IPs (if needed)
resource "cloudflare_access_rule" "office_ip" {
  count   = var.environment == "staging" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  mode    = "whitelist"
  configuration {
    target = "ip"
    value  = "YOUR_OFFICE_IP_HERE"  # Replace with actual office IP
  }
  notes = "Office IP whitelist for staging environment"
}

# Workers for advanced functionality (if needed)
resource "cloudflare_worker_script" "security_headers" {
  count   = var.environment == "production" ? 1 : 0
  name    = "monad-synapse-security-headers"
  content = file("${path.module}/workers/security-headers.js")
}

resource "cloudflare_worker_route" "security_headers" {
  count       = var.environment == "production" ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "${data.cloudflare_zone.main.name}/*"
  script_name = cloudflare_worker_script.security_headers[0].name
}

# Analytics and monitoring
resource "cloudflare_logpush_job" "http_requests" {
  count                = var.environment == "production" ? 1 : 0
  zone_id             = var.cloudflare_zone_id
  name                = "monad-synapse-http-logs"
  logpull_options     = "fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestURI,EdgeEndTimestamp,EdgeResponseBytes,EdgeResponseStatus,EdgeStartTimestamp,RayID&timestamps=rfc3339"
  destination_conf    = "s3://monad-synapse-cf-logs-${random_id.bucket_suffix.hex}?region=us-west-2"
  ownership_challenge = aws_s3_bucket_object.cloudflare_ownership.key
  enabled             = true
}

# S3 bucket for Cloudflare logs (if enabled)
resource "aws_s3_bucket" "cloudflare_logs" {
  count         = var.environment == "production" ? 1 : 0
  bucket        = "monad-synapse-cf-logs-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = merge(local.common_tags, {
    Name = "cloudflare-logs"
  })
}

resource "aws_s3_bucket_object" "cloudflare_ownership" {
  count  = var.environment == "production" ? 1 : 0
  bucket = aws_s3_bucket.cloudflare_logs[0].id
  key    = "ownership-challenge.txt"
  content = random_id.cf_ownership.hex
}

resource "random_id" "cf_ownership" {
  byte_length = 32
}

# Outputs
output "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  value       = var.cloudflare_zone_id
}

output "domain_name" {
  description = "Primary domain name"
  value       = var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"
}

output "api_domain" {
  description = "API domain name"
  value       = var.environment == "production" ? "api.${var.domain_name}" : "api-${var.environment}.${var.domain_name}"
}

output "cloudflare_dns_status" {
  description = "Cloudflare DNS configuration status"
  value = {
    main_record = cloudflare_record.main.hostname
    api_record  = cloudflare_record.api.hostname
    ssl_mode    = cloudflare_zone_settings_override.main.settings[0].ssl
    security_level = cloudflare_zone_settings_override.main.settings[0].security_level
  }
}