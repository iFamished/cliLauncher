import child from "child_process";
import Handler from "./handler";
import EventEmitter from "events";
import { ILauncherOptions } from "./types";
export default class MCLCore extends EventEmitter {
    options: ILauncherOptions | null;
    handler: Handler | null;
    launch(options: ILauncherOptions): Promise<child.ChildProcessWithoutNullStreams | null | undefined>;
    printVersion(): void;
    createRootDirectory(): void;
    createGameDirectory(): void;
    extractPackage(): Promise<void>;
    getModifyJson(): Promise<any>;
    startMinecraft(launchArguments: string[]): child.ChildProcessWithoutNullStreams | undefined;
}
