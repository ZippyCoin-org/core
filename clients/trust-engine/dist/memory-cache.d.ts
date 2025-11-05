export declare class MemoryCache {
    private cache;
    private ttlTimers;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    clear(): Promise<void>;
    size(): Promise<number>;
}
//# sourceMappingURL=memory-cache.d.ts.map