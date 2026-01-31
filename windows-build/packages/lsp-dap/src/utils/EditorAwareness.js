/**
 * Z-Evo Editor Awareness System
 * Implements contextual environment awareness with LSP/DAP availability checking
 */

class EditorAwareness {
    constructor() {
        this.editorTypes = new Set([
            'vscode',
            'neovim',
            'vim',
            'emacs',
            'sublime',
            'atom',
            'web_based',
            'custom'
        ]);
        
        this.editorCapabilities = new Map();
        this.editorConnections = new Map();
        this.lspSupport = new Map();
        this.dapSupport = new Map();
        this.uiAffordances = new Map();
        this.contextCache = new Map();
        this.lastDetection = new Map();
    }

    /**
     * Detects the current editor type
     * @param {Object} environment - Environment information
     */
    detectEditor(environment = {}) {
        const detectionMethods = [
            this.detectVSCode.bind(this),
            this.detectNeovim.bind(this),
            this.detectVim.bind(this),
            this.detectEmacs.bind(this),
            this.detectSublime.bind(this),
            this.detectAtom.bind(this),
            this.detectWebBased.bind(this),
            this.detectCustom.bind(this)
        ];

        for (const method of detectionMethods) {
            const result = method(environment);
            if (result) {
                this.lastDetection.set('editorType', {
                    type: result.type,
                    detectedAt: new Date().toISOString(),
                    confidence: result.confidence
                });
                
                console.log(`[EDITOR_AWARENESS] Detected editor: ${result.type} (confidence: ${result.confidence})`);
                return result;
            }
        }

        // Default to generic if no specific editor detected
        const genericResult = {
            type: 'generic',
            confidence: 0.5,
            capabilities: ['basic_text_editing', 'file_operations']
        };

        this.lastDetection.set('editorType', {
            type: 'generic',
            detectedAt: new Date().toISOString(),
            confidence: 0.5
        });

        return genericResult;
    }

    /**
     * Detects VS Code environment
     */
    detectVSCode(env) {
        // Check for VS Code specific environment variables or APIs
        if (typeof process !== 'undefined' && process.env && process.env.VSCODE_PID) {
            return {
                type: 'vscode',
                confidence: 0.9,
                capabilities: ['lsp_supported', 'dap_supported', 'extensions', 'integrated_terminal']
            };
        }
        
        // Check for VS Code extension host environment
        if (typeof vscode !== 'undefined' && vscode.extensions) {
            return {
                type: 'vscode',
                confidence: 0.95,
                capabilities: ['lsp_supported', 'dap_supported', 'extensions', 'workspace_features']
            };
        }

        return null;
    }

    /**
     * Detects Neovim environment
     */
    detectNeovim(env) {
        // Check for Neovim specific indicators
        if (typeof vim !== 'undefined' && vim.g && vim.g.loaded_netrw) {
            return {
                type: 'neovim',
                confidence: 0.85,
                capabilities: ['lsp_supported', 'plugin_system', 'lua_extensions']
            };
        }

        return null;
    }

    /**
     * Detects Vim environment
     */
    detectVim(env) {
        // Check for Vim specific indicators
        if (typeof vim !== 'undefined' && vim.eval) {
            return {
                type: 'vim',
                confidence: 0.8,
                capabilities: ['plugin_system', 'scripting']
            };
        }

        return null;
    }

    /**
     * Detects Emacs environment
     */
    detectEmacs(env) {
        // Check for Emacs specific indicators
        if (typeof emacs !== 'undefined' || (typeof process !== 'undefined' && process.env.EMACS)) {
            return {
                type: 'emacs',
                confidence: 0.75,
                capabilities: ['elisp_extensions', 'customizable_interface']
            };
        }

        return null;
    }

    /**
     * Detects Sublime Text environment
     */
    detectSublime(env) {
        // Check for Sublime Text specific indicators
        if (typeof sublime !== 'undefined' && sublime.packages_path) {
            return {
                type: 'sublime',
                confidence: 0.8,
                capabilities: ['package_control', 'python_extensions']
            };
        }

        return null;
    }

    /**
     * Detects Atom environment
     */
    detectAtom(env) {
        // Check for Atom specific indicators
        if (typeof atom !== 'undefined' && atom.packages) {
            return {
                type: 'atom',
                confidence: 0.85,
                capabilities: ['package_system', 'coffee_script_extensions']
            };
        }

        return null;
    }

    /**
     * Detects web-based editors
     */
    detectWebBased(env) {
        // Check for browser environment indicators
        if (typeof window !== 'undefined' && window.location) {
            // Could be a web-based editor like CodeSandbox, Repl.it, etc.
            return {
                type: 'web_based',
                confidence: 0.7,
                capabilities: ['browser_integration', 'limited_file_system']
            };
        }

        return null;
    }

