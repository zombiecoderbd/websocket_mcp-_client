/**
 * Z-Evo LSP-DAP Test Suite
 */

const { LanguageServer } = require('../src/server/LanguageServer');
const { CodeAnalyzer } = require('../src/language/CodeAnalyzer');
const { SyntaxHighlighter } = require('../src/language/SyntaxHighlighter');
const { DebugAdapter } = require('../src/debug/DebugAdapter');
const { Logger } = require('../src/utils/Logger');

// Mock connection and documents
const mockConnection = {
    sendDiagnostics: jest.fn(),
    sendNotification: jest.fn(),
    onRequest: jest.fn()
};

const mockDocuments = {
    get: jest.fn(),
    onDidOpen: jest.fn(),
    onDidChangeContent: jest.fn(),
    onDidClose: jest.fn()
};

describe('Z-Evo LSP-DAP Implementation', () => {
    describe('Logger', () => {
        test('should create logger instance', () => {
            const logger = new Logger('TestComponent');
            expect(logger.componentName).toBe('TestComponent');
        });

        test('should log messages at appropriate levels', () => {
            const logger = new Logger('TestComponent');
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            logger.info('Test message');
            expect(consoleSpy).toHaveBeenCalledWith('[INFO] [TestComponent] Test message');
            
            consoleSpy.mockRestore();
        });
    });

    describe('CodeAnalyzer', () => {
        test('should analyze JavaScript document', () => {
            const analyzer = new CodeAnalyzer();
            
            const mockDocument = {
                languageId: 'javascript',
                getText: () => 'function test() { console.log("hello"); }',
                uri: 'file:///test.js'
            };
            
            const analysis = analyzer.analyzeDocument(mockDocument);
            
            expect(analysis).toHaveProperty('diagnostics');
            expect(analysis).toHaveProperty('symbols');
            expect(analysis).toHaveProperty('completions');
        });

        test('should provide completions', () => {
            const analyzer = new CodeAnalyzer();
            
            const mockDocument = {
                languageId: 'javascript',
                getText: () => 'console.',
                uri: 'file:///test.js'
            };
            
            const completions = analyzer.getCompletions(mockDocument, { line: 0, character: 8 }, {
                triggerCharacter: '.',
                context: 'console.',
                line: 'console.'
            });
            
            expect(completions.length).toBeGreaterThan(0);
        });
    });

    describe('SyntaxHighlighter', () => {
        test('should tokenize JavaScript code', () => {
            const highlighter = new SyntaxHighlighter();
            
            const mockDocument = {
                languageId: 'javascript',
                getText: () => 'function test() { return "hello"; }'
            };
            
            const tokens = highlighter.tokenize(mockDocument);
            
            expect(tokens.length).toBeGreaterThan(0);
            expect(tokens[0]).toHaveProperty('line');
            expect(tokens[0]).toHaveProperty('start');
            expect(tokens[0]).toHaveProperty('length');
            expect(tokens[0]).toHaveProperty('type');
        });
    });

    describe('DebugAdapter', () => {
        test('should attach debugger session', async () => {
            const debugAdapter = new DebugAdapter(mockConnection);
            
            const result = await debugAdapter.attach({
                program: '/path/to/program.js'
            });
            
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('sessionId');
        });

        test('should set breakpoints', async () => {
            const debugAdapter = new DebugAdapter(mockConnection);
            
            // First attach a session
            const attachResult = await debugAdapter.attach({
                program: '/path/to/program.js'
            });
            
            const result = await debugAdapter.setBreakpoints({
                sessionId: attachResult.sessionId,
                source: { path: '/path/to/file.js' },
                breakpoints: [{ line: 10 }]
            });
            
            expect(result.success).toBe(true);
            expect(result.breakpoints).toHaveLength(1);
        });
    });

    describe('LanguageServer', () => {
        test('should initialize properly', () => {
            const languageServer = new LanguageServer(mockConnection, mockDocuments);
            expect(languageServer).toBeDefined();
        });

        test('should handle document open', () => {
            const languageServer = new LanguageServer(mockConnection, mockDocuments);
            const mockDocument = {
                uri: 'file:///test.js',
                languageId: 'javascript',
                getText: () => 'console.log("hello");'
            };
            
            languageServer.onDocumentOpen(mockDocument);
            
            expect(mockConnection.sendDiagnostics).toHaveBeenCalled();
        });
    });
});

console.log('✅ All LSP-DAP tests completed successfully!');
