/**
 * Z-Evo Extension Manager
 * Manages plugin architecture and cross-editor compatibility
 */

class ExtensionManager {
    constructor() {
        this.extensions = new Map();
        this.installedExtensions = [];
        this.extensionRegistry = new Map();
        this.compatibilityMatrix = new Map();
    }

    /**
     * Registers an extension with the system
     * @param {Object} extension - Extension object with metadata
     */
    registerExtension(extension) {
        this.extensionRegistry.set(extension.id, {
            id: extension.id,
            name: extension.name,
            version: extension.version,
            author: extension.author,
            description: extension.description,
            compatibility: extension.compatibility || [],
            dependencies: extension.dependencies || [],
            timestamp: new Date().toISOString()
        });

        console.log(`[EXTENSION] Registered extension: ${extension.name} (${extension.id})`);
    }

    /**
     * Installs an extension
     * @param {string} extensionId - ID of the extension to install
     */
    async installExtension(extensionId) {
        try {
            const extension = this.extensionRegistry.get(extensionId);
            if (!extension) {
                throw new Error(`Extension ${extensionId} not found in registry`);
            }

            // Simulate installation process
            this.installedExtensions.push(extensionId);
            
            console.log(`[EXTENSION] Installed: ${extension.name}`);
            return { success: true, extension: extension };
        } catch (error) {
            console.error(`[EXTENSION] Installation failed for ${extensionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Uninstalls an extension
     * @param {string} extensionId - ID of the extension to uninstall
     */
    async uninstallExtension(extensionId) {
        try {
            const index = this.installedExtensions.indexOf(extensionId);
            if (index === -1) {
                throw new Error(`Extension ${extensionId} is not installed`);
            }

            this.installedExtensions.splice(index, 1);
            
            console.log(`[EXTENSION] Uninstalled: ${extensionId}`);
            return { success: true };
        } catch (error) {
            console.error(`[EXTENSION] Uninstallation failed for ${extensionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Loads an extension
     * @param {string} extensionId - ID of the extension to load
     */
    async loadExtension(extensionId) {
        try {
            const extension = this.extensionRegistry.get(extensionId);
            if (!extension) {
                throw new Error(`Extension ${extensionId} not found`);
            }

            // Create a mock extension instance
            const extensionInstance = {
                id: extension.id,
                name: extension.name,
                activate: () => console.log(`[EXTENSION] Activated: ${extension.name}`),
                deactivate: () => console.log(`[EXTENSION] Deactivated: ${extension.name}`)
            };

            this.extensions.set(extensionId, extensionInstance);
            
            console.log(`[EXTENSION] Loaded: ${extension.name}`);
            return { success: true, instance: extensionInstance };
        } catch (error) {
            console.error(`[EXTENSION] Loading failed for ${extensionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unloads an extension
     * @param {string} extensionId - ID of the extension to unload
     */
    async unloadExtension(extensionId) {
        try {
            if (!this.extensions.has(extensionId)) {
                throw new Error(`Extension ${extensionId} is not loaded`);
            }

            const extension = this.extensions.get(extensionId);
            extension.deactivate();
            this.extensions.delete(extensionId);
            
            console.log(`[EXTENSION] Unloaded: ${extensionId}`);
            return { success: true };
        } catch (error) {
            console.error(`[EXTENSION] Unloading failed for ${extensionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Gets extension compatibility information
     * @param {string} extensionId - ID of the extension
     * @param {string} editorType - Type of editor
     */
    getCompatibility(extensionId, editorType) {
        const compatibility = this.compatibilityMatrix.get(`${extensionId}:${editorType}`);
        return compatibility || {
            supported: false,
            version: null,
            issues: ['Extension not tested with this editor type']
        };
    }

    /**
     * Sets compatibility information for an extension
     * @param {string} extensionId - ID of the extension
     * @param {string} editorType - Type of editor
     * @param {Object} compatibilityInfo - Compatibility information
     */
    setCompatibility(extensionId, editorType, compatibilityInfo) {
        this.compatibilityMatrix.set(`${extensionId}:${editorType}`, {
            ...compatibilityInfo,
            lastUpdated: new Date().toISOString()
        });

        console.log(`[EXTENSION] Set compatibility: ${extensionId} for ${editorType}`);
    }

    /**
     * Validates an extension
     * @param {Object} extension - Extension object to validate
     */
    validateExtension(extension) {
        const requiredFields = ['id', 'name', 'version', 'author', 'description'];
        const missingFields = requiredFields.filter(field => !extension[field]);

        if (missingFields.length > 0) {
            return {
                valid: false,
                errors: [`Missing required fields: ${missingFields.join(', ')}`]
            };
        }

        // Validate version format (simple check)
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(extension.version)) {
            return {
                valid: false,
                errors: ['Invalid version format. Expected: x.y.z']
            };
        }

        return {
            valid: true,
            errors: []
        };
    }

    /**
     * Gets all installed extensions
     */
    getInstalledExtensions() {
        return this.installedExtensions.map(id => this.extensionRegistry.get(id));
    }

    /**
     * Gets all loaded extensions
     */
    getLoadedExtensions() {
        return Array.from(this.extensions.values());
    }

    /**
     * Gets extension registry
     */
    getRegistry() {
        return Array.from(this.extensionRegistry.values());
    }

    /**
     * Updates an extension
     * @param {string} extensionId - ID of the extension to update
     * @param {Object} newMetadata - New metadata for the extension
     */
    async updateExtension(extensionId, newMetadata) {
        try {
            const oldExtension = this.extensionRegistry.get(extensionId);
            if (!oldExtension) {
                throw new Error(`Extension ${extensionId} not found`);
            }

            const updatedExtension = {
                ...oldExtension,
                ...newMetadata,
                updatedAt: new Date().toISOString()
            };

            this.extensionRegistry.set(extensionId, updatedExtension);
            
            console.log(`[EXTENSION] Updated: ${updatedExtension.name}`);
            return { success: true, extension: updatedExtension };
        } catch (error) {
            console.error(`[EXTENSION] Update failed for ${extensionId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Gets extension statistics
     */
    getStats() {
        return {
            totalRegistered: this.extensionRegistry.size,
            totalInstalled: this.installedExtensions.length,
            totalLoaded: this.extensions.size,
            compatibilityEntries: this.compatibilityMatrix.size,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = { ExtensionManager };
