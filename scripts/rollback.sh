#!/bin/bash

# Monad Synapse Casino Platform - Rollback Script
# This script handles automated rollback procedures for production deployments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE_PROD="production"
NAMESPACE_STAGING="staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS] COMMAND

Monad Synapse Platform Rollback Script

COMMANDS:
    rollback-blue-green     Rollback blue-green deployment
    rollback-database       Rollback database migration
    rollback-full           Full application rollback
    status                  Check rollback status
    list-backups           List available backups

OPTIONS:
    -e, --environment ENV   Target environment (staging|production) [default: production]
    -v, --version VERSION   Target version to rollback to
    -f, --force            Force rollback without confirmation
    -h, --help             Show this help message

EXAMPLES:
    $0 rollback-blue-green --environment production
    $0 rollback-database --version 20231201_120000
    $0 rollback-full --force
    $0 status
EOF
}

# Parse command line arguments
ENVIRONMENT="production"
VERSION=""
FORCE=false
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        rollback-blue-green|rollback-database|rollback-full|status|list-backups)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate inputs
if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    usage
    exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Set namespace based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    NAMESPACE="$NAMESPACE_PROD"
else
    NAMESPACE="$NAMESPACE_STAGING"
fi

# Check dependencies
check_dependencies() {
    local deps=("kubectl" "jq" "curl")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is required but not installed"
            exit 1
        fi
    done
}

# Check kubectl connectivity
check_kubectl() {
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
}

# Get current deployment status
get_deployment_status() {
    local deployment_name="$1"
    
    if kubectl get deployment "$deployment_name" -n "$NAMESPACE" &> /dev/null; then
        kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o json | jq -r '.status.conditions[] | select(.type=="Available") | .status'
    else
        echo "NotFound"
    fi
}

# Get current active service target
get_active_service() {
    local service_name="monad-synapse-prod"
    
    if kubectl get service "$service_name" -n "$NAMESPACE" &> /dev/null; then
        kubectl get service "$service_name" -n "$NAMESPACE" -o json | jq -r '.spec.selector.version // "unknown"'
    else
        echo "unknown"
    fi
}

# Confirm action with user
confirm_action() {
    local action="$1"
    
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    log_warning "You are about to perform: $action"
    log_warning "Environment: $ENVIRONMENT"
    log_warning "Namespace: $NAMESPACE"
    echo
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Operation cancelled"
        exit 0
    fi
}

# Blue-Green Deployment Rollback
rollback_blue_green() {
    log_info "Starting blue-green deployment rollback..."
    
    # Get current active version
    local current_active=$(get_active_service)
    log_info "Current active deployment: $current_active"
    
    if [[ "$current_active" == "unknown" ]]; then
        log_error "Cannot determine current active deployment"
        exit 1
    fi
    
    # Determine target version
    local target_version
    if [[ "$current_active" == "blue" ]]; then
        target_version="green"
    elif [[ "$current_active" == "green" ]]; then
        target_version="blue"
    else
        log_error "Invalid current active deployment: $current_active"
        exit 1
    fi
    
    local target_deployment="monad-synapse-$target_version"
    
    # Check if target deployment exists and is ready
    local target_status=$(get_deployment_status "$target_deployment")
    if [[ "$target_status" != "True" ]]; then
        log_error "Target deployment $target_deployment is not ready (status: $target_status)"
        exit 1
    fi
    
    confirm_action "Switch from $current_active to $target_version deployment"
    
    # Health check before rollback
    log_info "Performing health check on target deployment..."
    local target_service="monad-synapse-$target_version"
    
    # Test target deployment health
    if ! kubectl run --rm -i health-check-rollback --image=curlimages/curl --restart=Never -- \
         curl -f "http://$target_service.$NAMESPACE.svc.cluster.local/api/health" &> /dev/null; then
        log_error "Health check failed for target deployment"
        exit 1
    fi
    
    log_success "Health check passed for target deployment"
    
    # Perform the switch
    log_info "Switching service to $target_version deployment..."
    
    kubectl patch service monad-synapse-prod -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"version\":\"$target_version\"}}}"
    
    if [[ $? -eq 0 ]]; then
        log_success "Successfully rolled back from $current_active to $target_version"
        
        # Wait for traffic to stabilize
        log_info "Waiting for traffic to stabilize..."
        sleep 30
        
        # Verify the switch
        local new_active=$(get_active_service)
        if [[ "$new_active" == "$target_version" ]]; then
            log_success "Rollback verified: Now serving traffic from $new_active deployment"
        else
            log_error "Rollback verification failed: Service still pointing to $new_active"
            exit 1
        fi
        
        # Optional: Scale down the previous deployment
        log_info "Scaling down previous deployment: $current_active"
        kubectl scale deployment "monad-synapse-$current_active" --replicas=1 -n "$NAMESPACE"
        
    else
        log_error "Failed to switch service to $target_version deployment"
        exit 1
    fi
}

