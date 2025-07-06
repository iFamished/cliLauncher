declare function main(): Promise<void>;
interface JavaBinary {
    path: string;
    version?: string;
}
declare function selectJavaBinary(use_new?: boolean): Promise<JavaBinary>;
declare function deleteJavaBinary(): Promise<void>;
declare const _default: {
    download: typeof main;
    select: typeof selectJavaBinary;
    delete: typeof deleteJavaBinary;
};
export default _default;
