#!/usr/bin/env node

const ZombieCoderServer = require('./Server');

async function main() {
    const server = new ZombieCoderServer();
    
    try {
        await server.start();
    } catch (error) {
        console.error('❌ Failed to start ZombieCoder MCP Server:', error);
        process.exit(1);
    }
}

// Handle different execution modes
if (require.main === module) {
    main();
}

module.exports = ZombieCoderServer;