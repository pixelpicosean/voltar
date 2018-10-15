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

declare module 'bit-twiddle' {}

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
}
