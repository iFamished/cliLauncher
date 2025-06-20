export declare function get<T = any>(key: string): T | undefined;
export declare function has(key: string): boolean;
export declare function getAll(): Record<string, any>;
export declare function query<T = any>(predicate: (entry: [string, any]) => boolean): [string, T][];
export declare function set(key: string, value: any): void;
export declare function reset(): void;
