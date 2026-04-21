#!/bin/bash

# InsightForge Deployment Script
# This script handles deployment to both Render (backend) and Vercel (frontend)

set -e  # Exit on error

echo "🚀 Starting InsightForge Deployment Process..."
echo "=============================================="

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables..."
    set -a
    source .env
    set +a
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Check required commands
echo "🔍 Checking required tools..."
check_command docker
check_command docker-compose
check_command node
check_command npm
check_command python3
check_command pip3

# Deployment options
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
DEPLOY_DATABASE=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            DEPLOY_FRONTEND=false
            DEPLOY_DATABASE=false
            shift
            ;;
        --frontend-only)
            DEPLOY_BACKEND=false
            DEPLOY_DATABASE=false
            shift
            ;;
        --database-only)
            DEPLOY_BACKEND=false
            DEPLOY_FRONTEND=false
            shift
            ;;
        --no-database)
            DEPLOY_DATABASE=false
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: $0 [--backend-only] [--frontend-only] [--database-only] [--no-database]"
            exit 1
            ;;
    esac
done

# Build and push Docker images
build_docker_images() {
    echo "🐳 Building Docker images..."
    
    # Build backend
    if [ "$DEPLOY_BACKEND" = true ]; then
        log_info "Building backend image..."
        cd backend
        docker build -t insightforge-backend:latest .
        cd ..
        log_success "Backend image built successfully"
    fi
    
    # Build frontend
    if [ "$DEPLOY_FRONTEND" = true ]; then
        log_info "Building frontend image..."
        cd frontend
        docker build -t insightforge-frontend:latest .
        cd ..
        log_success "Frontend image built successfully"
    fi
}

# Deploy to Render
deploy_to_render() {
    if [ "$DEPLOY_BACKEND" = true ]; then
        echo "🎯 Deploying backend to Render..."
        
        # Check if Render CLI is installed
        if ! command -v render &> /dev/null; then
            log_warning "Render CLI not found. Installing..."
            curl -s https://render.com/downloads/render-cli/install.sh | bash
        fi
        
        # Deploy using render.yaml
        render blueprint deploy
        log_success "Backend deployment initiated on Render"
    fi
    
    if [ "$DEPLOY_DATABASE" = true ]; then
        log_info "Database deployment configured in render.yaml"
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    if [ "$DEPLOY_FRONTEND" = true ]; then
        echo "🌐 Deploying frontend to Vercel..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            log_warning "Vercel CLI not found. Installing..."
            npm install -g vercel
        fi
        
        # Deploy frontend
        cd frontend
        vercel --prod --yes
        cd ..
        log_success "Frontend deployment initiated on Vercel"
    fi
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    
    # Backend tests
    if [ "$DEPLOY_BACKEND" = true ]; then
        log_info "Running backend tests..."
        cd backend
        python -m pytest tests/ -v
        cd ..
        log_success "Backend tests passed"
    fi
    
    # Frontend tests (if any)
    if [ "$DEPLOY_FRONTEND" = true ]; then
        log_info "Running frontend linting..."
        cd frontend
        npm run lint
        cd ..
        log_success "Frontend linting passed"
    fi
}

# Health check
health_check() {
    echo "🏥 Performing health checks..."
    
    # Give deployments some time
    sleep 30
    
    # Check backend health
    if [ "$DEPLOY_BACKEND" = true ]; then
        BACKEND_URL="${BACKEND_URL:-https://insightforge-backend.onrender.com}"
        log_info "Checking backend health at $BACKEND_URL/health..."
        
        if curl -s -f "$BACKEND_URL/health" | grep -q "healthy"; then
            log_success "Backend is healthy"
        else
            log_error "Backend health check failed"
            exit 1
        fi
    fi
    
    # Check frontend (if deployed)
    if [ "$DEPLOY_FRONTEND" = true ]; then
        FRONTEND_URL="${FRONTEND_URL:-https://insightforge.vercel.app}"
        log_info "Checking frontend accessibility..."
        
        if curl -s -f "$FRONTEND_URL" > /dev/null; then
            log_success "Frontend is accessible"
        else
            log_warning "Frontend may still be deploying or having issues"
        fi
    fi
}

# Update deployment status
update_deployment_status() {
    echo "📊 Deployment Summary:"
    echo "----------------------"
    
    if [ "$DEPLOY_BACKEND" = true ]; then
        BACKEND_URL="${BACKEND_URL:-https://insightforge-backend.onrender.com}"
        echo "Backend: $BACKEND_URL"
        echo "  • API Documentation: $BACKEND_URL/api/docs"
        echo "  • Health Check: $BACKEND_URL/health"
    fi
    
    if [ "$DEPLOY_FRONTEND" = true ]; then
        FRONTEND_URL="${FRONTEND_URL:-https://insightforge.vercel.app}"
        echo "Frontend: $FRONTEND_URL"
    fi
    
    if [ "$DEPLOY_DATABASE" = true ]; then
        echo "Database: Deployed on Render PostgreSQL"
    fi
    
    echo ""
    echo "🔑 Environment Variables Required:"
    echo "  • GEMINI_API_KEY: Your Google Gemini API key"
    echo "  • DATABASE_URL: PostgreSQL connection string"
    echo "  • JWT_SECRET_KEY: Secret for JWT token generation"
}

# Main deployment flow
main() {
    echo "📦 InsightForge Deployment"
    echo "=========================="
    
    # Run tests before deployment
    run_tests
    
    # Build Docker images
    build_docker_images
    
    # Deploy backend to Render
    deploy_to_render
    
    # Deploy frontend to Vercel
    deploy_to_vercel
    
    # Wait and check health
    health_check
    
    # Show deployment summary
    update_deployment_status
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables in Render dashboard"
    echo "2. Configure CORS if needed"
    echo "3. Test the complete application flow"
    echo "4. Monitor application logs"
}

# Handle errors
trap 'log_error "Deployment failed with error on line $LINENO"; exit 1' ERR

# Run main function
main "$@"