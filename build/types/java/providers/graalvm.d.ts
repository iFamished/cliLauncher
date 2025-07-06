export declare const graalvmProvider: {
    name: string;
    withJre: boolean;
    listVersions(): Promise<string[]>;
    getBinary(version: string, os: string, arch: string, imageType: string): Promise<{
        name: string;
        link: string;
    }>;
};
