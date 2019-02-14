declare module 'remove-array-items' {
    export default function remove_items<T>(arr: T[], start_index: number, remove_count: number): void;
}

declare module 'mini-signals' {
    export default class MiniSignal {
        constructor();
        handlers(exists: boolean): MiniSignalBinding[];
        has(node: MiniSignalBinding): boolean;
        dispatch(...args: any[]);
        add(fn: Function, thisArg?: any): MiniSignalBinding;
        once(fn: Function, thisArg?: any): MiniSignalBinding;
        detach(node: MiniSignalBinding): MiniSignal;
        detachAll(): MiniSignal;
    }
    export class MiniSignalBinding {
        constructor(fn: Function, once: boolean, thisArg: any);
        detach(): boolean;
    }
}

declare module 'ismobilejs' {
    export const apple: {
        phone: boolean,
        ipod: boolean,
        tablet: boolean,
        device: string,
    };
    export const android: {
        phone: boolean,
        tablet: boolean,
        device: string,
    };
    export const amazon: {
        phone: boolean,
        tablet: boolean,
        device: string,
    };
    export const windows: {
        phone: boolean,
        tablet: boolean,
        device: string,
    };
    export const seven_inch: boolean;
    export const other: {
        blackberry_10: boolean,
        blackberry: boolean,
        opera: boolean,
        firefox: boolean,
        chrome: boolean,
        device: string,
    };
    export const any: boolean;
    export const phone: boolean;
    export const tablet: boolean;
}

declare module 'pixi-gl-core' {
    interface WebGLState {}

    export interface ContextOptions {
        /**
         * Boolean that indicates if the canvas contains an alpha buffer.
         */
        alpha?: boolean;
        /**
         * Boolean that indicates that the drawing buffer has a depth buffer of at least 16 bits.
         */
        depth?: boolean;
        /**
         * Boolean that indicates that the drawing buffer has a stencil buffer of at least 8 bits.
         */
        stencil?: boolean;
        /**
         * Boolean that indicates whether or not to perform anti-aliasing.
         */
        antialias?: boolean;
        /**
         * Boolean that indicates that the page compositor will assume the drawing buffer contains colors with pre-multiplied alpha.
         */
        premultipliedAlpha?: boolean;
        /**
         * If the value is true the buffers will not be cleared and will preserve their values until cleared or overwritten by the author.
         */
        preserveDrawingBuffer?: boolean;
        /**
         *  Boolean that indicates if a context will be created if the system performance is low.
         */
        failIfMajorPerformanceCaveat?: boolean;
    }
    export function createContext(view: HTMLCanvasElement, options?: ContextOptions): WebGLRenderingContext;
    export function setVertexAttribArrays(gl: WebGLRenderingContext, attribs: Attrib[], state?: WebGLState): WebGLRenderingContext | undefined;
    export class GLBuffer {
        constructor(gl: WebGLRenderingContext, type: number, data?: ArrayBuffer | ArrayBufferView | any, drawType?: number);

        protected _updateID?: number;
        gl: WebGLRenderingContext;
        buffer: WebGLBuffer;
        type: number;
        drawType: number;
        data: ArrayBuffer | ArrayBufferView | any;

        upload(data?: ArrayBuffer | ArrayBufferView | any, offset?: number, dontBind?: boolean): void;
        bind(): void;

        static createVertexBuffer(gl: WebGLRenderingContext, data?: ArrayBuffer | ArrayBufferView | any, drawType?: number): GLBuffer;
        static createIndexBuffer(gl: WebGLRenderingContext, data?: ArrayBuffer | ArrayBufferView | any, drawType?: number): GLBuffer;
        static create(gl: WebGLRenderingContext, type: number, data: ArrayBuffer | ArrayBufferView | any, drawType: number): GLBuffer;

        destroy(): void;
    }
    export class GLFramebuffer {
        constructor(gl: WebGLRenderingContext, width: number, height: number);

        gl: WebGLRenderingContext;
        framebuffer: WebGLFramebuffer;
        stencil: WebGLRenderbuffer;
        texture: GLTexture;
        width: number;
        height: number;

        enableTexture(texture: GLTexture): void;
        enableStencil(): void;
        clear(r: number, g: number, b: number, a: number): void;
        bind(): void;
        unbind(): void;
        resize(width: number, height: number): void;
        destroy(): void;

        static createRGBA(gl: WebGLRenderingContext, width: number, height: number): GLFramebuffer;
        static createFloat32(gl: WebGLRenderingContext, width: number, height: number, data: ArrayBuffer | ArrayBufferView | any): GLFramebuffer;
    }
    export class GLShader {
        constructor(gl: WebGLRenderingContext, vertexSrc: string | string[], fragmentSrc: string | string[], precision?: string, attributeLocations?: { [key: string]: number });

