# Monad Synapse Casino Platform - Production Infrastructure
# Terraform configuration for scalable, secure deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "monad-synapse-terraform-state"
    key            = "production/terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Local variables
locals {
  project_name = "monad-synapse-casino"
  environment  = var.environment
  
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
    CreatedBy   = "devops"
    Component   = "infrastructure"
  }

  # Network configuration
  vpc_cidr = var.environment == "production" ? "10.0.0.0/16" : "10.1.0.0/16"
  
  availability_zones = data.aws_availability_zones.available.names
  
  # Kubernetes configuration
  k8s_cluster_name = "${local.project_name}-${local.environment}"
  k8s_version      = "1.28"
  
  # Database configuration
  db_instance_class = var.environment == "production" ? "db.r6g.xlarge" : "db.t3.medium"
  db_allocated_storage = var.environment == "production" ? 100 : 20
  
  # Application configuration
  app_min_replicas = var.environment == "production" ? 3 : 1
  app_max_replicas = var.environment == "production" ? 10 : 3
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-vpc"
    "kubernetes.io/cluster/${local.k8s_cluster_name}" = "shared"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-igw"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count = min(3, length(local.availability_zones))

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(local.vpc_cidr, 8, count.index)
  availability_zone       = local.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-public-${count.index + 1}"
    Type = "public"
    "kubernetes.io/cluster/${local.k8s_cluster_name}" = "shared"
    "kubernetes.io/role/elb" = "1"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count = min(3, length(local.availability_zones))

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(local.vpc_cidr, 8, count.index + 10)
  availability_zone = local.availability_zones[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-private-${count.index + 1}"
    Type = "private"
    "kubernetes.io/cluster/${local.k8s_cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

# Database Subnets
resource "aws_subnet" "database" {
  count = min(3, length(local.availability_zones))

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(local.vpc_cidr, 8, count.index + 20)
  availability_zone = local.availability_zones[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-db-${count.index + 1}"
    Type = "database"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = min(3, length(local.availability_zones))

  domain = "vpc"
  depends_on = [aws_internet_gateway.main]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-nat-eip-${count.index + 1}"
  })
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count = min(3, length(local.availability_zones))

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-nat-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.main]
}

# Route Tables - Public
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Tables - Private
resource "aws_route_table" "private" {
  count = length(aws_subnet.private)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-private-rt-${count.index + 1}"
  })
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Database Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.project_name}-${local.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-db-subnet-group"
  })
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "${local.project_name}-${local.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-alb-sg"
  })
}

resource "aws_security_group" "eks_cluster" {
  name        = "${local.project_name}-${local.environment}-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [local.vpc_cidr]
    description = "HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-eks-cluster-sg"
  })
}

resource "aws_security_group" "eks_nodes" {
  name        = "${local.project_name}-${local.environment}-eks-nodes-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
    description = "Node to node communication"
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "Cluster to node communication"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-eks-nodes-sg"
  })
}

resource "aws_security_group" "rds" {
  name        = "${local.project_name}-${local.environment}-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "PostgreSQL from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-rds-sg"
  })
}

# IAM Role for EKS Cluster
resource "aws_iam_role" "eks_cluster" {
  name = "${local.project_name}-${local.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# IAM Role for EKS Node Group
resource "aws_iam_role" "eks_nodes" {
  name = "${local.project_name}-${local.environment}-eks-nodes-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = local.k8s_cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = local.k8s_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    security_group_ids      = [aws_security_group.eks_cluster.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks,
  ]

  tags = local.common_tags
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.k8s_cluster_name}/cluster"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = local.common_tags
}

# KMS Key for EKS Encryption
resource "aws_kms_key" "eks" {
  description = "EKS Secret Encryption Key for ${local.project_name}-${local.environment}"
  
  policy = jsonencode({
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow service-linked role use of the customer managed key"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/eks.amazonaws.com/AWSServiceRoleForAmazonEKS"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
    Version = "2012-10-17"
  })

  tags = local.common_tags
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.project_name}-${local.environment}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.project_name}-${local.environment}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id

  capacity_type  = var.environment == "production" ? "ON_DEMAND" : "SPOT"
  instance_types = var.environment == "production" ? ["m5.large", "m5.xlarge"] : ["t3.medium"]

  scaling_config {
    desired_size = var.environment == "production" ? 3 : 1
    max_size     = var.environment == "production" ? 10 : 3
    min_size     = var.environment == "production" ? 3 : 1
  }

  update_config {
    max_unavailable_percentage = 25
  }

  launch_template {
    name    = aws_launch_template.eks_nodes.name
    version = aws_launch_template.eks_nodes.latest_version
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = local.common_tags
}

# Launch Template for EKS Nodes
resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "${local.project_name}-${local.environment}-"
  image_id      = data.aws_ami.eks_worker.id
  instance_type = var.environment == "production" ? "m5.large" : "t3.medium"

  vpc_security_group_ids = [aws_security_group.eks_nodes.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    /etc/eks/bootstrap.sh ${aws_eks_cluster.main.name}
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.project_name}-${local.environment}-eks-node"
    })
  }
}

# Get the latest EKS optimized AMI
data "aws_ami" "eks_worker" {
  filter {
    name   = "name"
    values = ["amazon-eks-node-${local.k8s_version}-v*"]
  }

  most_recent = true
  owners      = ["602401143452"] # Amazon EKS AMI Account ID
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${local.project_name}-${local.environment}-db"

  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = local.db_instance_class
  allocated_storage   = local.db_allocated_storage
  max_allocated_storage = var.environment == "production" ? 1000 : 100

  db_name  = "monadsynapse"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn

  deletion_protection = var.environment == "production" ? true : false
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.project_name}-${local.environment}-final-snapshot" : null

  performance_insights_enabled = var.environment == "production"

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-db"
  })
}

# KMS Key for RDS Encryption
resource "aws_kms_key" "rds" {
  description = "RDS Encryption Key for ${local.project_name}-${local.environment}"
  
  tags = local.common_tags
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${local.project_name}-${local.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# ElastiCache Redis Cluster
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.project_name}-${local.environment}-cache-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = local.common_tags
}

resource "aws_security_group" "redis" {
  name        = "${local.project_name}-${local.environment}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "Redis from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${local.environment}-redis-sg"
  })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "${local.project_name}-${local.environment}-redis"
  description                  = "Redis cluster for ${local.project_name}-${local.environment}"
  
  port               = 6379
  parameter_group_name = "default.redis7"
  node_type          = var.environment == "production" ? "cache.r6g.large" : "cache.t3.micro"
  num_cache_clusters = var.environment == "production" ? 3 : 1

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"

  tags = local.common_tags
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${local.project_name}-${local.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb-logs"
    enabled = true
  }

  tags = local.common_tags
}

# S3 Bucket for ALB Access Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${local.project_name}-${local.environment}-alb-logs-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "production"

  tags = local.common_tags
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "alb_logs_lifecycle"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_elb_service_account.main.id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      }
    ]
    Version = "2012-10-17"
  })
}

data "aws_elb_service_account" "main" {}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/eks/${local.k8s_cluster_name}/application"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID"
  value       = aws_lb.main.zone_id
}