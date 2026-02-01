const { createConnection, TextDocuments, ProposedFeatures, InitializeParams, InitializeResult } = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Import our custom modules
const { LanguageServer } = require('./server/LanguageServer');
const { DebugAdapter } = require('./debug/DebugAdapter');
const { CodeAnalyzer } = require('./language/CodeAnalyzer');
const { SyntaxHighlighter } = require('./language/SyntaxHighlighter');
const { Logger } = require('./utils/Logger');
const { KnowledgeGapHandler } = require('./utils/KnowledgeGapHandler');
const { TransparencyManager } = require('./utils/TransparencyManager');

// Create connection and documents
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Initialize our custom components
const logger = new Logger();
const knowledgeGapHandler = new KnowledgeGapHandler();
const transparencyManager = new TransparencyManager();

// Register known capabilities for transparency
transparencyManager.registerCapability('code_completion', {
    name: 'Code Completion',
    description: 'Provides intelligent code completions',
    accuracy: 'high',
    supported: true
});

transparencyManager.registerCapability('syntax_highlighting', {
    name: 'Syntax Highlighting',
    description: 'Provides real-time syntax highlighting',
    accuracy: 'high',
    supported: true
});

transparencyManager.registerCapability('error_detection', {
    name: 'Error Detection',
    description: 'Detects syntax and logical errors',
    accuracy: 'high',
    supported: true
});

transparencyManager.registerCapability('external_api_calls', {
    name: 'External API Calls',
    description: 'Making direct external API calls',
    accuracy: 'none',
    supported: false,
    limitations: ['Security restrictions prevent direct external calls']
});

transparencyManager.registerCapability('system_commands', {
    name: 'System Commands',
    description: 'Executing system-level commands',
    accuracy: 'none',
    supported: false,
    limitations: ['Security restrictions prevent system command execution']
});

// Initialize language server and debug adapter
const languageServer = new LanguageServer(connection, documents, knowledgeGapHandler, transparencyManager);
const debugAdapter = new DebugAdapter(connection, knowledgeGapHandler, transparencyManager);

// Handle initialization
connection.onInitialize((params) => {
    logger.info('LSP-DAP server initializing...');
    
    // Check transparency of initialization capabilities
    const initTransparency = transparencyManager.checkCapabilityTransparency('initialization');
    logger.info(`Initialization transparency: ${initTransparency.transparencyNote}`);
    
    const result = {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.']
            },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            codeActionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            renameProvider: {
                prepareProvider: true
            },
            semanticTokensProvider: {
                legend: SyntaxHighlighter.getTokenLegend(),
                full: true,
                range: true
            }
        }
    };
    
    // Add debug capabilities if available
    if (debugAdapter.supportsDebugging()) {
        result.capabilities.debugging = {
            supportsConfigurationDoneRequest: true,
            supportsFunctionBreakpoints: false,
            supportsConditionalBreakpoints: true,
            supportsHitConditionalBreakpoints: false,
            supportsEvaluateForHovers: true,
            exceptionBreakpointFilters: [],
            supportsStepBack: false,
            supportsSetVariable: true
        };
    }
    
    logger.info('LSP-DAP server initialized successfully');
    return result;
});

// Handle initialized event
connection.onInitialized(() => {
    logger.info('LSP-DAP server initialized and ready');
    
    // Log transparency report
    const transparencyReport = transparencyManager.getTransparencyReport();
    logger.info(`Transparency Report: ${JSON.stringify(transparencyReport, null, 2)}`);
});

// Register document handlers
documents.onDidOpen((event) => {
    logger.info(`Document opened: ${event.document.uri}`);
    languageServer.onDocumentOpened(event);
});

documents.onDidChangeContent((change) => {
    logger.info(`Document changed: ${change.document.uri}`);
    
    // Check if this change involves capability requests
    const content = change.document.getText();
    if (content.toLowerCase().includes('capability') || content.toLowerCase().includes('limitation')) {
        const capCheck = transparencyManager.checkCapabilityTransparency('dynamic_capability_check');
        logger.info(`Dynamic capability check performed: ${capCheck.transparencyNote}`);
    }
    
    languageServer.onDocumentChanged(change);
});

documents.onDidClose((event) => {
    logger.info(`Document closed: ${event.document.uri}`);
    languageServer.onDocumentClosed(event);
});

// Register LSP handlers
connection.onCompletion((params) => {
    logger.info(`Completion requested for ${params.textDocument.uri}`);
    
    // Validate request transparency
    const completionTransparency = transparencyManager.checkCapabilityTransparency('code_completion');
    if (!completionTransparency.supported) {
        return [];
    }
    
    return languageServer.handleCompletion(params);
});

connection.onHover((params) => {
    logger.info(`Hover requested for ${params.textDocument.uri}`);
    
    const hoverTransparency = transparencyManager.checkCapabilityTransparency('hover_provider');
    if (!hoverTransparency.supported) {
        return null;
    }
    
    return languageServer.handleHover(params);
});

connection.onDefinition((params) => {
    logger.info(`Definition requested for ${params.textDocument.uri}`);
    
    const defTransparency = transparencyManager.checkCapabilityTransparency('definition_provider');
    if (!defTransparency.supported) {
        return null;
    }
    
    return languageServer.handleDefinition(params);
});

connection.onReferences((params) => {
    logger.info(`References requested for ${params.textDocument.uri}`);
    
    const refTransparency = transparencyManager.checkCapabilityTransparency('references_provider');
    if (!refTransparency.supported) {
        return [];
    }
    
    return languageServer.handleReferences(params);
});

connection.onDocumentFormatting((params) => {
    logger.info(`Formatting requested for ${params.textDocument.uri}`);
    
    const formatTransparency = transparencyManager.checkCapabilityTransparency('document_formatting');
    if (!formatTransparency.supported) {
        return [];
    }
    
    return languageServer.handleFormatting(params);
});

// Handle shutdown
connection.onShutdown(() => {
    logger.info('LSP-DAP server shutting down...');
    
    // Log final transparency report
    const finalReport = transparencyManager.getTransparencyReport();
    logger.info(`Final Transparency Report: ${JSON.stringify(finalReport, null, 2)}`);
});

// Exit handler
connection.onExit(() => {
    logger.info('LSP-DAP server exited');
});

// Listen on the connection
documents.listen(connection);
connection.listen();

logger.info('Z-Evo LSP-DAP server listening for connections with full transparency capabilities');
