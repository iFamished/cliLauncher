declare function main(): Promise<void>;
interface JavaBinary {
    path: string;
    version?: string;
}
declare function selectJavaBinary(use_new?: boolean): Promise<JavaBinary>;
declare const _default: {
    download: typeof main;
    select: typeof selectJavaBinary;
};
export default _default;
