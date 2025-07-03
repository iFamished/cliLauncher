import { LauncherAccount } from '../../../types/launcher';
import { Credentials } from '../../../types/account';
export declare class LauncherAccountManager {
    private filePath;
    private data;
    private key;
    constructor(filePath?: string);
    private ensureKey;
    load(): Promise<void>;
    save(): Promise<void>;
    reset(): void;
    addAccount(account: LauncherAccount): Promise<void>;
    deleteAccount(id: string): Promise<boolean>;
    hasAccount(cred: Credentials, provider: string): boolean;
    getAccount(id: string): LauncherAccount | null;
    selectAccount(id: string): Promise<LauncherAccount | null>;
    listAccounts(): LauncherAccount[];
    getSelectedAccount(): LauncherAccount | undefined;
    chooseAccount(): Promise<LauncherAccount | null>;
}
export default LauncherAccountManager;
