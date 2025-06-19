import { LauncherAccount } from '../../../types/launcher';
import { Credentials } from '../../../types/account';
export declare class LauncherAccountManager {
    private filePath;
    private data;
    constructor(filePath?: string);
    private load;
    private save;
    addAccount(account: LauncherAccount): void;
    deleteAccount(id: string): boolean;
    hasAccount(cred: Credentials, provider: string): boolean;
    getAccount(id: string): LauncherAccount | null;
    selectAccount(id: string): LauncherAccount | null;
    listAccounts(): LauncherAccount[];
    getSelectedAccount(): LauncherAccount | undefined;
    chooseAccount(): Promise<LauncherAccount | null>;
}
export default LauncherAccountManager;
