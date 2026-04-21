#!/bin/bash

# InsightForge Test Script
# This script runs tests for the entire application

set -e  # Exit on error

echo "🧪 Running InsightForge Tests..."
echo "================================"

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

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test categories
run_backend_tests() {
    echo ""
    echo "🔧 Backend Tests"
    echo "----------------"
    
    if [ ! -d "backend" ]; then
        log_warning "Backend directory not found, skipping tests"
        ((TESTS_SKIPPED++))
        return
    fi
    
    cd backend
    
    # Activate virtual environment
    if [ -d "venv" ]; then
        source venv/bin/activate
    else
        log_warning "Virtual environment not found, using system Python"
    fi
    
    # Run Python tests
    log_info "Running Python unit tests..."
    if python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing; then
        log_success "Python unit tests passed"
        ((TESTS_PASSED++))
    else
        log_error "Python unit tests failed"
        ((TESTS_FAILED++))
    fi
    
    # Run type checking
    log_info "Running type checks with mypy..."
    if mypy app/ --ignore-missing-imports; then
        log_success "Type checks passed"
        ((TESTS_PASSED++))
    else
        log_warning "Type checks have issues"
        ((TESTS_SKIPPED++))
    fi
    
    # Run linting
    log_info "Running code linting..."
    if flake8 app/ --max-line-length=88 --extend-ignore=E203,W503; then
        log_success "Linting passed"
        ((TESTS_PASSED++))
    else
        log_error "Linting failed"
        ((TESTS_FAILED++))
    fi
    
    # Run code formatting check
    log_info "Checking code formatting..."
    if black app/ --check; then
        log_success "Code formatting is correct"
        ((TESTS_PASSED++))
    else
        log_warning "Code formatting issues found"
        ((TESTS_SKIPPED++))
    fi
    
    # Security checks
    log_info "Running security checks..."
    if bandit -r app/ -ll; then
        log_success "Security checks passed"
        ((TESTS_PASSED++))
    else
        log_warning "Security checks found issues"
        ((TESTS_SKIPPED++))
    fi
    
    cd ..
}

run_frontend_tests() {
    echo ""
    echo "🎨 Frontend Tests"
    echo "-----------------"
    
    if [ ! -d "frontend" ]; then
        log_warning "Frontend directory not found, skipping tests"
        ((TESTS_SKIPPED++))
        return
    fi
    
    cd frontend
    
    # Check Node.js dependencies
    if [ ! -d "node_modules" ]; then
        log_warning "Node modules not found, installing..."
        npm install
    fi
    
    # Run linting
    log_info "Running ESLint..."
    if npm run lint; then
        log_success "ESLint passed"
        ((TESTS_PASSED++))
    else
        log_error "ESLint failed"
        ((TESTS_FAILED++))
    fi
    
    # Run type checking (if TypeScript)
    if [ -f "tsconfig.json" ]; then
        log_info "Running TypeScript type checking..."
        if npx tsc --noEmit; then
            log_success "TypeScript checks passed"
            ((TESTS_PASSED++))
        else
            log_error "TypeScript checks failed"
            ((TESTS_FAILED++))
        fi
    fi
    
    # Run unit tests if configured
    if [ -f "jest.config.js" ] || [ -f "package.json" ] && grep -q "jest" package.json; then
        log_info "Running Jest tests..."
        if npm test -- --passWithNoTests; then
            log_success "Jest tests passed"
            ((TESTS_PASSED++))
        else
            log_error "Jest tests failed"
            ((TESTS_FAILED++))
        fi
    fi
    
    # Build check
    log_info "Checking build..."
    if npm run build; then
        log_success "Build successful"
        ((TESTS_PASSED++))
    else
        log_error "Build failed"
        ((TESTS_FAILED++))
    fi
    
    cd ..
}

run_integration_tests() {
    echo ""
    echo "🔗 Integration Tests"
    echo "--------------------"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_warning "Docker not running, skipping integration tests"
        ((TESTS_SKIPPED++))
        return
    fi
    
    # Start services
    log_info "Starting services with Docker Compose..."
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 15
    
    # Test backend health
    log_info "Testing backend health..."
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        log_success "Backend health check passed"
        ((TESTS_PASSED++))
    else
        log_error "Backend health check failed"
        ((TESTS_FAILED++))
    fi
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    
    # Test authentication endpoints
    AUTH_TEST=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"test123","full_name":"Test User"}' | jq -r '.email')
    
    if [ "$AUTH_TEST" = "test@example.com" ]; then
        log_success "Authentication API test passed"
        ((TESTS_PASSED++))
    else
        log_error "Authentication API test failed"
        ((TESTS_FAILED++))
    fi
    
    # Clean up test data
    log_info "Cleaning up test data..."
    docker-compose down
    log_success "Integration tests completed"
}

