export class MemoryCache {
  private cache: Map<string, { value: any; ttl: number }> = new Map();
  private ttlTimers: Map<string, NodeJS.Timeout> = new Map();

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.ttl) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
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

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.ttlTimers.forEach(timer => clearTimeout(timer));
    this.ttlTimers.clear();
  }

  async size(): Promise<number> {
    return this.cache.size;
  }
}
