#!/bin/bash

# ZippyCoin Health Check Script
# Verifies that all services are running correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if Docker is running
check_docker() {
    log_info "Checking Docker..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker not found"
        return 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon not running"
        return 1
    fi

    log_success "Docker is running"
}

# Check Docker Compose
check_compose() {
    log_info "Checking Docker Compose..."

    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose not found"
        return 1
    fi

    log_success "Docker Compose available: $COMPOSE_CMD"
}

# Check running containers
check_containers() {
    log_info "Checking running containers..."

    if [[ -f "docker-compose.yml" ]]; then
        $COMPOSE_CMD ps

        # Check each service
        SERVICES=("blockchain" "trust-engine" "api-gateway")
        OPTIONAL_SERVICES=("prometheus" "grafana")

        for service in "${SERVICES[@]}"; do
            if $COMPOSE_CMD ps "$service" | grep -q "Up"; then
                log_success "$service is running"
            else
                log_error "$service is not running"
            fi
        done

        for service in "${OPTIONAL_SERVICES[@]}"; do
            if $COMPOSE_CMD ps "$service" | grep -q "Up"; then
                log_success "$service is running"
            else
                log_warn "$service is not running (optional)"
            fi
        done
    else
        log_warn "docker-compose.yml not found"
    fi
}

# Check service endpoints
check_endpoints() {
    log_info "Checking service endpoints..."

    ENDPOINTS=(
        "http://localhost:8545:Blockchain RPC"
        "http://localhost:3000:Trust Engine"
        "http://localhost:4000:API Gateway"
        "http://localhost:9090:Prometheus"
        "http://localhost:3001:Grafana"
    )

    for endpoint in "${ENDPOINTS[@]}"; do
        URL=$(echo "$endpoint" | cut -d: -f1-2)
        NAME=$(echo "$endpoint" | cut -d: -f3)

        if curl -s --max-time 5 "$URL" &> /dev/null; then
            log_success "$NAME is responding"
        else
            log_warn "$NAME is not responding"
        fi
    done
}

# Check blockchain status
check_blockchain() {
    log_info "Checking blockchain status..."

    # Check if we can get the latest block
    if curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 | grep -q '"result"'; then

        BLOCK_NUMBER=$(curl -s -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

        if [[ -n "$BLOCK_NUMBER" ]]; then
            # Convert hex to decimal
            BLOCK_DEC=$((16#${BLOCK_NUMBER#0x}))
            log_success "Blockchain is running (Block: $BLOCK_DEC)"
        else
            log_success "Blockchain RPC is responding"
        fi
    else
        log_error "Blockchain RPC is not responding"
    fi
}

# Check system resources
check_resources() {
    log_info "Checking system resources..."

    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')
    log_info "CPU Usage: $CPU_USAGE"

    # Memory usage
    if command -v free &> /dev/null; then
        MEM_INFO=$(free | grep Mem)
        MEM_TOTAL=$(echo "$MEM_INFO" | awk '{print $2}')
        MEM_USED=$(echo "$MEM_INFO" | awk '{print $3}')
        MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
        log_info "Memory Usage: ${MEM_PERCENT}% (${MEM_USED}KB / ${MEM_TOTAL}KB)"
    fi

    # Disk usage
    DISK_USAGE=$(df . | tail -1 | awk '{print $5}')
    log_info "Disk Usage: $DISK_USAGE"
}

# Generate health report
generate_report() {
    log_info "Generating health report..."

    REPORT_FILE="health-report-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "ZippyCoin Health Report"
        echo "Generated: $(date)"
        echo "======================"
        echo ""
        echo "Docker Status:"
        docker --version
        echo ""
        echo "Container Status:"
        $COMPOSE_CMD ps
        echo ""
        echo "System Resources:"
        echo "- CPU: $CPU_USAGE"
        echo "- Memory: ${MEM_PERCENT}% used"
        echo "- Disk: $DISK_USAGE used"
        echo ""
        echo "Service Endpoints:"
        for endpoint in "${ENDPOINTS[@]}"; do
            URL=$(echo "$endpoint" | cut -d: -f1-2)
            NAME=$(echo "$endpoint" | cut -d: -f3)
            if curl -s --max-time 5 "$URL" &> /dev/null; then
                echo "- $NAME: ✅ Responding"
            else
                echo "- $NAME: ❌ Not responding"
            fi
        done
    } > "$REPORT_FILE"

    log_success "Health report saved to: $REPORT_FILE"
}

# Main function
main() {
    echo "🔍 ZippyCoin Health Check"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    check_docker
    echo ""
    check_compose
    echo ""
    check_containers
    echo ""
    check_endpoints
    echo ""
    check_blockchain
    echo ""
    check_resources
    echo ""
    generate_report

    echo ""
    log_success "✅ Health check complete!"
    echo "Check the generated health report for detailed information."
}

main "$@"
