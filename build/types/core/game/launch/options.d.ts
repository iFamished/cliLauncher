import { LauncherProfile } from '../../../types/launcher';
import { FIXED_Options, Options } from '../../../types/launcher_options';
export declare class LauncherOptionsManager {
    private filePath;
    private default_filePath;
    private data;
    private currentProfile?;
    constructor(filePath?: string);
    setProfile(profile?: LauncherProfile): void;
    private load;
    private save;
    reset(): void;
    configureOptions(): Promise<void>;
    getFixedOptions(): FIXED_Options;
    setOption<K extends keyof Options>(key: K, value: Options[K]): void;
}
export declare function promptNumber(message: string, opts?: {
    min?: number;
    max?: number;
    default?: number;
}): Promise<number>;
export declare function promptString(message: string, opts?: {
    default?: string;
}): Promise<string>;
export declare function promptEditor(message: string, opts?: {
    default?: string;
}): Promise<string>;
export declare function promptBoolean(message: string, defaultValue?: boolean): Promise<boolean>;
export default LauncherOptionsManager;
