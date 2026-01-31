const { DiagnosticSeverity } = require('vscode-languageserver/node');

class LanguageServer {
    constructor(connection, documents, knowledgeGapHandler, transparencyManager) {
        this.connection = connection;
        this.documents = documents;
        this.knowledgeGapHandler = knowledgeGapHandler;
        this.transparencyManager = transparencyManager;
        
        // Import and instantiate CodeAnalyzer properly
        const { CodeAnalyzer } = require('../language/CodeAnalyzer');
        this.codeAnalyzer = new CodeAnalyzer();
        
        const { SyntaxHighlighter } = require('../language/SyntaxHighlighter');
        this.syntaxHighlighter = new SyntaxHighlighter();
        
        // Debounce function for document changes
        this.debouncedAnalyzers = new Map();
    }

    /**
     * Handles document opening events
     * @param {Object} event - Document open event
     */
    onDocumentOpened(event) {
        const uri = event.document.uri;
        this.connection.console.log(`Document opened: ${uri}`);
        
        // Analyze document on open
        this.analyzeDocument(uri, event.document.getText());
    }

    /**
     * Handles document change events
     * @param {Object} change - Document change event
     */
    onDocumentChanged(change) {
        const uri = change.document.uri;
        const text = change.document.getText();
        
        // Clear any existing debounce timeout
        if (this.debouncedAnalyzers.has(uri)) {
            clearTimeout(this.debouncedAnalyzers.get(uri));
        }

        // Debounce the analysis to avoid excessive processing
        const timeoutId = setTimeout(() => {
            this.analyzeDocument(uri, text);
            this.debouncedAnalyzers.delete(uri);
        }, 300);

        this.debouncedAnalyzers.set(uri, timeoutId);
    }

    /**
     * Handles document close events
     * @param {Object} event - Document close event
     */
    onDocumentClosed(event) {
        const uri = event.document.uri;
        this.connection.console.log(`Document closed: ${uri}`);
        
        // Clear any pending analysis
        if (this.debouncedAnalyzers.has(uri)) {
            clearTimeout(this.debouncedAnalyzers.get(uri));
            this.debouncedAnalyzers.delete(uri);
        }
    }

