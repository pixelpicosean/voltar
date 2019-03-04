declare module "*.json" {
    const value: any;
    export default value;
}

declare module "*.frag" {
    const value: string;
    export default value;
}
declare module "*.vert" {
    const value: string;
    export default value;
}

interface HTMLImageElement {
    _tex_id: string;
}

interface HTMLCanvasElement {
    _tex_id: string;
}

interface HTMLVideoElement {
    _tex_id: string;
    complete: boolean;
}