        gl: WebGLRenderingContext;
        program?: WebGLProgram | null;
        uniformData: any;
        uniforms: any;
        attributes: any;

        bind(): this;
        destroy(): void;
    }
    export class GLTexture {
        constructor(gl: WebGLRenderingContext, width?: number, height?: number, format?: number, type?: number);

        gl: WebGLRenderingContext;
        texture: WebGLTexture;
        mipmap: boolean;
        premultiplyAlpha: boolean;
        width: number;
        height: number;
        format: number;
        type: number;

        upload(source: HTMLImageElement | ImageData | HTMLVideoElement | HTMLCanvasElement): void;
        uploadData(data: ArrayBuffer | ArrayBufferView, width: number, height: number): void;
        bind(location?: number): void;
        unbind(): void;
        minFilter(linear: boolean): void;
        magFilter(linear: boolean): void;
        enableMipmap(): void;
        enableLinearScaling(): void;
        enableNearestScaling(): void;
        enableWrapClamp(): void;
        enableWrapRepeat(): void;
        enableWrapMirrorRepeat(): void;
        destroy(): void;

        static fromSource(gl: WebGLRenderingContext, source: HTMLImageElement | ImageData | HTMLVideoElement | HTMLCanvasElement, premultipleAlpha?: boolean): GLTexture;
        static fromData(gl: WebGLRenderingContext, data: number[], width: number, height: number): GLTexture;
    }
    export interface Attrib {
        attribute: {
            location: number;
            size: number;
        };
        normalized: boolean;
        stride: number;
        start: number;
        buffer: ArrayBuffer;
    }
    export interface WebGLRenderingContextAttribute {
        buffer: WebGLBuffer;
        attribute: any;
        type: number;
        normalized: boolean;
        stride: number;
        start: number;
    }
    export interface AttribState {
        tempAttribState: Attrib[];
        attribState: Attrib[];
    }
    export class VertexArrayObject {
        static FORCE_NATIVE: boolean;

        constructor(gl: WebGLRenderingContext, state?: WebGLState);

        protected nativeVaoExtension: any;
        protected nativeState: AttribState;
        protected nativeVao: VertexArrayObject;
        gl: WebGLRenderingContext;
        attributes: Attrib[];
        indexBuffer: GLBuffer;
        dirty: boolean;

        bind(): this;
        unbind(): this;
        activate(): this;
        addAttribute(buffer: GLBuffer, attribute: Attrib, type?: number, normalized?: boolean, stride?: number, start?: number): this;
        addIndex(buffer: GLBuffer, options?: any): this;
        clear(): this;
        draw(type: number, size?: number, start?: number): this;
        destroy(): void;
    }
    export namespace shader {
        /**
         * @param gl {WebGLRenderingContext} The current WebGL context {WebGLProgram}
         * @param vertexSrc {string|string[]} The vertex shader source as an array of strings.
         * @param fragmentSrc {string|string[]} The fragment shader source as an array of strings.
         * @param attributeLocations {any} An attribute location map that lets you manually set the attribute locations
         * @return {WebGLProgram} the shader program
         */
        export function compileProgram(gl: WebGLRenderingContext, vertexSrc: string|string[], fragmentSrc: string|string[], attributeLocations: any): WebGLProgram;

        /**
         * @param type Type of value
         * @param size
         */
        export function defaultValue(type: string, size: number): Array<boolean>|Int32Array|Float32Array;

        /**
         * Extracts the attributes
         * @param gl {WebGLRenderingContext} The current WebGL rendering context
         * @param program {WebGLProgram} The shader program to get the attributes from
         * @return attributes {any}
         */
        export function extractAttributes(gl: WebGLRenderingContext, program: WebGLProgram): any;

        /**
         * Extracts the uniforms
         *
         * @param gl {WebGLRenderingContext} The current WebGL rendering context
         * @param program {WebGLProgram} The shader program to get the uniforms from
         * @return uniforms {any}
         */
        export function extractUniforms(gl: WebGLRenderingContext, program: WebGLProgram): any;

        /**
         * Extracts the attributes
         *
         * @param gl {WebGLRenderingContext} The current WebGL rendering context
         * @param uniforms {{[key: string]: any}} @mat ?
         * @return {any}
         */
        export function generateUniformAccessObject(gl: WebGLRenderingContext, uniform: {[key: string]: any}): any;

        /**
         * Sets the float precision on the shader. If the precision is already present this function will do nothing
         *
         * @param {string} src       the shader source
         * @param {string} precision The float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
         *
         * @return {string} modified shader source
         */
        export function setPrecision(src: string, precision: string): string;

        export function mapSize(type: string): number;

        export function mapType(gl: WebGLRenderingContext, type: string): string;
    }
}

declare module 'earcut' {
    export default function earcut(data: number[], hole_indices?: number[], dim?: number);
}
