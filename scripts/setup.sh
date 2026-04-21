#!/bin/bash

# InsightForge Setup Script
# This script sets up the development environment for InsightForge

set -e  # Exit on error

echo "🔧 Setting up InsightForge Development Environment..."
echo "===================================================="

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
        return 1
    fi
    return 0
}

install_python_dependencies() {
    log_info "Setting up Python backend..."
    
    cd backend
    
    # Check Python version
    python_version=$(python3 --version | cut -d' ' -f2)
    log_info "Python version: $python_version"
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    log_info "Upgrading pip..."
    pip install --upgrade pip
    
    # Install dependencies
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Install development dependencies
    log_info "Installing development dependencies..."
    pip install pytest pytest-cov black flake8 mypy
    
    # Create .env file from example if it doesn't exist
    if [ ! -f ".env" ]; then
        log_info "Creating .env file from example..."
        cp .env.example .env
        log_warning "Please update the .env file with your configuration"
    fi
    
    cd ..
    log_success "Python backend setup complete"
}

install_node_dependencies() {
    log_info "Setting up Node.js frontend..."
    
    cd frontend
    
    # Check Node.js version
    node_version=$(node --version)
    npm_version=$(npm --version)
    log_info "Node.js version: $node_version"
    log_info "npm version: $npm_version"
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm install
    
    # Install development dependencies
    log_info "Installing development tools..."
    npm install -D eslint prettier eslint-config-next
    
    # Create .env.local file from example if it doesn't exist
    if [ ! -f ".env.local" ]; then
        log_info "Creating .env.local file from example..."
        cp .env.example .env.local
        log_warning "Please update the .env.local file with your configuration"
    fi
    
    cd ..
    log_success "Node.js frontend setup complete"
}

setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Start PostgreSQL with Docker Compose
    log_info "Starting PostgreSQL container..."
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Run database initialization
    log_info "Initializing database..."
    docker-compose exec postgres psql -U insightforge -d insightforge -f /docker-entrypoint-initdb.d/init.sql
    
    log_success "Database setup complete"
}

setup_redis() {
    log_info "Setting up Redis for caching..."
    
    # Start Redis with Docker Compose
    log_info "Starting Redis container..."
    docker-compose up -d redis
    
    log_success "Redis setup complete"
}

setup_development_tools() {
    log_info "Setting up development tools..."
    
    # Create necessary directories
    mkdir -p backend/uploads
    mkdir -p data/raw
    mkdir -p data/processed
    mkdir -p logs
    
    # Set permissions
    chmod 755 backend/uploads
    chmod 755 data
    
    # Install pre-commit hooks
    if check_command pre-commit; then
        log_info "Installing pre-commit hooks..."
        cd backend
        pre-commit install
        cd ..
    fi
    
    log_success "Development tools setup complete"
}

run_initial_migrations() {
    log_info "Running initial database migrations..."
    
    cd backend
    source venv/bin/activate
    
    # Initialize Alembic
    if [ ! -d "migrations" ]; then
        log_info "Initializing Alembic migrations..."
        alembic init migrations
    fi
    
    # Create initial migration
    log_info "Creating initial migration..."
    alembic revision --autogenerate -m "Initial migration"
    
    # Apply migration
    log_info "Applying migration..."
    alembic upgrade head
    
    cd ..
    log_success "Database migrations applied"
}

verify_setup() {
    echo "🔍 Verifying setup..."
    echo "===================="
    
    # Check Python setup
    if [ -d "backend/venv" ]; then
        log_success "Python virtual environment: OK"
    else
        log_error "Python virtual environment: Missing"
    fi
    
    # Check Node.js setup
    if [ -d "frontend/node_modules" ]; then
        log_success "Node.js dependencies: OK"
    else
        log_error "Node.js dependencies: Missing"
    fi
    
    # Check Docker containers
    if docker-compose ps | grep -q "Up"; then
        log_success "Docker containers: Running"
    else
        log_warning "Docker containers: Not running"
    fi
    
    # Check environment files
    if [ -f "backend/.env" ]; then
        log_success "Backend .env: Present"
    else
        log_warning "Backend .env: Missing (copy from .env.example)"
    fi
    
    if [ -f "frontend/.env.local" ]; then
        log_success "Frontend .env.local: Present"
    else
        log_warning "Frontend .env.local: Missing (copy from .env.example)"
    fi
    
    echo ""
    log_info "Setup verification complete"
}

display_next_steps() {
    echo ""
    echo "🎉 Setup Complete! Next Steps:"
    echo "==============================="
    echo ""
    echo "1. Configure Environment Variables:"
    echo "   • Edit backend/.env with your settings"
    echo "   • Edit frontend/.env.local with API URLs"
    echo ""
    echo "2. Required API Keys:"
    echo "   • GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey"
    echo ""
    echo "3. Start the application:"
    echo "   Option A: Docker Compose (Recommended)"
    echo "     $ docker-compose up"
    echo ""
    echo "   Option B: Separate services"
    echo "     Backend:"
    echo "     $ cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
    echo ""
    echo "     Frontend:"
    echo "     $ cd frontend && npm run dev"
    echo ""
    echo "4. Access the application:"
    echo "   • Frontend: http://localhost:3000"
    echo "   • Backend API: http://localhost:8000"
    echo "   • API Documentation: http://localhost:8000/api/docs"
    echo ""
    echo "5. Default credentials (if seeded):"
    echo "   • Email: admin@insightforge.com"
    echo "   • Password: admin123"
    echo ""
    echo "6. Development commands:"
    echo "   • Run tests: ./scripts/test.sh"
    echo "   • Deploy: ./scripts/deploy.sh"
    echo ""
    log_info "Happy coding! 🚀"
}

# Main setup flow
main() {
    echo "📦 InsightForge Development Setup"
    echo "================================"
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    
    if ! check_command python3; then
        log_error "Python3 is not installed. Please install Python 3.9 or higher."
        exit 1
    fi
    
    if ! check_command node; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    if ! check_command docker; then
        log_error "Docker is not installed. Please install Docker and Docker Compose."
        exit 1
    fi
    
    if ! check_command docker-compose; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    log_success "All prerequisites met"
    
    # Setup steps
    install_python_dependencies
    install_node_dependencies
    setup_database
    setup_redis
    setup_development_tools
    run_initial_migrations
    verify_setup
    display_next_steps
}

# Run main function
main "$@"