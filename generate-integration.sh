#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Generate Integration Layer - Photosensor Backend
# Integration yang dibuat:
# - plcIntegration.js ⭐⭐ VERY CRITICAL
#   (Manager untuk semua PLC services)
# ============================================================

ROOT_DIR="$(pwd)"
INTEGRATION_DIR="$ROOT_DIR/src/integration"

mkdir -p "$INTEGRATION_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Generating Integration Layer"
echo "║  Location: $INTEGRATION_DIR"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# plcIntegration.js - PLC Manager ⭐⭐ CRITICAL
# ============================================================

cat > "$INTEGRATION_DIR/plcIntegration.js" <<'EOFINTEGRATION'
const logger = require('../utils/logger');
const finsService = require('../services/finsService');
const sensorService = require('../services/sensorService');
const pollingService = require('../services/pollingService');
const WebSocketService = require('../services/websocketService');

class PlcIntegration {
  constructor() {
    this.isInitialized = false;
    this.io = null;
    this.startTime = null;
  }

  async initialize(io) {
    if (this.isInitialized) {
      logger.warn('PLC Integration already initialized');
      return;
    }

    this.io = io;
    this.startTime = Date.now();

    try {
      logger.info('═══════════════════════════════════════════════════');
      logger.info('Initializing PLC Integration...');
      logger.info('═══════════════════════════════════════════════════');

      // Step 1: Verify PLC connection
      logger.info('Step 1: Checking PLC connection...');
      await this.checkPLCConnection();

      // Step 2: Start polling service
      logger.info('Step 2: Starting polling service...');
      pollingService.start(io);

      // Step 3: Mark as initialized
      this.isInitialized = true;

      const uptime = Date.now() - this.startTime;
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`✅ PLC Integration initialized successfully (${uptime}ms)`);
      logger.info('═══════════════════════════════════════════════════');

      // Broadcast system alert
      if (io) {
        WebSocketService.broadcastSystemAlert(
          io,
          'integration_started',
          'PLC monitoring started successfully'
        );
      }

    } catch (error) {
      logger.error('═══════════════════════════════════════════════════');
      logger.error('Failed to initialize PLC Integration:', error);
      logger.error('═══════════════════════════════════════════════════');
      throw error;
    }
  }

  async checkPLCConnection() {
    try {
      const status = finsService.getStatus();
      
      if (!status.isConnected) {
        logger.warn(`⚠️  PLC is not connected yet (will retry automatically)`);
        logger.warn(`    Target: ${status.plcIp}:${status.plcPort}`);
      } else {
        logger.info(`✅ PLC connection verified`);
        logger.info(`    IP: ${status.plcIp}:${status.plcPort}`);
      }
    } catch (error) {
      logger.error('PLC connection check failed:', error);
      throw error;
    }
  }

  shutdown() {
    logger.info('═══════════════════════════════════════════════════');
    logger.info('Shutting down PLC Integration...');
    
    try {
      pollingService.stop();
      finsService.disconnect();
      this.isInitialized = false;
      
      logger.info('✅ PLC Integration shutdown complete');
      logger.info('═══════════════════════════════════════════════════');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  getStatus() {
    const finsStatus = finsService.getStatus();
    const pollingStatus = pollingService.getStatus();

    return {
      isInitialized: this.isInitialized,
      uptime: this.startTime ? Date.now() - this.startTime : null,
      fins: {
        isConnected: finsStatus.isConnected,
        host: finsStatus.plcIp,
        port: finsStatus.plcPort,
        lastUpdate: finsStatus.lastUpdate
      },
      polling: {
        isRunning: pollingStatus.isRunning,
        interval: pollingStatus.interval,
        totalPolls: pollingStatus.totalPolls,
        errorCount: pollingStatus.errorCount,
        lastPollTime: pollingStatus.lastPollTime
      },
      timestamp: new Date()
    };
  }

  getHealthReport() {
    const status = this.getStatus();
    const isHealthy = status.isInitialized && 
                      status.fins.isConnected && 
                      status.polling.isRunning &&
                      status.polling.errorCount < 3;

    return {
      healthy: isHealthy,
      status: isHealthy ? 'OK' : 'WARNING',
      details: status,
      checklist: {
        'Integration Initialized': status.isInitialized ? '✅' : '❌',
        'PLC Connected': status.fins.isConnected ? '✅' : '⚠️',
        'Polling Running': status.polling.isRunning ? '✅' : '❌',
        'Error Count < 3': status.polling.errorCount < 3 ? '✅' : '⚠️'
      }
    };
  }
}

module.exports = new PlcIntegration();
EOFINTEGRATION

echo "✅ Created: src/integration/plcIntegration.js ⭐⭐"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║    ✅ Integration Layer Generated Successfully!         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Created Integration:"
echo "   ⭐⭐ plcIntegration.js - PLC Manager (CRITICAL)"
echo ""
echo "✨ Features:"
echo "   • Initialize all PLC services"
echo "   • Start background polling"
echo "   • Connection monitoring"
echo "   • Health report generation"
echo "   • Graceful shutdown"
echo ""
echo "🎯 This file is MANDATORY - Must be called from server.js"
echo "═══════════════════════════════════════════════════════════"
