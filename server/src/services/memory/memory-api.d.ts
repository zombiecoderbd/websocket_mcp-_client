export class MemoryManagementAPI {
    constructor(config?: any);
    initialize(): Promise<boolean>;
    insertDocument(text: string, metadata?: any, collection?: string): Promise<any>;
    retrieveContext(query: string, k?: number, collection?: string | null, filters?: any): Promise<any>;
    semanticSearch(query: string, threshold?: number, k?: number, collection?: string | null): Promise<any>;
    updateDocument(docId: string, newText: string, newMetadata?: any, collection?: string): Promise<any>;
    deleteDocument(docId: string, collection?: string): Promise<any>;
    getMemoryStats(): Promise<any>;
    isReady(): Promise<boolean>;
    shutdown(): Promise<void>;
}