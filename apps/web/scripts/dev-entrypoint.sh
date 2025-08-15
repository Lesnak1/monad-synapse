#!/bin/bash

# Development entrypoint script for Monad Synapse Casino Platform
# This script sets up the development environment and starts the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎰 Starting Monad Synapse Casino Platform - Development Environment${NC}"

# Check if node_modules exists
if [ ! -d "/app/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci --include=dev
fi

# Create necessary directories
mkdir -p /app/.next /app/coverage /app/logs

# Set up git configuration for container (if needed)
if [ ! -f ~/.gitconfig ] && [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
    echo -e "${BLUE}🔧 Setting up git configuration...${NC}"
    git config --global user.name "$GIT_USER_NAME"
    git config --global user.email "$GIT_USER_EMAIL"
    git config --global init.defaultBranch main
fi

# Check for environment file
if [ ! -f "/app/.env.local" ] && [ -f "/app/.env.example" ]; then
    echo -e "${YELLOW}⚠️  No .env.local found, copying from .env.example${NC}"
    cp /app/.env.example /app/.env.local
    echo -e "${RED}🚨 Please configure your environment variables in .env.local${NC}"
fi

# Verify environment variables
echo -e "${BLUE}🔍 Checking environment configuration...${NC}"
required_vars=(
    "NODE_ENV"
    "NEXT_PUBLIC_APP_ENV"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables: ${missing_vars[*]}${NC}"
fi

# Run database migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    npm run migrate
fi

# Run initial build if requested
if [ "$INITIAL_BUILD" = "true" ]; then
    echo -e "${BLUE}🏗️  Running initial build...${NC}"
    npm run build
fi

# Start development tools
echo -e "${GREEN}🚀 Starting development server...${NC}"
echo -e "${BLUE}📋 Available commands:${NC}"
echo -e "  ${GREEN}npm run dev${NC}          - Start development server with hot reload"
echo -e "  ${GREEN}npm run build${NC}        - Build for production"
echo -e "  ${GREEN}npm run test${NC}         - Run test suite"
echo -e "  ${GREEN}npm run test:watch${NC}   - Run tests in watch mode"
echo -e "  ${GREEN}npm run lint${NC}         - Run linter"
echo -e "  ${GREEN}npm run typecheck${NC}    - Run type checking"
echo -e ""
echo -e "${BLUE}🌍 Application will be available at:${NC}"
echo -e "  ${GREEN}http://localhost:3000${NC}     - Main application"
echo -e "  ${GREEN}http://localhost:3000/api/health${NC} - Health check endpoint"
echo -e ""

# Function to handle shutdown
shutdown() {
    echo -e "\n${YELLOW}📤 Shutting down development environment...${NC}"
    # Kill any background processes
    jobs -p | xargs -r kill
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

# Set up signal handlers
trap 'shutdown' SIGTERM SIGINT

# Execute the main command
exec "$@"