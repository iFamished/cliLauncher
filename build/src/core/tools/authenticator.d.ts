interface AuthResponse {
    access_token: string;
    client_token: string;
    uuid: string;
    name: string;
    selected_profile?: any;
    user_properties: string;
}
export declare function getAuth(username: string, password?: string, clientToken?: string): Promise<AuthResponse>;
export declare function validate(accessToken: string, clientToken: string): Promise<boolean>;
export declare function refreshAuth(accessToken: string, clientToken: string): Promise<AuthResponse>;
export declare function invalidate(accessToken: string, clientToken: string): Promise<boolean>;
export declare function signOut(username: string, password: string): Promise<boolean>;
export declare function auth_server(url: string): void;
export {};