run_e2e_tests() {
    echo ""
    echo "🌐 End-to-End Tests"
    echo "-------------------"
    
    # Check if Playwright or Cypress is configured
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        
        # Check for Playwright
        if grep -q "@playwright/test" package.json; then
            log_info "Running Playwright e2e tests..."
            if npx playwright test; then
                log_success "Playwright tests passed"
                ((TESTS_PASSED++))
            else
                log_error "Playwright tests failed"
                ((TESTS_FAILED++))
            fi
        # Check for Cypress
        elif grep -q "cypress" package.json; then
            log_info "Running Cypress e2e tests..."
            if npx cypress run; then
                log_success "Cypress tests passed"
                ((TESTS_PASSED++))
            else
                log_error "Cypress tests failed"
                ((TESTS_FAILED++))
            fi
        else
            log_warning "No e2e testing framework configured"
            ((TESTS_SKIPPED++))
        fi
        
        cd ..
    else
        log_warning "Frontend not configured for e2e tests"
        ((TESTS_SKIPPED++))
    fi
}

run_performance_tests() {
    echo ""
    echo "⚡ Performance Tests"
    echo "-------------------"
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        log_warning "k6 not installed, skipping performance tests"
        log_info "Install k6: https://k6.io/docs/getting-started/installation/"
        ((TESTS_SKIPPED++))
        return
    fi
    
    # Create performance test script
    cat > /tmp/insightforge_perf.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const res = http.get('http://localhost:8000/health');
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(1);
}
EOF
    
    # Start services if not running
    if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_info "Starting services for performance test..."
        docker-compose up -d
        sleep 10
    fi
    
    log_info "Running performance tests with k6..."
    if k6 run /tmp/insightforge_perf.js; then
        log_success "Performance tests passed"
        ((TESTS_PASSED++))
    else
        log_error "Performance tests failed"
        ((TESTS_FAILED++))
    fi
    
    # Clean up
    rm /tmp/insightforge_perf.js
}

generate_test_report() {
    echo ""
    echo "📊 Test Report"
    echo "=============="
    echo ""
    echo "Summary:"
    echo "  Passed:  $TESTS_PASSED"
    echo "  Failed:  $TESTS_FAILED"
    echo "  Skipped: $TESTS_SKIPPED"
    echo ""
    
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
    if [ $TOTAL_TESTS -eq 0 ]; then
        log_warning "No tests were run"
        return
    fi
    
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "✅ All tests passed! Success rate: $SUCCESS_RATE%"
    elif [ $TESTS_FAILED -gt 0 ] && [ $SUCCESS_RATE -ge 80 ]; then
        log_warning "⚠️  Some tests failed. Success rate: $SUCCESS_RATE%"
    else
        log_error "❌ Multiple tests failed. Success rate: $SUCCESS_RATE%"
        exit 1
    fi
    
    echo ""
    echo "Coverage Reports:"
    echo "  • Backend: file://$(pwd)/backend/htmlcov/index.html"
    echo ""
    echo "Next Steps:"
    if [ $TESTS_FAILED -gt 0 ]; then
        echo "  1. Review failed tests above"
        echo "  2. Fix issues and run tests again"
        echo "  3. Check coverage reports for untested code"
    else
        echo "  1. All tests passed! Ready for deployment"
        echo "  2. Run ./scripts/deploy.sh to deploy"
    fi
}

# Main test flow
main() {
    echo "🔍 InsightForge Test Suite"
    echo "=========================="
    
    # Record start time
    START_TIME=$(date +%s)
    
    # Run test suites
    run_backend_tests
    run_frontend_tests
    run_integration_tests
    run_e2e_tests
    run_performance_tests
    
    # Record end time
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Generate report
    generate_test_report
    
    echo ""
    log_info "Total test duration: ${DURATION}s"
    echo ""
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Handle errors
trap 'log_error "Test script failed with error on line $LINENO"; exit 1' ERR

# Run main function
main "$@"