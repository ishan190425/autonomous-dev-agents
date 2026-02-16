#!/bin/bash
# ADA Container Entrypoint
# Validates environment, clones repo, starts health server, and runs dispatch cycles
#
# Author: ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP

set -e

# ============================================
# Configuration Defaults
# ============================================
ADA_DISPATCH_INTERVAL="${ADA_DISPATCH_INTERVAL:-15m}"
ADA_ROLES_MODE="${ADA_ROLES_MODE:-read-write}"
ADA_LOG_LEVEL="${ADA_LOG_LEVEL:-info}"
ADA_HEALTH_PORT="${ADA_HEALTH_PORT:-8080}"

# Internal state
CYCLE_COUNT=0
LAST_CYCLE_TIME=""
CONTAINER_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ============================================
# Logging Functions
# ============================================
log() {
    local level="$1"
    shift
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"message\":\"$*\"}"
}

log_info() { log "info" "$@"; }
log_warn() { log "warn" "$@"; }
log_error() { log "error" "$@"; }
log_debug() { [[ "$ADA_LOG_LEVEL" == "debug" ]] && log "debug" "$@"; }

# ============================================
# Environment Validation
# ============================================
validate_env() {
    log_info "Validating environment variables..."
    local errors=0

    # Required: GITHUB_TOKEN
    if [[ -z "$GITHUB_TOKEN" ]]; then
        log_error "GITHUB_TOKEN is required but not set"
        errors=$((errors + 1))
    elif [[ ! "$GITHUB_TOKEN" =~ ^(ghp_|github_pat_) ]]; then
        log_error "GITHUB_TOKEN must start with 'ghp_' or 'github_pat_'"
        errors=$((errors + 1))
    fi

    # Required: GITHUB_REPO
    if [[ -z "$GITHUB_REPO" ]]; then
        log_error "GITHUB_REPO is required but not set"
        errors=$((errors + 1))
    elif [[ ! "$GITHUB_REPO" =~ ^[a-zA-Z0-9_-]+/[a-zA-Z0-9_.-]+$ ]]; then
        log_error "GITHUB_REPO must be in 'owner/repo' format"
        errors=$((errors + 1))
    fi

    # Required: ANTHROPIC_API_KEY
    if [[ -z "$ANTHROPIC_API_KEY" ]]; then
        log_error "ANTHROPIC_API_KEY is required but not set"
        errors=$((errors + 1))
    elif [[ ! "$ANTHROPIC_API_KEY" =~ ^sk-ant- ]]; then
        log_error "ANTHROPIC_API_KEY must start with 'sk-ant-'"
        errors=$((errors + 1))
    fi

    # Optional: ADA_DISPATCH_INTERVAL validation
    if [[ ! "$ADA_DISPATCH_INTERVAL" =~ ^[0-9]+(m|h)$ ]]; then
        log_error "ADA_DISPATCH_INTERVAL must be in format: 15m, 30m, 1h, etc."
        errors=$((errors + 1))
    fi

    # Optional: ADA_ROLES_MODE validation
    if [[ "$ADA_ROLES_MODE" != "read-only" && "$ADA_ROLES_MODE" != "read-write" ]]; then
        log_error "ADA_ROLES_MODE must be 'read-only' or 'read-write'"
        errors=$((errors + 1))
    fi

    # Optional: ADA_LOG_LEVEL validation
    if [[ "$ADA_LOG_LEVEL" != "debug" && "$ADA_LOG_LEVEL" != "info" && "$ADA_LOG_LEVEL" != "warn" ]]; then
        log_error "ADA_LOG_LEVEL must be 'debug', 'info', or 'warn'"
        errors=$((errors + 1))
    fi

    if [[ $errors -gt 0 ]]; then
        log_error "Environment validation failed with $errors error(s)"
        exit 1
    fi

    log_info "Environment validation passed"
}

# ============================================
# Repository Setup
# ============================================
setup_repo() {
    log_info "Setting up repository: $GITHUB_REPO"
    
    local repo_dir="/app/workspace/repo"
    
    if [[ -d "$repo_dir/.git" ]]; then
        log_info "Repository exists, pulling latest..."
        cd "$repo_dir"
        git pull origin "$(git rev-parse --abbrev-ref HEAD)" || true
    else
        log_info "Cloning repository..."
        rm -rf "$repo_dir"
        git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git" "$repo_dir"
        cd "$repo_dir"
    fi
    
    # Configure git
    git config user.name "ADA Bot"
    git config user.email "ada-bot@users.noreply.github.com"
    
    log_info "Repository setup complete"
}

