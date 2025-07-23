import { LauncherAccount } from "../../../../../types/launcher";
import { Credentials, IAuthMetadata, IAuthProvider } from "../../../../../types/account";
export default class MojangAuth implements IAuthProvider {
    private credentials;
    private account;
    private server;
    metadata: IAuthMetadata;
    constructor(email: string, password: string);
    is_token(token: LauncherAccount): boolean;
    set_credentials(email: string, password: string): Credentials;
    set_current(account: LauncherAccount): Promise<LauncherAccount>;
    auth_lib(): Promise<string>;
    authenticate(): Promise<LauncherAccount | null>;
    token(): Promise<LauncherAccount | null>;
}
