/**
 * Z-Evo Syntax Highlighter
 * Provides syntax highlighting and tokenization
 */

const { Logger } = require('../utils/Logger');

class SyntaxHighlighter {
    constructor() {
        this.logger = new Logger('SyntaxHighlighter');
        this.tokenizers = new Map();
        
        // Register tokenizers for different languages
        this.registerTokenizer('javascript', new JavaScriptTokenizer());
        this.registerTokenizer('typescript', new TypeScriptTokenizer());
        this.registerTokenizer('python', new PythonTokenizer());
        this.registerTokenizer('java', new JavaTokenizer());
    }

    registerTokenizer(languageId, tokenizer) {
        this.tokenizers.set(languageId, tokenizer);
        this.logger.debug(`Registered tokenizer for: ${languageId}`);
    }

    tokenize(document) {
        const languageId = document.languageId;
        const tokenizer = this.tokenizers.get(languageId);
        
        if (!tokenizer) {
            this.logger.warn(`No tokenizer found for language: ${languageId}`);
            return [];
        }

        try {
            const tokens = tokenizer.tokenize(document.getText());
            return tokens;
        } catch (error) {
            this.logger.error(`Error tokenizing document:`, error);
            return [];
        }
    }

    getSemanticTokens(document) {
        const tokens = this.tokenize(document);
        return this.convertToSemanticTokens(tokens);
    }

    convertToSemanticTokens(tokens) {
        // Convert internal tokens to LSP semantic tokens format
        const semanticTokens = [];
        let previousLine = 0;
        let previousChar = 0;

        for (const token of tokens) {
            const deltaLine = token.line - previousLine;
            const deltaChar = deltaLine === 0 ? 
                token.start - previousChar : 
                token.start;
            
            semanticTokens.push(
                deltaLine,
                deltaChar,
                token.length,
                token.type,
                token.modifiers || 0
            );

            previousLine = token.line;
            previousChar = token.start;
        }

        return {
            data: semanticTokens
        };
    }
}

// Tokenizer implementations
class JavaScriptTokenizer {
    tokenize(text) {
        const tokens = [];
        const lines = text.split('\n');
        
        const keywords = ['function', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'return'];
        const types = ['string', 'number', 'boolean', 'object', 'array'];
        
        lines.forEach((line, lineIndex) => {
            // Find keywords
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                let match;
                while ((match = regex.exec(line)) !== null) {
                    tokens.push({
                        line: lineIndex,
                        start: match.index,
                        length: keyword.length,
                        type: 1, // keyword type
                        value: keyword
                    });
                }
            });
            
            // Find strings
            const stringRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
            let stringMatch;
            while ((stringMatch = stringRegex.exec(line)) !== null) {
                tokens.push({
                    line: lineIndex,
                    start: stringMatch.index,
                    length: stringMatch[0].length,
                    type: 2, // string type
                    value: stringMatch[0]
                });
            }
            
            // Find comments
            const commentRegex = /\/\/.*$/g;
            let commentMatch;
            while ((commentMatch = commentRegex.exec(line)) !== null) {
                tokens.push({
                    line: lineIndex,
                    start: commentMatch.index,
                    length: commentMatch[0].length,
                    type: 3, // comment type
                    value: commentMatch[0]
                });
            }
        });
        
        return tokens.sort((a, b) => {
            if (a.line !== b.line) return a.line - b.line;
            return a.start - b.start;
        });
    }
}

class TypeScriptTokenizer extends JavaScriptTokenizer {
    // TypeScript-specific tokenization
    tokenize(text) {
        const tokens = super.tokenize(text);
        
        // Add TypeScript-specific tokens
        const tsKeywords = ['interface', 'type', 'enum', 'namespace', 'module'];
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
            tsKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                let match;
                while ((match = regex.exec(line)) !== null) {
                    tokens.push({
                        line: lineIndex,
                        start: match.index,
                        length: keyword.length,
                        type: 4, // TypeScript keyword type
                        value: keyword
                    });
                }
            });
        });
        
        return tokens.sort((a, b) => {
            if (a.line !== b.line) return a.line - b.line;
            return a.start - b.start;
        });
    }
}

class PythonTokenizer {
    tokenize(text) {
        const tokens = [];
        const lines = text.split('\n');
        
        const keywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'import', 'from'];
        
        lines.forEach((line, lineIndex) => {
            // Find keywords
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                let match;
                while ((match = regex.exec(line)) !== null) {
                    tokens.push({
                        line: lineIndex,
                        start: match.index,
                        length: keyword.length,
                        type: 1,
                        value: keyword
                    });
                }
            });
            
            // Find strings
            const stringRegex = /(["']{3})(?:(?=(\\?))\2.)*?\1|(["'])(?:(?=(\\?))\4.)*?\3/g;
            let stringMatch;
            while ((stringMatch = stringRegex.exec(line)) !== null) {
                tokens.push({
                    line: lineIndex,
                    start: stringMatch.index,
                    length: stringMatch[0].length,
                    type: 2,
                    value: stringMatch[0]
                });
            }
            
            // Find comments
            const commentRegex = /#.*$/g;
            let commentMatch;
            while ((commentMatch = commentRegex.exec(line)) !== null) {
                tokens.push({
                    line: lineIndex,
                    start: commentMatch.index,
                    length: commentMatch[0].length,
                    type: 3,
                    value: commentMatch[0]
                });
            }
        });
        
        return tokens.sort((a, b) => {
            if (a.line !== b.line) return a.line - b.line;
            return a.start - b.start;
        });
    }
}

class JavaTokenizer {
    tokenize(text) {
        const tokens = [];
        const lines = text.split('\n');
        
        const keywords = ['public', 'private', 'protected', 'class', 'interface', 'void', 'int', 'String'];
        
        lines.forEach((line, lineIndex) => {
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                let match;
                while ((match = regex.exec(line)) !== null) {
                    tokens.push({
                        line: lineIndex,
                        start: match.index,
                        length: keyword.length,
                        type: 1,
                        value: keyword
                    });
                }
            });
            
            // Find strings
            const stringRegex = /"([^"\\]|\\.)*"/g;
            let stringMatch;
            while ((stringMatch = stringRegex.exec(line)) !== null) {
                tokens.push({
                    line: lineIndex,
                    start: stringMatch.index,
                    length: stringMatch[0].length,
                    type: 2,
                    value: stringMatch[0]
                });
            }
            
            // Find comments
            const commentRegex = /\/\*[\s\S]*?\*\/|\/\/.*$/g;
            let commentMatch;
            while ((commentMatch = commentRegex.exec(line)) !== null) {
                tokens.push({
                    line: lineIndex,
                    start: commentMatch.index,
                    length: commentMatch[0].length,
                    type: 3,
                    value: commentMatch[0]
                });
            }
        });
        
        return tokens.sort((a, b) => {
            if (a.line !== b.line) return a.line - b.line;
            return a.start - b.start;
        });
    }
}

module.exports = { SyntaxHighlighter };
