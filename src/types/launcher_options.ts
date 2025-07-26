export interface Options {
    memory?: MemoryOptions;
    window_size?: WindowSize;
    fullscreen?: boolean;
    safe_exit?: boolean;
    max_sockets?: number;
    connections?: number;
    universal_game_dir?: boolean;
}

export interface FIXED_Options {
    memory: FIXED_MemoryOptions;
    window_size?: WindowSize;
    fullscreen: boolean;
    safe_exit: boolean;
    max_sockets: number;
    connections: number;
    universal_game_dir: boolean;
}

export interface FIXED_MemoryOptions {
    min: string;
    max: string;
}


export interface MemoryOptions {
    min?: string;
    max?: string;
}

export interface WindowSize {
    height?: number;
    width?: number;
}