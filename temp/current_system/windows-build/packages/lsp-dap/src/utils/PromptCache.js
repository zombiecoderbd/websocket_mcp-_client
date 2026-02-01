/**
 * Z-Evo Prompt Cache System
 * Implements persona caching and prompt optimization
 */

class PromptCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.accessLog = new Map();
        this.maxSize = options.maxSize || 1000;
        this.ttl = options.ttl || 3600000; // 1 hour default
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Stores a prompt in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = this.ttl) {
        // Check if cache is at max size
        if (this.cache.size >= this.maxSize) {
            // Evict oldest entry (LRU eviction)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.accessLog.delete(firstKey);
            this.stats.evictions++;
        }

        const entry = {
            value: value,
            timestamp: Date.now(),
            ttl: ttl
        };

        this.cache.set(key, entry);
        this.accessLog.set(key, { lastAccess: Date.now(), accessCount: 1 });

        console.log(`[CACHE] Stored: ${key}`);
    }

    /**
     * Retrieves a value from cache
     * @param {string} key - Cache key
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }

        // Check if entry is expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.accessLog.delete(key);
            this.stats.misses++;
            console.log(`[CACHE] Expired: ${key}`);
            return undefined;
        }

        // Update access log
        const accessInfo = this.accessLog.get(key) || { accessCount: 0 };
        this.accessLog.set(key, {
            lastAccess: Date.now(),
            accessCount: accessInfo.accessCount + 1
        });

        this.stats.hits++;
        console.log(`[CACHE] Retrieved: ${key}`);

        return entry.value;
    }

    /**
     * Checks if a key exists in cache
     * @param {string} key - Cache key
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }

        // Check if entry is expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.accessLog.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Deletes a key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        const existed = this.cache.has(key);
        this.cache.delete(key);
        this.accessLog.delete(key);
        
        if (existed) {
            console.log(`[CACHE] Deleted: ${key}`);
        }
    }

    /**
     * Clears the entire cache
     */
    clear() {
        this.cache.clear();
        this.accessLog.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        
        console.log('[CACHE] Cleared all entries');
    }

    /**
     * Gets cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses || 1),
            keys: Array.from(this.cache.keys()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Cleans expired entries
     */
    cleanExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                this.accessLog.delete(key);
                cleaned++;
            }
        }

        console.log(`[CACHE] Cleaned ${cleaned} expired entries`);
        return cleaned;
    }

    /**
     * Gets access statistics for a key
     * @param {string} key - Cache key
     */
    getAccessStats(key) {
        return this.accessLog.get(key);
    }

    /**
     * Gets the most accessed items
     * @param {number} count - Number of items to return
     */
    getMostAccessed(count = 10) {
        const sorted = Array.from(this.accessLog.entries())
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, count)
            .map(([key, stats]) => ({ key, ...stats }));

        return sorted;
    }

    /**
     * Gets least recently used items
     * @param {number} count - Number of items to return
     */
    getLeastRecentlyUsed(count = 10) {
        const sorted = Array.from(this.accessLog.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
            .slice(0, count)
            .map(([key, stats]) => ({ key, ...stats }));

        return sorted;
    }

    /**
     * Warms up the cache with initial values
     * @param {Object} entries - Object with key-value pairs to preload
     */
    warm(entries) {
        for (const [key, value] of Object.entries(entries)) {
            this.set(key, value);
        }

        console.log(`[CACHE] Warmed up with ${Object.keys(entries).length} entries`);
    }

    /**
     * Gets cache size in bytes (approximate)
     */
    getSizeBytes() {
        let size = 0;
        for (const [key, entry] of this.cache.entries()) {
            size += JSON.stringify([key, entry]).length;
        }
        return size;
    }
}

module.exports = { PromptCache };