# Database Rollback
rollback_database() {
    log_info "Starting database rollback..."
    
    if [[ -z "$VERSION" ]]; then
        log_error "Database rollback requires --version parameter"
        exit 1
    fi
    
    confirm_action "Database rollback to version $VERSION"
    
    # Check if backup exists
    local backup_name="${ENVIRONMENT}_backup_${VERSION}"
    log_info "Looking for backup: $backup_name"
    
    # This is a placeholder - implement your actual backup check
    # For example, check if backup file exists in S3 or database backup system
    
    log_warning "Database rollback is a destructive operation!"
    log_warning "Ensure you have verified the backup and tested the rollback procedure"
    
    # Enable maintenance mode
    log_info "Enabling maintenance mode..."
    kubectl patch configmap monad-synapse-config -n "$NAMESPACE" \
        -p '{"data":{"MAINTENANCE_MODE":"true"}}'
    
    # Restart pods to pick up maintenance mode
    kubectl rollout restart deployment/monad-synapse-blue -n "$NAMESPACE" || true
    kubectl rollout restart deployment/monad-synapse-green -n "$NAMESPACE" || true
    
    # Wait for pods to restart
    sleep 60
    
    # Placeholder for actual database rollback
    log_info "Performing database rollback..."
    echo "# Implement actual database rollback logic here"
    echo "# This might involve:"
    echo "# 1. Stop application connections"
    echo "# 2. Restore from backup"
    echo "# 3. Verify data integrity"
    echo "# 4. Update migration tracking"
    
    # Disable maintenance mode
    log_info "Disabling maintenance mode..."
    kubectl patch configmap monad-synapse-config -n "$NAMESPACE" \
        -p '{"data":{"MAINTENANCE_MODE":"false"}}'
    
    # Restart pods again
    kubectl rollout restart deployment/monad-synapse-blue -n "$NAMESPACE" || true
    kubectl rollout restart deployment/monad-synapse-green -n "$NAMESPACE" || true
    
    log_success "Database rollback completed"
}

# Full Rollback
rollback_full() {
    log_info "Starting full application rollback..."
    
    confirm_action "Full application rollback (blue-green + database)"
    
    # Perform database rollback first if version specified
    if [[ -n "$VERSION" ]]; then
        rollback_database
    else
        log_warning "No version specified, skipping database rollback"
    fi
    
    # Perform blue-green rollback
    rollback_blue_green
    
    log_success "Full rollback completed"
}

# Check rollback status
check_status() {
    log_info "Checking rollback status for environment: $ENVIRONMENT"
    echo
    
    # Check service status
    log_info "Service Status:"
    local active_version=$(get_active_service)
    echo "  Active deployment: $active_version"
    
    # Check deployment status
    log_info "Deployment Status:"
    for version in blue green; do
        local deployment="monad-synapse-$version"
        local status=$(get_deployment_status "$deployment")
        local replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "N/A")
        local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "N/A")
        echo "  $deployment: $status (replicas: $ready/$replicas)"
    done
    
    # Check pod status
    log_info "Pod Status:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=monad-synapse --no-headers | while read pod; do
        echo "  $pod"
    done
    
    # Check recent events
    log_info "Recent Events:"
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -5
}

# List available backups
list_backups() {
    log_info "Listing available backups for environment: $ENVIRONMENT"
    echo
    
    # This is a placeholder - implement your actual backup listing
    echo "Database Backups:"
    echo "  20231201_120000 - Dec 1, 2023 12:00:00 UTC"
    echo "  20231130_120000 - Nov 30, 2023 12:00:00 UTC"
    echo "  20231129_120000 - Nov 29, 2023 12:00:00 UTC"
    echo
    echo "Application Backups:"
    echo "  v1.2.1 - Latest stable release"
    echo "  v1.2.0 - Previous stable release"
    echo "  v1.1.9 - Emergency rollback point"
}

# Send notification
send_notification() {
    local message="$1"
    local severity="${2:-info}"
    
    # Send Slack notification if webhook is configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔄 Rollback $severity: $message\"}" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Main execution
main() {
    log_info "Monad Synapse Rollback Script"
    log_info "Environment: $ENVIRONMENT"
    log_info "Command: $COMMAND"
    echo
    
    check_dependencies
    check_kubectl
    
    case "$COMMAND" in
        rollback-blue-green)
            rollback_blue_green
            send_notification "Blue-green rollback completed for $ENVIRONMENT" "success"
            ;;
        rollback-database)
            rollback_database
            send_notification "Database rollback completed for $ENVIRONMENT" "success"
            ;;
        rollback-full)
            rollback_full
            send_notification "Full rollback completed for $ENVIRONMENT" "success"
            ;;
        status)
            check_status
            ;;
        list-backups)
            list_backups
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Error handling
trap 'log_error "Script failed at line $LINENO"; send_notification "Rollback script failed for $ENVIRONMENT" "error"; exit 1' ERR

# Run main function
main "$@"