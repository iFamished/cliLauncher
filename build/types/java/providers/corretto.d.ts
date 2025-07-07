export declare const correttoProvider: {
    name: string;
    withJre: boolean;
    listVersions(): Promise<string[]>;
    getBinary(version: string, os: string, arch: string, imageType: "jdk" | "jre"): Promise<{
        name: string;
        link: string;
    }>;
};