    /**
     * Detects custom editors
     */
    detectCustom(env) {
        // Check for custom editor indicators
        if (env && env.editorType) {
            return {
                type: env.editorType,
                confidence: 0.6,
                capabilities: ['custom_features']
            };
        }

        return null;
    }

    /**
     * Checks LSP support for the detected editor
     * @param {string} editorType - Type of editor
     */
    checkLspSupport(editorType) {
        const lspCapabilities = {
            'vscode': {
                supported: true,
                version: '3.17',
                features: ['completion', 'hover', 'definition', 'references', 'document_symbols', 'formatting']
            },
            'neovim': {
                supported: true,
                version: '3.17',
                features: ['completion', 'hover', 'definition', 'references', 'document_symbols']
            },
            'vim': {
                supported: true,
                version: '3.16',
                features: ['completion', 'hover', 'definition']
            },
            'emacs': {
                supported: true,
                version: '3.16',
                features: ['completion', 'hover']
            },
            'sublime': {
                supported: true,
                version: '3.16',
                features: ['completion', 'hover', 'definition']
            },
            'atom': {
                supported: true,
                version: '3.16',
                features: ['completion', 'hover']
            },
            'web_based': {
                supported: 'partial',
                version: '3.16',
                features: ['completion', 'hover']
            },
            'generic': {
                supported: 'basic',
                version: '3.16',
                features: ['completion']
            }
        };

        const capabilities = lspCapabilities[editorType] || lspCapabilities['generic'];
        this.lspSupport.set(editorType, capabilities);

        console.log(`[EDITOR_AWARENESS] LSP support for ${editorType}: ${capabilities.supported}`);
        return capabilities;
    }

    /**
     * Checks DAP support for the detected editor
     * @param {string} editorType - Type of editor
     */
    checkDapSupport(editorType) {
        const dapCapabilities = {
            'vscode': {
                supported: true,
                version: '1.50',
                features: ['breakpoints', 'stepping', 'variables', 'stack_traces', 'evaluation']
            },
            'neovim': {
                supported: true,
                version: '1.48',
                features: ['breakpoints', 'variables', 'stack_traces']
            },
            'vim': {
                supported: true,
                version: '1.45',
                features: ['breakpoints', 'variables']
            },
            'emacs': {
                supported: true,
                version: '1.40',
                features: ['breakpoints', 'variables']
            },
            'sublime': {
                supported: 'partial',
                version: '1.35',
                features: ['breakpoints']
            },
            'atom': {
                supported: 'partial',
                version: '1.30',
                features: ['breakpoints']
            },
            'web_based': {
                supported: 'limited',
                version: '1.25',
                features: ['basic_debugging']
            },
            'generic': {
                supported: 'none',
                version: null,
                features: []
            }
        };

        const capabilities = dapCapabilities[editorType] || dapCapabilities['generic'];
        this.dapSupport.set(editorType, capabilities);

        console.log(`[EDITOR_AWARENESS] DAP support for ${editorType}: ${capabilities.supported}`);
        return capabilities;
    }

    /**
     * Checks UI affordances for the editor
     * @param {string} editorType - Type of editor
     * @param {Object} uiEnvironment - UI environment information
     */
    checkUiAffordances(editorType, uiEnvironment = {}) {
        const uiCapabilities = {
            'vscode': {
                statusBar: true,
                sideBar: true,
                notifications: true,
                quickPick: true,
                treeView: true,
                webview: true,
                terminal: true
            },
            'neovim': {
                statusBar: true,
                sideBar: 'plugin_dependent',
                notifications: 'plugin_dependent',
                quickPick: 'plugin_dependent',
                treeView: 'plugin_dependent',
                webview: false,
                terminal: true
            },
            'vim': {
                statusBar: true,
                sideBar: 'plugin_dependent',
                notifications: 'plugin_dependent',
                quickPick: 'plugin_dependent',
                treeView: 'plugin_dependent',
                webview: false,
                terminal: 'shell_integration'
            },
            'emacs': {
                statusBar: true,
                sideBar: 'window_system',
                notifications: 'minibuffer',
                quickPick: 'completing_read',
                treeView: 'dired_mode',
                webview: false,
                terminal: 'shell_integration'
            },
            'sublime': {
                statusBar: true,
                sideBar: true,
                notifications: true,
                quickPick: true,
                treeView: true,
                webview: 'panel_system',
                terminal: 'plugin_dependent'
            },
            'atom': {
                statusBar: true,
                sideBar: true,
                notifications: true,
                quickPick: true,
                treeView: true,
                webview: true,
                terminal: 'plugin_dependent'
            },
            'web_based': {
                statusBar: 'browser_dependent',
                sideBar: 'page_layout',
                notifications: 'browser_notifications',
                quickPick: 'custom_ui',
                treeView: 'custom_ui',
                webview: 'iframe',
                terminal: 'simulated'
            },
            'generic': {
                statusBar: 'basic',
                sideBar: 'none',
                notifications: 'console',
                quickPick: 'input_prompt',
                treeView: 'none',
                webview: false,
                terminal: 'none'
            }
        };

        const capabilities = uiCapabilities[editorType] || uiCapabilities['generic'];
        this.uiAffordances.set(editorType, {
            ...capabilities,
            checkedAt: new Date().toISOString(),
            environment: uiEnvironment
        });

        console.log(`[EDITOR_AWARENESS] UI affordances for ${editorType}: ${Object.keys(capabilities).length} capabilities`);
        return capabilities;
    }

