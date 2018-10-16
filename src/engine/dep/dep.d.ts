declare module 'remove-array-items' {
    export default function remove_items<T>(arr: T[], start_index: number, remove_count: number): void;
}

declare module 'eventemitter3' {
    export default class EventEmitter {
        listeners(event: string): Function[];
        emit(event: string, ...args: any[]): boolean;
        on(event: string, fn: Function, context?: any): EventEmitter;
        once(event: string, fn: Function, context?: any): EventEmitter;
        removeListener(event: string, fn: Function, context?: any, once?: boolean): EventEmitter;
        removeAllListeners(event: string): EventEmitter;

        off(event: string, fn: Function, context?: any, once?: boolean): EventEmitter;
        addListener(event: string, fn: Function, context?: any): EventEmitter;
    }
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

// https://github.com/englercj/resource-loader/
// v2.1.1
declare module 'resource-loader' {
    interface LoaderOptions {
        crossOrigin?: boolean | string;
        loadType?: number;
        xhrType?: string;
        metaData?: any;
    }
    interface ResourceDictionary {
        [index: string]: Resource;
    }
    import MiniSignal from 'mini-signals';
    export default class Loader {
        baseUrl: string;
        progress: number;
        loading: boolean;
        defaultQueryString: string;
        resources: ResourceDictionary;

        onProgress: MiniSignal;
        onError: MiniSignal;
        onLoad: MiniSignal;
        onStart: MiniSignal;
        onComplete: MiniSignal;

        concurrency: number;

        constructor(baseUrl?: string, concurrency?: number);

        add(name: string, url: string, options?: LoaderOptions, cb?: () => void): Loader;
        add(url: string, options?: LoaderOptions, cb?: () => void): Loader;
        //todo I am not sure of object literal notional (or its options) so just allowing any but would love to improve this
        add(obj: any, options?: LoaderOptions, cb?: () => void): Loader;

        before(fn: Function): Loader;
        pre(fn: Function): Loader;

        after(fn: Function): Loader;
        use(fn: Function): Loader;

        reset(): void;

        load(cb?: (loader: Loader, object: any) => void): Loader;
    }
    interface Texture { }
    interface TextureDictionary {
        [index: string]: Texture;
    }
    class Resource {
        isJson: boolean;
        metadata: any;

        name: string;
        texture: Texture;
        textures: TextureDictionary;
        url: string;
        data: any;
        crossOrigin: boolean | string;
        loadType: number;
        xhrType: string;
        error: Error;
        xhr: XMLHttpRequest;
        SVGMetadataElement: any;
        bitmap_font: any;

        static setExtensionLoadType(extname: string, loadType: number): void;
        static setExtensionXhrType(extname: string, xhrType: number): void;

        constructor(name?: string, url?: string | string[], options?: LoaderOptions);

        complete(): void;
        load(cb?: () => void): void;
    }
    namespace Resource {
        const LOAD_TYPE: {
            XHR: number;
            IMAGE: number;
            AUDIO: number;
            VIDEO: number;
        };
        const XHR_READ_STATE: {
            UNSENT: number;
            OPENED: number;
            HEADERS_RECIEVED: number;
            LOADING: number;
            DONE: number;
        };
        const XHR_RESPONSE_TYPE: {
            DEFAULT: number;
            BUFFER: number;
            BLOB: number;
            DOCUMENT: number;
            JSON: number;
            TEXT: number;
        };
        const TYPE: {
            UNKNOWN: number;
            JSON: number;
            XML: number;
            IMAGE: number;
            AUDIO: number;
            VIDEO: number;
            TEXT: number;
        };
    }
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
        constructor(gl: WebGLRenderingContext, type: number, data: ArrayBuffer | ArrayBufferView | any, drawType: number);

        protected _updateID?: number;
        gl: WebGLRenderingContext;
        buffer: WebGLBuffer;
        type: number;
        drawType: number;
        data: ArrayBuffer | ArrayBufferView | any;

        upload(data?: ArrayBuffer | ArrayBufferView | any, offset?: number, dontBind?: boolean): void;
        bind(): void;

        static createVertexBuffer(gl: WebGLRenderingContext, data: ArrayBuffer | ArrayBufferView | any, drawType: number): GLBuffer;
        static createIndexBuffer(gl: WebGLRenderingContext, data: ArrayBuffer | ArrayBufferView | any, drawType: number): GLBuffer;
        static create(gl: WebGLRenderingContext, type: number, data: ArrayBuffer | ArrayBufferView | any, drawType: number): GLBuffer;

        destroy(): void;
    }
    export class GLFramebuffer {
        constructor(gl: WebGLRenderingContext, width: number, height: number);

        gl: WebGLRenderingContext;
        frameBuffer: WebGLFramebuffer;
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

        static createRGBA(gl: WebGLRenderingContext, width: number, height: number, data: ArrayBuffer | ArrayBufferView | any): GLFramebuffer;
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
}
