export interface Bar {
    increment: () => void;
    update: (amount: number) => void;
    total: (newTotal?: number) => void;
    stop: (fail?: boolean) => void;
}
export declare class ProgressReport {
    private bars;
    private spinners;
    private renderInterval;
    constructor();
    private startRenderLoop;
    private stopRenderLoop;
    private task_logs;
    create(name: string, total: number): Bar | null;
    has(name: string): boolean;
    start(): void;
    update(name: string, amount?: number): void;
    updateTo(name: string, value: number): void;
    setTotal(name: string, total: number): void;
    stop(name: string, fail?: boolean): void;
    stopAll(fail?: boolean): void;
    private renderAll;
}
export declare class Logger {
    private _progress;
    constructor();
    log(msg: string): void;
    success(msg: string): void;
    progress(): ProgressReport;
    warn(msg: string): void;
    error(...msg: string[]): void;
}
