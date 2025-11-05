"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.ttlTimers = new Map();
    }
    async get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.ttl) {
            this.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlSeconds = 3600) {
        const ttl = Date.now() + (ttlSeconds * 1000);
        // Clear existing timer if any
        const existingTimer = this.ttlTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Set new value
        this.cache.set(key, { value, ttl });
        // Set new timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttlSeconds * 1000);
        this.ttlTimers.set(key, timer);
    }
    async delete(key) {
        this.cache.delete(key);
        const timer = this.ttlTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.ttlTimers.delete(key);
        }
    }
    async exists(key) {
        return this.cache.has(key);
    }
    async keys(pattern) {
        const keys = Array.from(this.cache.keys());
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return keys.filter(key => regex.test(key));
    }
    async clear() {
        this.cache.clear();
        this.ttlTimers.forEach(timer => clearTimeout(timer));
        this.ttlTimers.clear();
    }
    async size() {
        return this.cache.size;
    }
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=memory-cache.js.map