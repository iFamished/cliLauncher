export declare const temurinProvider: {
    name: string;
    withJre: boolean;
    listVersions(): Promise<any>;
    getBinary(version: string, os: string, arch: string, imageType: string): Promise<{
        name: any;
        link: any;
    }>;
};