    /**
     * Validates context realism for the current environment
     * @param {Object} context - Context to validate
     */
    validateContextRealism(context) {
        const editorType = this.getCurrentEditorType();
        if (!editorType) {
            return {
                realistic: false,
                issues: ['No editor type detected'],
                suggestions: ['Run editor detection first']
            };
        }

        const lspSupport = this.getLspSupport(editorType);
        const dapSupport = this.getDapSupport(editorType);
        const uiAffordances = this.getUiAffordances(editorType);

        // Validate context against actual capabilities
        const issues = [];
        const suggestions = [];

        if (context.requiresLsp && !lspSupport.supported) {
            issues.push(`LSP required but not supported by ${editorType}`);
            suggestions.push(`Use basic text operations instead of LSP features`);
        }

        if (context.requiresDap && !dapSupport.supported) {
            issues.push(`DAP required but not supported by ${editorType}`);
            suggestions.push(`Implement fallback debugging methods`);
        }

        if (context.requiresAdvancedUi && !uiAffordances.sideBar) {
            issues.push(`Advanced UI required but not available in ${editorType}`);
            suggestions.push(`Use alternative UI approach for ${editorType}`);
        }

        const realistic = issues.length === 0;

        console.log(`[EDITOR_AWARENESS] Context validation: ${realistic ? 'REALISTIC' : 'UNREALISTIC'}`);
        
        return {
            realistic,
            issues,
            suggestions,
            capabilities: {
                lsp: lspSupport,
                dap: dapSupport,
                ui: uiAffordances
            }
        };
    }

    /**
     * Gets current editor type
     */
    getCurrentEditorType() {
        const detection = this.lastDetection.get('editorType');
        return detection ? detection.type : null;
    }

    /**
     * Gets LSP support information
     * @param {string} editorType - Type of editor
     */
    getLspSupport(editorType) {
        return this.lspSupport.get(editorType) || this.checkLspSupport(editorType || this.getCurrentEditorType());
    }

    /**
     * Gets DAP support information
     * @param {string} editorType - Type of editor
     */
    getDapSupport(editorType) {
        return this.dapSupport.get(editorType) || this.checkDapSupport(editorType || this.getCurrentEditorType());
    }

    /**
     * Gets UI affordances information
     * @param {string} editorType - Type of editor
     */
    getUiAffordances(editorType) {
        return this.uiAffordances.get(editorType) || this.checkUiAffordances(editorType || this.getCurrentEditorType());
    }

    /**
     * Gets editor capabilities
     * @param {string} editorType - Type of editor
     */
    getEditorCapabilities(editorType) {
        const capabilities = {
            editorType: editorType,
            lsp: this.getLspSupport(editorType),
            dap: this.getDapSupport(editorType),
            ui: this.getUiAffordances(editorType),
            detectedAt: this.lastDetection.get('editorType')?.detectedAt,
            detectionConfidence: this.lastDetection.get('editorType')?.confidence
        };

        return capabilities;
    }

    /**
     * Performs full environment assessment
     * @param {Object} environment - Environment information
     */
    async assessEnvironment(environment = {}) {
        const editorDetection = this.detectEditor(environment);
        const editorType = editorDetection.type;

        const capabilities = {
            editor: editorDetection,
            lsp: this.checkLspSupport(editorType),
            dap: this.checkDapSupport(editorType),
            ui: this.checkUiAffordances(editorType, environment)
        };

        console.log(`[EDITOR_AWARENESS] Full environment assessment completed for ${editorType}`);
        
        return {
            ...capabilities,
            timestamp: new Date().toISOString(),
            assessedBy: 'EditorAwarenessSystem'
        };
    }

    /**
     * Gets awareness statistics
     */
    getStats() {
        return {
            totalEditorTypes: this.editorTypes.size,
            lspChecks: this.lspSupport.size,
            dapChecks: this.dapSupport.size,
            uiChecks: this.uiAffordances.size,
            detections: this.lastDetection.size,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Resets awareness system
     */
    reset() {
        this.editorCapabilities.clear();
        this.editorConnections.clear();
        this.lspSupport.clear();
        this.dapSupport.clear();
        this.uiAffordances.clear();
        this.contextCache.clear();
        this.lastDetection.clear();
        
        console.log('[EDITOR_AWARENESS] System reset');
    }
}

module.exports = { EditorAwareness };
