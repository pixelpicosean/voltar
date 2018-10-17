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

interface HTMLCanvasElement {
    _pixiId: string;
}
