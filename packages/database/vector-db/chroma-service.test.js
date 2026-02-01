/**
 * Test suite for ChromaDB Vector Database Service
 */

const ChromaDBService = require('./chroma-service');

describe('ChromaDBService', () => {
    let chromaService;

    beforeAll(async () => {
        chromaService = new ChromaDBService({
            host: 'localhost',
            port: 8000
        });
    });

    afterAll(async () => {
        if (chromaService) {
            await chromaService.close();
        }
    });

    test('should create service instance', () => {
        expect(chromaService).toBeInstanceOf(ChromaDBService);
        expect(chromaService.config.collections).toEqual([
            'user_knowledge',
            'code_patterns',
            'project_context'
        ]);
    });

    test('should generate document ID', () => {
        const text = 'Test document content';
        const metadata = { source: 'test' };
        const id = chromaService.generateDocumentId(text, metadata);
        
        expect(id).toHaveLength(16);
        expect(typeof id).toBe('string');
    });

    // Note: These tests require ChromaDB server to be running
    test.skip('should initialize service', async () => {
        const result = await chromaService.initialize();
        expect(result).toBe(true);
        expect(chromaService.isConnected).toBe(true);
    });

    test.skip('should insert and retrieve document', async () => {
        await chromaService.initialize();
        
        const testText = 'This is a test document for vector database';
        const testMetadata = { 
            type: 'test', 
            category: 'example',
            timestamp: new Date().toISOString()
        };

        const docId = await chromaService.insertDocument(
            'user_knowledge', 
            testText, 
            testMetadata
        );

        expect(docId).toHaveLength(16);

        const results = await chromaService.retrieveContext(
            'user_knowledge',
            'test document',
            5
        );

        expect(results).toHaveLength(1);
        expect(results[0].document).toBe(testText);
        expect(results[0].metadata.type).toBe('test');
    });

    test.skip('should perform semantic search', async () => {
        await chromaService.initialize();
        
        const results = await chromaService.semanticSearch(
            'test document',
            3
        );

        expect(Array.isArray(results)).toBe(true);
    });

    test.skip('should get collection stats', async () => {
        await chromaService.initialize();
        
        const stats = await chromaService.getCollectionStats('user_knowledge');
        
        expect(stats).toHaveProperty('name', 'user_knowledge');
        expect(stats).toHaveProperty('documentCount');
        expect(stats).toHaveProperty('embeddingDimension', 384);
        expect(stats).toHaveProperty('status', 'active');
    });
});