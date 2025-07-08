declare function main(): Promise<void>;
interface JavaBinary {
    path: string;
    version?: string;
    provider?: string;
}
declare function selectJavaBinary(use_new: boolean, profileName?: string): Promise<JavaBinary>;
declare function deleteJavaBinary(): Promise<void>;
declare const _default: {
    download: typeof main;
    select: typeof selectJavaBinary;
    delete: typeof deleteJavaBinary;
};
export default _default;