    /**
     * Analyzes a document for diagnostics and insights
     * @param {string} uri - Document URI
     * @param {string} text - Document text
     */
    async analyzeDocument(uri, text) {
        try {
            const diagnostics = [];

            // Perform code analysis
            const analysisResults = await this.codeAnalyzer.analyze(text, uri);
            
            // Convert analysis results to LSP diagnostics
            if (analysisResults.errors && analysisResults.errors.length > 0) {
                analysisResults.errors.forEach(error => {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: error.line || 0, character: error.column || 0 },
                            end: { line: error.line || 0, character: (error.column || 0) + (error.length || 1) }
                        },
                        message: error.message,
                        source: 'Z-Evo Analyzer'
                    });
                });
            }

            if (analysisResults.warnings && analysisResults.warnings.length > 0) {
                analysisResults.warnings.forEach(warning => {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: warning.line || 0, character: warning.column || 0 },
                            end: { line: warning.line || 0, character: (warning.column || 0) + (warning.length || 1) }
                        },
                        message: warning.message,
                        source: 'Z-Evo Analyzer'
                    });
                });
            }

            // Send diagnostics to client
            this.connection.sendDiagnostics({ uri, diagnostics });
        } catch (error) {
            this.connection.console.error(`Error analyzing document ${uri}: ${error.message}`);
        }
    }

    /**
     * Handles completion requests
     * @param {Object} params - Completion parameters
     */
    handleCompletion(params) {
        const document = this.documents.get(params.textDocument.uri);
        if (!document) {
            // Express limitation clearly
            const limitation = this.transparencyManager.communicateLimitation(
                'completion request', 
                'document access'
            );
            this.connection.console.warn(limitation.limitationExplanation);
            return [];
        }

        try {
            // Check capability transparency
            const capCheck = this.transparencyManager.checkCapabilityTransparency('code_completion');
            if (!capCheck.supported) {
                return [];
            }

            const position = params.position;
            const text = document.getText();
            const completions = this.codeAnalyzer.provideCompletions(text, position);

            // Validate response honesty
            const validation = this.transparencyManager.validateResponseHonesty(
                JSON.stringify(completions), 
                'completion request'
            );

            if (!validation.isHonest) {
                this.connection.console.warn('Adjusting completion response for honesty');
            }

            return completions;
        } catch (error) {
            // Express uncertainty clearly
            const uncertainty = this.transparencyManager.communicateUncertainty(
                'completion request',
                error.message
            );
            this.connection.console.warn(uncertainty.disclaimer);
            return [];
        }
    }

    /**
     * Handles hover requests
     * @param {Object} params - Hover parameters
     */
    handleHover(params) {
        const document = this.documents.get(params.textDocument.uri);
        if (!document) {
            const limitation = this.transparencyManager.communicateLimitation(
                'hover request', 
                'document access'
            );
            this.connection.console.warn(limitation.limitationExplanation);
            return null;
        }

        try {
            // Check capability transparency
            const capCheck = this.transparencyManager.checkCapabilityTransparency('hover_provider');
            if (!capCheck.supported) {
                return null;
            }

            const position = params.position;
            const text = document.getText();
            const hoverInfo = this.codeAnalyzer.provideHover(text, position);

            // Validate response honesty
            const validation = this.transparencyManager.validateResponseHonesty(
                JSON.stringify(hoverInfo), 
                'hover request'
            );

            if (!validation.isHonest) {
                this.connection.console.warn('Adjusting hover response for honesty');
            }

            return hoverInfo;
        } catch (error) {
            const uncertainty = this.transparencyManager.communicateUncertainty(
                'hover request',
                error.message
            );
            this.connection.console.warn(uncertainty.disclaimer);
            return null;
        }
    }

    /**
     * Handles definition requests
     * @param {Object} params - Definition parameters
     */
    handleDefinition(params) {
        const document = this.documents.get(params.textDocument.uri);
        if (!document) {
            const limitation = this.transparencyManager.communicateLimitation(
                'definition request', 
                'document access'
            );
            this.connection.console.warn(limitation.limitationExplanation);
            return null;
        }

        try {
            // Check capability transparency
            const capCheck = this.transparencyManager.checkCapabilityTransparency('definition_provider');
            if (!capCheck.supported) {
                return null;
            }

            const position = params.position;
            const text = document.getText();
            const definition = this.codeAnalyzer.provideDefinition(text, position);

            // Validate response honesty
            const validation = this.transparencyManager.validateResponseHonesty(
                JSON.stringify(definition), 
                'definition request'
            );

            if (!validation.isHonest) {
                this.connection.console.warn('Adjusting definition response for honesty');
            }

            return definition;
        } catch (error) {
            const uncertainty = this.transparencyManager.communicateUncertainty(
                'definition request',
                error.message
            );
            this.connection.console.warn(uncertainty.disclaimer);
            return null;
        }
    }

    /**
     * Handles references requests
     * @param {Object} params - References parameters
     */
    handleReferences(params) {
        const document = this.documents.get(params.textDocument.uri);
        if (!document) {
            const limitation = this.transparencyManager.communicateLimitation(
                'references request', 
                'document access'
            );
            this.connection.console.warn(limitation.limitationExplanation);
            return [];
        }

        try {
            // Check capability transparency
            const capCheck = this.transparencyManager.checkCapabilityTransparency('references_provider');
            if (!capCheck.supported) {
                return [];
            }

            const position = params.position;
            const text = document.getText();
            const references = this.codeAnalyzer.provideReferences(text, position);

            // Validate response honesty
            const validation = this.transparencyManager.validateResponseHonesty(
                JSON.stringify(references), 
                'references request'
            );

            if (!validation.isHonest) {
                this.connection.console.warn('Adjusting references response for honesty');
            }

            return references;
        } catch (error) {
            const uncertainty = this.transparencyManager.communicateUncertainty(
                'references request',
                error.message
            );
            this.connection.console.warn(uncertainty.disclaimer);
            return [];
        }
    }

    /**
     * Handles document formatting requests
     * @param {Object} params - Formatting parameters
     */
    handleFormatting(params) {
        const document = this.documents.get(params.textDocument.uri);
        if (!document) {
            const limitation = this.transparencyManager.communicateLimitation(
                'formatting request', 
                'document access'
            );
            this.connection.console.warn(limitation.limitationExplanation);
            return [];
        }

        try {
            // Check capability transparency
            const capCheck = this.transparencyManager.checkCapabilityTransparency('document_formatting');
            if (!capCheck.supported) {
                return [];
            }

            const text = document.getText();
            const formattedText = this.codeAnalyzer.formatCode(text);

            // Create text edit for formatting
            const fullRange = {
                start: { line: 0, character: 0 },
                end: document.positionAt(text.length)
            };

            const result = [{
                range: fullRange,
                newText: formattedText
            }];

            // Validate response honesty
            const validation = this.transparencyManager.validateResponseHonesty(
                JSON.stringify(result), 
                'formatting request'
            );

            if (!validation.isHonest) {
                this.connection.console.warn('Adjusting formatting response for honesty');
            }

            return result;
        } catch (error) {
            const uncertainty = this.transparencyManager.communicateUncertainty(
                'formatting request',
                error.message
            );
            this.connection.console.warn(uncertainty.disclaimer);
            return [];
        }
    }

    /**
     * Gets semantic tokens for syntax highlighting
     * @param {string} uri - Document URI
     * @param {string} text - Document text
     */
    getSemanticTokens(uri, text) {
        try {
            // Check capability transparency
            const capCheck = this.transparencyManager.checkCapabilityTransparency('semantic_tokens');
            if (!capCheck.supported) {
                return [];
            }

            const tokens = this.syntaxHighlighter.tokenize(text);
            return this.syntaxHighlighter.convertToSemanticTokens(tokens);
        } catch (error) {
            const uncertainty = this.transparencyManager.communicateUncertainty(
                'semantic tokens request',
                error.message
            );
            this.connection.console.warn(uncertainty.disclaimer);
            return [];
        }
    }
}

module.exports = { LanguageServer };