# ============================================
# Health Server
# ============================================
start_health_server() {
    log_info "Starting health server on port $ADA_HEALTH_PORT"
    
    # Simple health endpoint using netcat (nc) in a background loop
    while true; do
        local uptime_seconds=$(($(date +%s) - $(date -d "$CONTAINER_START_TIME" +%s 2>/dev/null || echo 0)))
        local uptime_human="${uptime_seconds}s"
        
        if [[ $uptime_seconds -ge 3600 ]]; then
            uptime_human="$((uptime_seconds / 3600))h $((uptime_seconds % 3600 / 60))m"
        elif [[ $uptime_seconds -ge 60 ]]; then
            uptime_human="$((uptime_seconds / 60))m $((uptime_seconds % 60))s"
        fi
        
        local response_body="{\"status\":\"healthy\",\"lastCycle\":$CYCLE_COUNT,\"uptime\":\"$uptime_human\",\"lastCycleTime\":\"$LAST_CYCLE_TIME\"}"
        local response="HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${#response_body}\r\nConnection: close\r\n\r\n$response_body"
        
        echo -e "$response" | nc -l -p "$ADA_HEALTH_PORT" -q 1 2>/dev/null || true
    done &
    
    HEALTH_PID=$!
    log_info "Health server started (PID: $HEALTH_PID)"
}

# ============================================
# Dispatch Cycle
# ============================================
run_dispatch_cycle() {
    log_info "Starting dispatch cycle $((CYCLE_COUNT + 1))"
    
    cd /app/workspace/repo
    
    # Pull latest changes before dispatch
    git pull origin "$(git rev-parse --abbrev-ref HEAD)" 2>/dev/null || true
    
    # Run ada dispatch
    if npx ada dispatch start --force 2>&1; then
        # Execute one cycle action
        # The actual action is handled by OpenClaw agent invocation
        log_info "Dispatch cycle initiated"
        
        # Note: Full dispatch completion is handled by the ada CLI
        # For MVP, we'll implement a simplified version
        CYCLE_COUNT=$((CYCLE_COUNT + 1))
        LAST_CYCLE_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        log_info "Dispatch cycle $CYCLE_COUNT completed"
    else
        log_warn "Dispatch cycle failed, will retry next interval"
    fi
}

# ============================================
# Interval Parser
# ============================================
parse_interval_to_seconds() {
    local interval="$1"
    local value="${interval%[mh]}"
    local unit="${interval: -1}"
    
    case "$unit" in
        m) echo $((value * 60)) ;;
        h) echo $((value * 3600)) ;;
        *) echo 900 ;; # Default 15 minutes
    esac
}

# ============================================
# Main Loop
# ============================================
main() {
    log_info "ADA Container starting..."
    log_info "Mode: $ADA_ROLES_MODE | Interval: $ADA_DISPATCH_INTERVAL | Log Level: $ADA_LOG_LEVEL"
    
    # Validate environment on startup
    validate_env
    
    # Setup repository
    setup_repo
    
    # Start health server
    start_health_server
    
    # Parse dispatch interval
    local interval_seconds=$(parse_interval_to_seconds "$ADA_DISPATCH_INTERVAL")
    log_info "Dispatch interval: ${interval_seconds}s"
    
    # Run first dispatch within 2 minutes (per spec)
    log_info "Scheduling first dispatch cycle..."
    sleep 30  # Initial delay for container stabilization
    run_dispatch_cycle
    
    # Main dispatch loop
    log_info "Entering main dispatch loop..."
    while true; do
        sleep "$interval_seconds"
        run_dispatch_cycle
    done
}

# ============================================
# Signal Handlers
# ============================================
cleanup() {
    log_info "Received shutdown signal, cleaning up..."
    
    # Kill health server
    [[ -n "$HEALTH_PID" ]] && kill "$HEALTH_PID" 2>/dev/null || true
    
    log_info "Container shutdown complete"
    exit 0
}

trap cleanup SIGTERM SIGINT SIGQUIT

# Start container
main "$@"
