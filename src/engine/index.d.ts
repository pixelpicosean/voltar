// https://github.com/primus/eventemitter3
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

// remove-array-items
declare module 'remove-array-items' {
    export default function remove_items<T>(arr: T[], startIdx: number, removeCount: number): void;
}

// https://github.com/englercj/resource-loader/
// v2.0.9
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
    interface TextureDictionary {
        [index: string]: Texture;
    }
    class Resource {
        isJson: boolean;
        metadata: any;
        spineData: any;
        spineAtlas: any;

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

declare module 'engine/audio' {
    export class SoundLibrary {
        context: IMediaContext;
        supported: boolean;
        useLegacy: boolean;
        volume_all: number;
        speed_all: number;
        filtersAll: Filter[];
        static instance: SoundLibrary;
        constructor(Resource: Function);
        static init(Resource: Function, Loader: Function, shared: loaders.Loader): SoundLibrary;
        add(alias: string, options: Options | string | ArrayBuffer | HTMLAudioElement | Sound): Sound;
        add(map: SoundMap, globalOptions?: Options): {
            [id: string]: Sound;
        };
        remove(alias: string): SoundLibrary;
        toggle_pause_all(): boolean;
        pause_all(): SoundLibrary;
        resume_all(): SoundLibrary;
        toggle_mute_all(): boolean;
        mute_all(): SoundLibrary;
        unmute_all(): SoundLibrary;
        remove_all(): SoundLibrary;
        stop_all(): SoundLibrary;
        exists(alias: string, assert?: boolean): boolean;
        find(alias: string): Sound;
        play(alias: string,
             options?: PlayOptions | CompleteCallback | string): IMediaInstance | Promise<IMediaInstance>;
        stop(alias: string): Sound;
        pause(alias: string): Sound;
        resume(alias: string): Sound;
        volume(alias: string, volume?: number): number;
        speed(alias: string, speed?: number): number;
        duration(alias: string): number;
        init(): SoundLibrary;
        close(): SoundLibrary;
    }

    export class Filter {
        destination: AudioNode;
        source: AudioNode;
        constructor(destination: AudioNode, source?: AudioNode);
        connect(destination: AudioNode): void;
        disconnect(): void;
        destroy(): void;
    }
    export class Filterable {
        constructor(input: AudioNode, output: AudioNode);
        readonly destination: AudioNode;
        filters: Filter[];
        destroy(): void;
    }
    export interface Options {
        autoPlay?: boolean;
        preaload?: boolean;
        singleInstance?: boolean;
        volume?: number;
        speed?: number;
        complete?: CompleteCallback;
        loaded?: LoadedCallback;
        preload?: boolean;
        loop?: boolean;
        url?: string;
        source?: ArrayBuffer | HTMLAudioElement;
        sprites?: {
            [id: string]: SoundSpriteData;
        };
    }
    export interface PlayOptions {
        start?: number;
        end?: number;
        speed?: number;
        loop?: boolean;
        volume?: number;
        sprite?: string;
        muted?: boolean;
        complete?: CompleteCallback;
        loaded?: LoadedCallback;
    }
    type LoadedCallback = (err: Error, sound?: Sound, instance?: IMediaInstance) => void;
    type CompleteCallback = (sound: Sound) => void;
    export class Sound {
        isLoaded: boolean;
        isPlaying: boolean;
        autoPlay: boolean;
        singleInstance: boolean;
        preload: boolean;
        url: string;
        options: Options;
        media: IMedia;
        static from(source: string | Options | ArrayBuffer | HTMLAudioElement): Sound;
        constructor(media: IMedia, options: Options);
        readonly context: IMediaContext;
        pause(): Sound;
        resume(): Sound;
        paused: boolean;
        speed: number;
        filters: Filter[];
        addSprites(alias: string, data: SoundSpriteData): SoundSprite;
        addSprites(sprites: {
            [id: string]: SoundSpriteData;
        }): SoundSprites;
        destroy(): void;
        removeSprites(alias?: string): Sound;
        readonly isPlayable: boolean;
        stop(): Sound;
        play(alias: string, callback?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;
        play(source?: string | PlayOptions | CompleteCallback,
             callback?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;
        refresh(): void;
        refreshPaused(): void;
        volume: number;
        muted: boolean;
        loop: boolean;
        readonly instances: IMediaInstance[];
        readonly sprites: SoundSprites;
        readonly duration: number;
        autoPlayStart(): IMediaInstance;
    }
    type SoundMap = {
        [id: string]: Options | string | ArrayBuffer | HTMLAudioElement;
    };
    export interface IMedia {
        filters: Filter[];
        readonly context: IMediaContext;
        readonly duration: number;
        readonly isPlayable: boolean;
        create(): IMediaInstance;
        init(sound: Sound): void;
        load(callback?: LoadedCallback): void;
        destroy(): void;
    }
    export interface IMediaContext {
        muted: boolean;
        volume: number;
        speed: number;
        paused: boolean;
        filters: Filter[];
        toggleMute(): boolean;
        togglePause(): boolean;
        refresh(): void;
        destroy(): void;
        audioContext: AudioContext;
    }
    export interface IMediaInstance {
        id: number;
        progress: number;
        paused: boolean;
        volume: number;
        speed: number;
        loop: boolean;
        muted: boolean;
        stop(): void;
        refresh(): void;
        refreshPaused(): void;
        init(parent: IMedia): void;
        play(options: PlayOptions): void;
        destroy(): void;
        toString(): string;
        once(event: string, fn: () => void, context?: any): this;
        on(event: string, fn: Function, context?: any): this;
        off(event: string, fn: Function, context?: any, once?: boolean): this;
    }
    export interface SoundSpriteData {
        start: number;
        end: number;
        speed?: number;
    }
    type SoundSprites = {
        [id: string]: SoundSprite;
    };
    export class SoundSprite {
        parent: Sound;
        start: number;
        end: number;
        speed: number;
        duration: number;
        constructor(parent: Sound, options: SoundSpriteData);
        play(complete?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;
        destroy(): void;
    }
    interface RenderOptions {
        width?: number;
        height?: number;
        fill?: string | CanvasPattern | CanvasGradient;
    }
    type ExtensionMap = {
        [key: string]: boolean;
    };
    export class SoundUtils {
        static extensions: string[];
        static supported: ExtensionMap;
        static resolveUrl(source: string | loader.Resource): string;
        static sineTone(hertz?: number, seconds?: number): Sound;
        static render(sound: Sound, options?: RenderOptions): BaseTexture;
        static playOnce(url: string, callback?: (err?: Error) => void): string;
    }
    export const utils: typeof SoundUtils;
    export namespace filters {
        class DistortionFilter extends Filter {
            constructor(amount?: number);
            amount: number;
            destroy(): void;
        }
        class EqualizerFilter extends Filter {
            static F32: number;
            static F64: number;
            static F125: number;
            static F250: number;
            static F500: number;
            static F1K: number;
            static F2K: number;
            static F4K: number;
            static F8K: number;
            static F16K: number;
            bands: BiquadFilterNode[];
            bandsMap: {
                [id: number]: BiquadFilterNode;
            };
            constructor(f32?: number, f64?: number, f125?: number, f250?: number, f500?: number,
                        f1k?: number, f2k?: number, f4k?: number, f8k?: number, f16k?: number);
            setGain(frequency: number, gain?: number): void;
            getGain(frequency: number): number;
            f32: number;
            f64: number;
            f125: number;
            f250: number;
            f500: number;
            f1k: number;
            f2k: number;
            f4k: number;
            f8k: number;
            f16k: number;
            reset(): void;
            destroy(): void;
        }
        class MonoFilter extends Filter {
            constructor();
            destroy(): void;
        }
        class ReverbFilter extends Filter {
            constructor(seconds?: number, decay?: number, reverse?: boolean);
            seconds: number;
            decay: number;
            reverse: boolean;
            destroy(): void;
        }
        class StereoFilter extends Filter {
            constructor(pan?: number);
            pan: number;
            destroy(): void;
        }
        class TelephoneFilter extends Filter {
            constructor();
        }
    }
    export namespace htmlaudio {
        class HTMLAudioInstance extends EventEmitter implements IMediaInstance {
            static PADDING: number;
            id: number;
            constructor(parent: HTMLAudioMedia);
            readonly progress: number;
            paused: boolean;
            init(media: HTMLAudioMedia): void;
            stop(): void;
            speed: number;
            volume: number;
            loop: boolean;
            muted: boolean;
            refresh(): void;
            refreshPaused(): void;
            play(options: PlayOptions): void;
            destroy(): void;
            toString(): string;

            on(msg: string, callback: Function, context?: any): void;
            off(msg: string, callback: Function, context?: any): void;
            once(msg: string, callback: Function, context?: any): void;
        }
        class HTMLAudioContext extends EventEmitter implements IMediaContext {
            speed: number;
            muted: boolean;
            volume: number;
            paused: boolean;
            constructor();
            refresh(): void;
            refreshPaused(): void;
            filters: Filter[];
            readonly audioContext: AudioContext;
            toggleMute(): boolean;
            togglePause(): boolean;
            destroy(): void;
        }
        class HTMLAudioMedia extends EventEmitter implements IMedia {
            parent: Sound;
            init(parent: Sound): void;
            create(): HTMLAudioInstance;
            readonly isPlayable: boolean;
            readonly duration: number;
            readonly context: HTMLAudioContext;
            filters: Filter[];
            destroy(): void;
            readonly source: HTMLAudioElement;
            load(callback?: LoadedCallback): void;
        }
    }
    export namespace webaudio {
        class WebAudioContext extends Filterable implements IMediaContext {
            compressor: DynamicsCompressorNode;
            analyser: AnalyserNode;
            speed: number;
            muted: boolean;
            volume: number;
            events: EventEmitter;
            constructor();
            playEmptySound(): void;
            static readonly AudioContext: typeof AudioContext;
            static readonly OfflineAudioContext: typeof OfflineAudioContext;
            destroy(): void;
            readonly audioContext: AudioContext;
            readonly offlineContext: OfflineAudioContext;
            paused: boolean;
            refresh(): void;
            refreshPaused(): void;
            toggleMute(): boolean;
            togglePause(): boolean;
            decode(arrayBuffer: ArrayBuffer, callback: (err?: Error, buffer?: AudioBuffer) => void): void;
        }
        class WebAudioInstance extends EventEmitter implements IMediaInstance {
            id: number;
            constructor(media: WebAudioMedia);
            stop(): void;
            speed: number;
            volume: number;
            muted: boolean;
            loop: boolean;
            refresh(): void;
            refreshPaused(): void;
            play(options: PlayOptions): void;
            readonly progress: number;
            paused: boolean;
            destroy(): void;
            toString(): string;
            init(media: WebAudioMedia): void;

            on(msg: string, callback: Function, context?: any): void;
            off(msg: string, callback: Function, context?: any): void;
            once(msg: string, callback: Function, context?: any): void;
        }
        class WebAudioMedia implements IMedia {
            parent: Sound;
            source: ArrayBuffer;
            init(parent: Sound): void;
            destroy(): void;
            create(): WebAudioInstance;
            readonly context: WebAudioContext;
            readonly isPlayable: boolean;
            filters: Filter[];
            readonly duration: number;
            buffer: AudioBuffer;
            readonly nodes: WebAudioNodes;
            load(callback?: LoadedCallback): void;
        }
        interface SourceClone {
            source: AudioBufferSourceNode;
            gain: GainNode;
        }
        class WebAudioNodes extends Filterable {
            static BUFFER_SIZE: number;
            bufferSource: AudioBufferSourceNode;
            script: ScriptProcessorNode;
            gain: GainNode;
            analyser: AnalyserNode;
            context: WebAudioContext;
            constructor(context: WebAudioContext);
            destroy(): void;
            cloneBufferSource(): SourceClone;
        }
    }
}

declare module 'engine/anime/Tween' {
    type Tweenable = string | number | boolean | { x: number, y: number };
    class InterpolateData {
        active: boolean;
        finish: boolean;

        duration: number;
        delay: number;
        elapsed: number;

        type: number;
        val_type: number;
        easing: Function;

        obj: any;
        key: string;
        flat_key: string;
        target_obj: any;
        target_key: string;
        flat_target_key: string[];

        initial_val: Tweenable;
        delta_val: Tweenable;
        final_val: Tweenable;

        call_deferred: boolean;
        args: any;

        protected _init();
    }
    import MiniSignal from 'mini-signals';
    type Easing = 'Linear.None'
        | 'Quadratic.In' | 'Quadratic.Out' | 'Quadratic.InOut'
        | 'Cubic.In' | 'Cubic.Out' | 'Cubic.InOut'
        | 'Quartic.In' | 'Quartic.Out' | 'Quartic.InOut'
        | 'Quintic.In' | 'Quintic.Out' | 'Quintic.InOut'
        | 'Sinusoidal.In' | 'Sinusoidal.Out' | 'Sinusoidal.InOut'
        | 'Exponential.In' | 'Exponential.Out' | 'Exponential.InOut'
        | 'Circular.In' | 'Circular.Out' | 'Circular.InOut'
        | 'Elastic.In' | 'Elastic.Out' | 'Elastic.InOut'
        | 'Back.In' | 'Back.Out' | 'Back.InOut'
        | 'Bounce.In' | 'Bounce.Out' | 'Bounce.InOut';
    export default class Tween {
        tween_completed: MiniSignal;
        tween_started: MiniSignal;
        tween_step: MiniSignal;

        is_removed: boolean;

        autoplay: boolean;
        active: boolean;
        repeat: boolean;
        speed_scale: number;

        interpolates: InterpolateData[];

        constructor();

        set_active(active: boolean);
        set_speed_scale(scale: number);

        start();
        reset(obj: any, key: string): Tween;
        reset_all();
        stop(obj: any, key: string): Tween;
        stop_all();
        resume(obj: any, key: string): Tween;
        resume_all();
        remove(obj: any, key: string, first_only: boolean): Tween;
        remove_all();

        seek(p_time: number): Tween;
        tell(): number;
        get_runtime(): number;

        interpolate_property<T, K extends keyof T, S extends Tweenable>(obj: T, property: K, initial_val: S, final_val: S, duration: number, p_easing: Easing, delay?: number);
        interpolate_method<T, K extends keyof T, S extends Tweenable>(obj: T, method: K, initial_val: S, final_val: S, duration: number, p_easing: Easing, delay?: number);
        interpolate_callback<T, K extends keyof T>(obj: T, duration: number, callback: K, args?: any);
        interpolate_deferred_callback<T, K extends keyof T>(obj: T, duration: number, callback: K, args?: any);
        follow_property<T, K extends keyof T, S extends Tweenable>(obj: T, property: K, initial_val: S, target: any, target_property: string, duration: number, p_easing: Easing, delay?: number);
        follow_method<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, method: K, initial_val: S, target: T2, target_method: K2, duration: number, p_easing: Easing, delay?: number);
        targeting_property<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, property: K, initial: T2, initial_property: K2, final_val: S, duration: number, p_easing: Easing, delay?: number);
        targeting_method<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, method: K, initial: T2, initial_method: K2, final_val: S, duration: number, p_easing: Easing, delay?: number);

        clear_events();

        protected _init();
        protected _propagate_process(delta: number);
        protected _get_initial_val(p_data: InterpolateData): Tweenable;
        protected _get_delta_val(p_data: InterpolateData): Tweenable;
        protected _calc_delta_val(initial_val: Tweenable, final_val: Tweenable, data: InterpolateData): boolean;
        protected _run_equation(data: InterpolateData): Tweenable;
        protected _apply_tween_value(data: InterpolateData, value: Tweenable): boolean;
    }
}
declare module 'engine/anime/TweenManager' {
    import Tween from 'engine/anime/Tween';
    export default class TweenManager {
        tweens: Tween[];

        constructor();

        add(tween: Tween): Tween;
        remove(tween: Tween);
        create(): Tween;

        protected _process(delta: number);
        protected _stop_all();
    }
}

declare module 'engine/filters' {
    export class AsciiFilter extends Filter {
        size: number;
    }
    export class BloomFilter extends Filter {
        blur: number;
        blurX: number;
        blurY: number;
    }
    export class BlurFilter extends Filter {
        protected blurXFilter: BlurXFilter;
        protected blurYFilter: BlurYFilter;

        blur: number;
        passes: number;
        blurX: number;
        blurY: number;
    }
    export class BlurXFilter extends Filter {
        passes: number;
        strength: number;
        blur: number;
    }
    export class BlurYFilter extends Filter {
        passes: number;
        strength: number;
        blur: number;
    }
    export class SmartBlurFilter extends Filter {
    }
    export class ColorMatrixFilter extends Filter {
        protected _loadMatrix(matrix: number[], multiply: boolean): void;
        protected _multiply(out: number[], a: number[], b: number[]): void;
        protected _colorMatrix(matrix: number[]): void;

        matrix: number[];

        brightness(b: number, multiply?: boolean): void;
        greyscale(scale: number, multiply?: boolean): void;
        blackAndWhite(multiply?: boolean): void;
        hue(rotation: number, multiply?: boolean): void;
        contrast(amount: number, multiply?: boolean): void;
        saturate(amount: number, multiply?: boolean): void;
        desaturate(multiply?: boolean): void;
        negative(multiply?: boolean): void;
        sepia(multiply?: boolean): void;
        technicolor(multiply?: boolean): void;
        polaroid(multiply?: boolean): void;
        toBGR(multiply?: boolean): void;
        kodachrome(multiply?: boolean): void;
        browni(multiply?: boolean): void;
        vintage(multiply?: boolean): void;
        colorTone(desaturation: number, toned: number, lightColor: string, darkColor: string, multiply?: boolean): void;
        night(intensity: number, multiply?: boolean): void;
        predator(amount: number, multiply?: boolean): void;
        lsd(multiply?: boolean): void;
        reset(): void;
    }
    export class ColorStepFilter extends Filter {
        step: number;
    }
    export class ConvolutionFilter extends Filter {
        constructor(matrix: number[], width: number, height: number);

        matrix: number[];
        width: number;
        height: number;
    }
    export class CrossHatchFilter extends Filter {
    }
    export class DisplacementFilter extends Filter {
        constructor(sprite: Sprite, scale?: number);

        map: Texture;

        scale: Point;
    }
    export class DotScreenFilter extends Filter {
        scale: number;
        angle: number;
    }
    export class BlurYTintFilter extends Filter {
        blur: number;
    }
    export class DropShadowFilter extends Filter {
        blur: number;
        blurX: number;
        blurY: number;
        color: number;
        alpha: number;
        distance: number;
        angle: number;
    }
    export class GrayFilter extends Filter {
        gray: number;
    }
    export class InvertFilter extends Filter {
        invert: number;
    }
    export class NoiseFilter extends Filter {
        noise: number;
    }
    export class PixelateFilter extends Filter {
        size: Point;
    }
    export class RGBSplitFilter extends Filter {
        red: Point;
        green: Point;
        blue: Point;
    }
    export class SepiaFilter extends Filter {
        sepia: number;
    }
    export class ShockwaveFilter extends Filter {
        center: number[];
        params: any;
        time: number;
    }
    export class TiltShiftAxisFilter extends Filter {
        blur: number;
        gradientBlur: number;
        start: number;
        end: number;

        updateDelta(): void;
    }
    export class TiltShiftFilter extends Filter {
        blur: number;
        gradientBlur: number;
        start: number;
        end: number;
    }
    export class TiltShiftXFilter extends Filter {
        updateDelta(): void;
    }
    export class TiltShiftYFilter extends Filter {
        updateDelta(): void;
    }
    export class TwistFilter extends Filter {
        offset: Point;
        radius: number;
        angle: number;
    }
}

declare module 'engine/input' {
    import { Node2D, Vector } from 'engine';
    export default class Input {
        bindings: { [key: string]: string};
        key_list: string[];
        actions: { [action: string]: boolean };
        last_pressed: { [action: string]: boolean };
        last_released: { [action: string]: boolean };

        mouse: Vector;

        protected _init(viewport: Node2D);
        protected _process(delta: number);

        bind(key: string, action: string): Input;
        unbind(key: string, action: string): Input;
        unbind_all();

        is_action_pressed(action: string): boolean;
        is_action_just_pressed(action: string): boolean;
        is_action_just_released(action: string): boolean;
        action_press(action: string);
        action_release(action: string);

        protected _keydown(k: string, shift: boolean, ctrl: boolean, alt: boolean);
        protected _keyup(k: string);
    }
}

declare module 'engine/interaction' {
    import { Node2D, Point, CanvasRenderer, WebGLRenderer, HitArea } from 'engine';
    export interface InteractionEvent {
        stopped: boolean;
        target: any;
        type: string;
        data: InteractionData;
        stop_propagation(): void;
    }
    export class InteractionData {
        global: Point;
        target: Node2D;
        original_event: Event;

        getLocalPosition(displayObject: Node2D, point?: Point, globalPos?: Point): Point;
    }
    export class InteractionManager {
        protected interactionDOMElement: HTMLElement;
        protected eventsAdded: boolean;
        protected moveWhenInside: boolean;
        protected _tempPoint: Point;

        protected setTargetElement(element: HTMLElement, resolution: number): void;
        protected addEvents(): void;
        protected removeEvents(): void;
        protected dispatchEvent(displayObject: Node2D, eventString: string, eventData: any): void;
        protected onMouseDown: (event: Event) => void;
        protected processMouseDown: (displayObject: Node2D, hit: boolean) => void;
        protected onMouseUp: (event: Event) => void;
        protected processMouseUp: (displayObject: Node2D, hit: boolean) => void;
        protected onMouseMove: (event: Event) => void;
        protected processMouseMove: (displayObject: Node2D, hit: boolean) => void;
        protected onMouseOut: (event: Event) => void;
        protected processMouseOverOut: (displayObject: Node2D, hit: boolean) => void;
        protected onTouchStart: (event: Event) => void;
        protected processTouchStart: (Node2D: Node2D, hit: boolean) => void;
        protected onTouchEnd: (event: Event) => void;
        protected processTouchEnd: (displayObject: Node2D, hit: boolean) => void;
        protected onTouchMove: (event: Event) => void;
        protected processTouchMove: (displayObject: Node2D, hit: boolean) => void;
        protected getTouchData(touchEvent: InteractionData): InteractionData;
        protected returnTouchData(touchData: InteractionData): void;

        constructor(renderer: CanvasRenderer | WebGLRenderer, options?: { autoPreventDefault?: boolean; interactionFrequence?: number; });

        renderer: CanvasRenderer | WebGLRenderer;
        autoPreventDefault: boolean;
        interactionFrequency: number;
        mouse: InteractionData;
        eventData: {
            stopped: boolean;
            target: any;
            type: any;
            data: InteractionData;
        };
        interactiveDataPool: InteractionData[];
        last: number;
        currentCursorStyle: string;
        resolution: number;
        update(deltaTime: number): void;

        mapPositionToPoint(point: Point, x: number, y: number): void;
        processInteractive(point: Point, displayObject: Node2D, func: (displayObject: Node2D, hit: boolean) => void, hitTest: boolean, interactive: boolean): boolean;
        destroy(): void;
    }
    export interface InteractiveTarget {
        interactive: boolean;
        button_mode: boolean;
        interactive_children: boolean;
        default_cursor: string;
        hit_area: HitArea;
    }
}

declare module 'engine/MessageQueue' {
    class Message {
        obj: any;
        method: string;
        args: null;
    }
    export default class MessageQueue {
        messages: Message[];

        push_call(obj: any, method: string, args?: any);
        flush();
    }
}

declare module 'engine/SceneTree' {
    import { Node2D, Vector } from 'engine';
    import VisualServer from 'engine/VisualServer';
    import PhysicsServer from 'engine/PhysicsServer';
    import MessageQueue from 'engine/MessageQueue';
    import Input from 'engine/input';
    interface SceneTreeSetting {
        application: {
            name: string,
            main_scene: Function,
        },
        display: {
            view: string,
            container: string,

            width: number,
            height: number,
            resolution: number,

            background_color: number,

            force_canvas: boolean,
            antialias: boolean,
            pixel_snap: boolean,
            scale_mode: string,

            FPS: number,

            stretch_mode: string,
            stretch_aspect: string,
        },
    }
    interface ProcessPack {
        spiraling: number;
        last: number;
        real_delta: number;
        last_count: number;
        step: number;
        slow_step: number;
        slow_step_sec: number;
        count: number;
    }
    export default class SceneTree {
        paused: boolean;
        debug_collisions_hint: boolean;

        grouped_nodes: { [g: string]: Node2D };
        delete_queue: Node2D[];

        current_scene: Node2D;
        viewport: Node2D;
        viewport_rect: { position: Vector, size: Vector };

        stretch_mode: 'string';
        stretch_aspect: 'string';

        view: HTMLCanvasElement;
        container: HTMLElement;

        time_scale: number;

        visual_server: VisualServer;
        physics_server: PhysicsServer;
        message_queue: MessageQueue;
        input: Input;

        protected _settings: SceneTreeSetting;
        protected _tick_bind: Function;
        protected _loop_id: number;
        protected _next_scene_ctor: Function;
        protected _current_scene_ctor: Function;
        protected _process_tmp: ProcessPack;

        init(settings: SceneTreeSetting);

        is_paused(): boolean;
        is_debugging_collisions_hint(): boolean;

        queue_delete(node: Node2D);
        get_nodes_in_group(group: number): Node2D;
        add_node_to_group(node: Node2D, group_p: number);
        remove_node_from_group(node: Node2D, group_p: number);

        get_root(): Node2D;

        change_scene_to(scene_ctor: Function);
        get_current_scene(): Node2D;
        reload_current_scene();

        set_pause(pause: boolean);
        set_time_scale(scale: number);

        set_screen_stretch(mode: string, aspect: string, minsize: Vector);

        set_debug_collisions_hint(enabled: boolean);

        protected _initialize();
        protected _start_loop();
        protected _tick(timestamp: number);
        protected _end_loop();

        protected _flush_delete_queue();
    }
}

declare module 'engine/VisualServer' {
    import { Node2D, SystemRenderer } from 'engine';
    export default class VisualServer {
        is_initialized: boolean;
        renderer: SystemRenderer;

        init(config: any);
        render(viewport: Node2D);
    }
}

declare module 'engine' {
    import EventEmitter from 'eventemitter3';
    import Signal from 'mini-signals';
    import TweenManager from 'engine/anime/TweenManager';

    // accessibility
    export namespace accessibility {
        export class AccessibilityManager {
            protected div: HTMLElement;
            protected pool: HTMLElement[];
            protected renderId: number;
            protected children: Node2D[];
            protected isActive: boolean;

            debug: boolean;
            renderer: SystemRenderer;

            constructor(renderer: SystemRenderer);

            protected activate(): void;
            protected deactivate(): void;
            protected updateAccessibleObjects(displayObject: Node2D): void;
            protected update(): void;
            protected capHitArea(hitArea: any): void;
            protected addChild(displayObject: Node2D): void;

            destroy(): void;
        }
        export interface AccessibleTarget {
            accessible: boolean;
            accessibleTitle: string;
            accessibleHint: string;
            tabIndex: number;
        }
    }

    // anime
    export { default as Tween } from 'engine/anime/Tween';
    export { default as TweenManager } from 'engine/anime/TweenManager';

    // audio
    export module audio {
        export * from 'engine/audio';
    }

    // core
    // - const
    export const VERSION: string;
    export const PI_2: number;
    export const RAD_TO_DEG: number;
    export const DEG_TO_RAD: number;
    export const TARGET_FPMS: number;
    export const RENDERER_TYPE: {
        UNKNOWN: number;
        WEBGL: number;
        CANVAS: number;
    };
    export const BLEND_MODES: {
        NORMAL: number;
        ADD: number;
        MULTIPLY: number;
        SCREEN: number;
        OVERLAY: number;
        DARKEN: number;
        LIGHTEN: number;
        COLOR_DODGE: number;
        COLOR_BURN: number;
        HARD_LIGHT: number;
        SOFT_LIGHT: number;
        DIFFERENCE: number;
        EXCLUSION: number;
        HUE: number;
        SATURATION: number;
        COLOR: number;
        LUMINOSITY: number;
    };
    export const DRAW_MODES: {
        POINTS: number;
        LINES: number;
        LINE_LOOP: number;
        LINE_STRIP: number;
        TRIANGLES: number;
        TRIANGLE_STRIP: number;
        TRIANGLE_FAN: number;
    };
    export const SCALE_MODES: {
        DEFAULT: number;
        LINEAR: number;
        NEAREST: number;
    };
    export const RETINA_PREFIX: RegExp;
    export const RESOLUTION: number;
    export const FILTER_RESOLUTION: number;
    export const DEFAULT_RENDER_OPTIONS: {
        view: HTMLCanvasElement;
        resolution: number;
        antialias: boolean;
        forceFXAA: boolean;
        autoResize: boolean;
        transparent: boolean;
        backgroundColor: number;
        clearBeforeRender: boolean;
        preserveDrawingBuffer: boolean;
        roundPixels: boolean;
    };
    export const SHAPES: {
        POLY: number;
        RECT: number;
        CIRC: number;
        ELIP: number;
        RREC: number;
    };
    export const SPRITE_BATCH_SIZE: number;

    // - transform
    export class TransformBase {
        localTransform: Matrix;
        position: Point;
        protected _dirtyLocal: number;
        protected _dirtyParentVersion: number;
        protected _versionLocal: number;
    }
    export class TransformStatic extends TransformBase {}
    export class Transform extends TransformBase {}

    // - node
    export class Node2D extends EventEmitter implements interaction.InteractiveTarget {
        transform: TransformBase;
        local_transform: Matrix;
        update_transform(): void;
        node2d_update_transform(): any;

        protected _update_transform();
        protected _recursive_post_update_transform();

        protected _sr: number;
        protected _cr: number;
        protected _bounds: Rectangle;
        protected _boundsID: number;
        protected _lastBoundsID: number;
        protected _boundsRect: Rectangle;
        protected _localBoundsRect: Rectangle;
        protected _currentBounds: Rectangle;
        protected _mask: Graphics | Sprite;
        protected _world_position: Point;
        protected _world_scale: Point;
        protected _world_rotation: number;
        protected _destroyed: boolean;
        protected _is_ready: boolean;

        protected tempNode2DParent: Node2D;

        protected _physics_children_count: number;
        protected _filters: Filter[];
        protected _enabledFilters: Filter[];

        id: number;
        name: string;
        type: string;
        position: Point;
        scale: Point;
        pivot: Point;
        rotation: number;
        renderable: boolean;
        skew: Point;
        alpha: number;
        visible: boolean;
        parent: Node2D;
        world_alpha: number;
        world_transform: Matrix;
        filter_area: Rectangle;
        width: number;
        height: number;

        x: number;
        y: number;
        world_visible: boolean;
        mask: Graphics | Sprite;
        filters: Filter[];

        scene_tree: SceneTree;
        children: Node2D[];
        named_children: { [name: string]: Node2D };
        groups: number[];
        is_inside_tree: boolean;
        is_queued_for_deletion: boolean;
        idle_process: boolean;
        is_physics_object: boolean;

        tweens: TweenManager;

        tree_entered: Signal;
        tree_exited: Signal;

        get_bounds(): Rectangle;
        get_local_bounds(): Rectangle;
        to_global(position: Point): Point;
        to_local(position: Point, from?: Node2D, to?: Point): Point;
        generate_texture(renderer: CanvasRenderer | WebGLRenderer, scaleMode: number, resolution: number): Texture;
        set_parent(container: Node2D): Node2D;
        set_transform(x?: number, y?: number, scaleX?: number, scaleY?: number, rotation?: number, skewX?: number, skewY?: number, pivotX?: number, pivotY?: number): Node2D;
        destroy(): void;
        get_global_position(point: Point): Point;

        add_child<T extends Node2D>(child: T): T;
        add_child_at<T extends Node2D>(child: T, index: number): T;
        swap_children<T extends Node2D>(child: T, child2: T): void;
        get_child_index<T extends Node2D>(child: T): number;
        set_child_index<T extends Node2D>(child: T, index: number): void;
        get_child_at<T extends Node2D>(index: number): T;
        get_child_by_name<T extends Node2D>(name: string): T;
        remove_child<T extends Node2D>(child: T): T;
        remove_child_at<T extends Node2D>(index: number): T;
        remove_children<T extends Node2D>(beginIndex?: number, endIndex?: number): T[];
        destroy(destroyChildren?: boolean): void;
        generate_texture(renderer: CanvasRenderer | WebGLRenderer, resolution?: number, scaleMode?: number): Texture;

        set_name(name: string);
        set_process(p: boolean);
        add_to_group(group: number);
        remove_from_group(group: number);

        get_position(): Point;
        set_position(value: Point);
        get_global_position(): Point;
        get_scale(): Point;
        set_scale(value: Point);
        get_global_scale(): Point;
        get_pivot(): Point;
        set_pivot(value: Point);
        get_skew(): Point;
        set_skew(value: Point);
        get_rotation(): number;
        set_rotation(value: number);
        get_global_rotation(): number;
        get_tree(): SceneTree;
        get_node<T extends Node2D>(path: string): T;

        render_webGL(renderer: WebGLRenderer): void;
        render_canvas(renderer: CanvasRenderer): void;

        _enter_tree();
        _ready();
        _process(delta: number);
        _exit_tree();
        queue_free();
        call_deferred(method: string, args: any);

        protected _propagate_enter_tree();
        protected _propagate_ready();
        protected _propagate_process(delta: number);
        protected _propagate_exit_tree();

        protected _load_data(data: any);

        interactive: boolean;
        button_mode: boolean;
        interactive_children: boolean;
        default_cursor: string;
        hit_area: HitArea;
        accessible: boolean;
        accessible_title: string;
        tab_index: number;

        protected _render_webGL(renderer: WebGLRenderer): void;
        protected _render_canvas(renderer: CanvasRenderer): void;

        protected on_children_change: () => void;

        // interaction
        on(event: 'click', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'mousedown', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'mouseout', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'mouseover', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'mouseup', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'mouseclick', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'mouseupoutside', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'rightclick', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'rightdown', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'rightup', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'rightupoutside', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'tap', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'touchend', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'touchendoutside', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'touchmove', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'touchstart', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'pointerdown', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'pointermove', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: 'pointerup', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: string, fn: Function, context?: any): EventEmitter;

        once(event: 'click', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'mousedown', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'mouseout', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'mouseover', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'mouseup', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'mouseclick', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'mouseupoutside', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'rightclick', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'rightdown', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'rightup', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'rightupoutside', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'tap', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'touchend', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'touchendoutside', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'touchmove', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'touchstart', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'pointerdown', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'pointermove', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: 'pointerup', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: string, fn: Function, context?: any): EventEmitter;

        // remove/add
        on(event: 'added', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: string, fn: Function, context?: any): EventEmitter;
        on(event: 'removed', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        on(event: string, fn: Function, context?: any): EventEmitter;

        once(event: 'added', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: string, fn: Function, context?: any): EventEmitter;
        once(event: 'removed', fn: (event: interaction.InteractionEvent) => void, context?: any): EventEmitter;
        once(event: string, fn: Function, context?: any): EventEmitter;
    }

    // - graphics
    export class GraphicsData {
        constructor(lineWidth: number, lineColor: number, lineAlpha: number, fillColor: number, fillAlpha: number, fill: boolean, shape: Circle | Rectangle | Ellipse | Polygon);

        line_width: number;
        line_color: number;
        line_alpha: number;
        fill_color: number;
        fill_alpha: number;
        fill: boolean;
        shape: Circle | Rectangle | Ellipse | Polygon;
        type: number;

        clone(): GraphicsData;

        protected _lineTint: number;
        protected _fillTint: number;
    }
    export class Graphics extends Node2D {
        protected boundsDirty: boolean;
        protected dirty: boolean;
        protected glDirty: boolean;

        fill_alpha: number;
        line_width: number;
        line_color: number;
        tint: number;
        blend_mode: number;
        is_mask: boolean;
        bounds_padding: number;

        clone(): Graphics;
        set_line_style(lineWidth?: number, color?: number, alpha?: number): Graphics;
        move_to(x: number, y: number): Graphics;
        line_to(x: number, y: number): Graphics;
        quadratic_curve_to(cpX: number, cpY: number, toX: number, toY: number): Graphics;
        bezier_curve_to(cpX: number, cpY: number, cpX2: number, cpY2: number, toX: number, toY: number): Graphics;
        arc_to(x1: number, y1: number, x2: number, y2: number, radius: number): Graphics;
        arc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): Graphics;
        begin_fill(color: number, alpha?: number): Graphics;
        end_fill(): Graphics;
        draw_rect(x: number, y: number, width: number, height: number): Graphics;
        draw_rounded_rect(x: number, y: number, width: number, height: number, radius: number): Graphics;
        draw_circle(x: number, y: number, radius: number): Graphics;
        draw_ellipse(x: number, y: number, width: number, height: number): Graphics;
        draw_polygon(path: number[] | Point[]): Graphics;
        clear(): Graphics;
        //todo
        generate_texture(renderer: WebGLRenderer | CanvasRenderer, resolution?: number, scaleMode?: number): Texture;
        get_bounds(matrix?: Matrix): Rectangle;
        contains_point(point: Point): boolean;
        update_local_bounds(): void;
        draw_shape(shape: Circle | Rectangle | Ellipse | Polygon): GraphicsData;
    }
    export class GraphicsRenderer extends ObjectRenderer {
        constructor(renderer: WebGLRenderer);

        buildCircle: (graphicsData: Graphics, webGLData: Object) => void;
        buildPoly: (graphicsData: Graphics, webGLData: Object) => boolean;
        buildRectangle: (graphicsData: Graphics, webGLData: Object) => void;
        buildComplexPoly: (graphicsData: Graphics, webGLData: Object) => void;
        buildLine: (graphicsData: Graphics, webGLData: Object) => void;
        updateGraphics: (graphics: Graphics) => void;
        buildRoundedRectangle: (graphicsData: Graphics, webGLData: Object) => void;
        quadraticBezierCurve: (fromX: number, fromY: number, cpX: number, cpY: number, toX: number, toY: number, out: any) => number[];
        switchMode: (webGL: WebGLRenderingContext, type: number) => WebGLGraphicsData;
    }
    export class WebGLGraphicsData {
        constructor(gl: WebGLRenderingContext);
        upload: () => void;
        reset: () => void;
        destroy: () => void;
    }

    // - math
    export module GroupD8 {
        export function add(rotationSecond: number, rotationFirst: number): number;
        export function byDirection(dx: number, dy: number): number;
        export function inv(rotation: number): number;
        export function isSwapWidthHeight(rotation: number): boolean;
        export function matrixAppendRotationInv(matrix: Matrix, rotation: number, tx: number, ty: number): void;
        export function rotate180(rotation: number): number;
        export function sub(rotationSecond: number, rotationFirst: number): number;
        export function uX(ind: number): number;
        export function uY(ind: number): number;
        export function vX(ind: number): number;
        export function vY(ind: number): number;

        export var E: number;
        export var MIRROR_HORIZONTAL: number;
        export var MIRROR_VERTICAL: number;
        export var N: number;
        export var NE: number;
        export var NW: number;
        export var S: number;
        export var SE: number;
        export var SW: number;
        export var W: number;
    }
    export class Point {
        x: number;
        y: number;

        constructor(x?: number, y?: number);

        set(x?: number, y?: number): Point;
        copy(p: Point): Point;

        clone(): Point;
        random(scale: number): Point;
        normalized(): Point;
        clamped(length: number): Point;
        rotated(a: number): Point;
        snapped(by: number): Point;

        equals(p: Point): boolean;
        exact_equals(p: Point): boolean;

        add(b: Point): Point;
        subtract(b: Point): Point;
        multiply(b: Point): Point;
        divide(b: Point): Point;
        dot(b: Point): Point;
        cross(b: Point): Point;

        abs(): Point;
        ceil(): Point;
        floor(): Point;
        round(): Point;
        clamp(length: number): Point;

        scale(b: number): Point;
        negate(): Point;
        inverse(): Point;
        normalize(): Point;
        rotate(a: number): Point;
        perp(): Point;
        project(other: Point): Point;
        project_n(other: Point): Point;
        reflex(axis: Point): Point;
        reflect(axis: Point): Point;
        reflect_n(axis: Point): Point;
        bounce(axis: Point): Point;
        slide(axis: Point): Point;

        length(): number;
        length_squared(): number;
        angle(): number;
        angle_to(b: Point): number;
        angle_to_point(b: Point): number;
        distance_to(b: Point): number;
        distance_squared_to(b: Point): number;
        tangent(): number;
    }
    export class ObservablePoint extends Point {}
    export class Vector extends Point {}
    export class Matrix {
        a: number;
        b: number;
        c: number;
        d: number;
        tx: number;
        ty: number;

        from_array(array: number[]): void;
        to_array(transpose?: boolean, out?: number[]): number[];
        apply(pos: Point, newPos?: Point): Point;
        apply_inverse(pos: Point, newPos?: Point): Point;
        translate(x: number, y: number): Matrix;
        scale(x: number, y: number): Matrix;
        rotate(angle: number): Matrix;
        append(matrix: Matrix): Matrix;
        prepend(matrix: Matrix): Matrix;
        invert(): Matrix;
        identity(): Matrix;
        clone(): Matrix;
        copy(matrix: Matrix): Matrix;
        set(a: number, b: number, c: number, d: number, tx: number, ty: number): Matrix;
        set_transform(a: number, b: number, c: number, d: number, sr: number, cr: number, cy: number, sy: number, nsx: number, cs: number): Matrix;

        static IDENTITY: Matrix;
        static TEMP_MATRIX: Matrix;
    }
    export interface HitArea {
        contains(x: number, y: number): boolean;
    }
    export class Circle implements HitArea {
        constructor(x?: number, y?: number, radius?: number);

        x: number;
        y: number;
        radius: number;
        type: number;

        clone(): Circle;
        contains(x: number, y: number): boolean;
        get_bounds(): Rectangle;
    }
    export class Ellipse implements HitArea {
        constructor(x?: number, y?: number, width?: number, height?: number);

        x: number;
        y: number;
        width: number;
        height: number;
        type: number;

        clone(): Ellipse;
        contains(x: number, y: number): boolean;
        get_bounds(): Rectangle;
    }
    export class Polygon implements HitArea {
        constructor(points: Point[]);
        constructor(points: number[]);
        constructor(...points: Point[]);
        constructor(...points: number[]);

        closed: boolean;
        points: number[];
        type: number;

        clone(): Polygon;
        contains(x: number, y: number): boolean;
    }
    export class Rectangle implements HitArea {
        constructor(x?: number, y?: number, width?: number, height?: number);

        x: number;
        y: number;
        width: number;
        height: number;
        type: number;

        left: number;
        right: number;
        top: number;
        bottom: number;

        static EMPTY: Rectangle;

        clone(): Rectangle;
        contains(x: number, y: number): boolean;
    }
    export class RoundedRectangle implements HitArea {
        constructor(x?: number, y?: number, width?: number, height?: number, radius?: number);

        x: number;
        y: number;
        width: number;
        height: number;
        radius: number;
        type: number;

        clone(): RoundedRectangle;
        contains(x: number, y: number): boolean;
    }

    // - rnd
    export class RandomDataGenerator {
        constructor(seeds?: string | any[]);
        protected c: number;
        protected s0: number;
        protected s1: number;
        protected s2: number;

        rnd(): number;
        sow(seeds: any[]);
        hash(data: any): number;

        frac(): number;
        state(s: string): string;
    }
    export function randomize();
    export function rand_range(min: number, max: number): number;
    export function rand_range_i(min: number, max: number): number;
    export function randf(): number;
    export function randi(): number;
    export function uuid(): string;
    export function pick<T>(list: T[]): T;
    export function pickweighted_pick<T>(list: T[]): T;

    // - math
    export function clamp(num: number, min: number, max: number): number;
    export function wrap(num: number, min: number, max: number): number;
    export function wrap_angle(angle: number): number;
    export function mod(a: number, n: number): number;
    export function lerp(a: number, b: number, fct: number): number;
    export function angle_difference(a: number, b: number): number;
    export function deg2rad(a: number): number;
    export function rad2deg(a: number): number;

    // - particles

    export interface ParticleNode2DProperties {
        scale?: boolean;
        position?: boolean;
        rotation?: boolean;
        uvs?: boolean;
        alpha?: boolean;
    }
    export class ParticleNode2D extends Node2D {
        constructor(size?: number, properties?: ParticleNode2DProperties, batchSize?: number);

        protected _maxSize: number;
        protected _batchSize: number;
        protected _properties: boolean[];
        protected _buffers: WebGLBuffer[];
        protected _bufferToUpdate: number;

        protected on_Children_change: (smallestChildIndex?: number) => void;

        interactiveChildren: boolean;
        blendMode: number;
        roundPixels: boolean;

        setProperties(properties: ParticleNode2DProperties): void;
    }
    export interface ParticleBuffer {
        gl: WebGLRenderingContext;
        vertSize: number;
        vertByteSize: number;
        size: number;
        dynamicProperties: any[];
        staticProperties: any[];

        staticStride: number;
        staticBuffer: any;
        staticData: any;
        dynamicStride: number;
        dynamicBuffer: any;
        dynamicData: any;

        initBuffers(): void;
        bind(): void;
        destroy(): void;
    }
    export interface IParticleRendererProperty {
        attribute: number;
        size: number;
        uploadFunction: (children: Node2D[], startIndex: number, amount: number, array: number[], stride: number, offset: number) => void;
        offset: number;
    }
    export class ParticleRenderer extends ObjectRenderer {
        constructor(renderer: WebGLRenderer);

        generateBuffers: (container: ParticleNode2D) => ParticleBuffer[];
        indexBuffer: WebGLBuffer;
        indices: Uint16Array;
        properties: IParticleRendererProperty[];
        shader: Shader;
        tempMatrix: Matrix;
        uploadAlpha: (children: Node2D[], startIndex: number, amount: number, array: number[], stride: number, offset: number) => void;
        uploadPosition: (children: Node2D[], startIndex: number, amount: number, array: number[], stride: number, offset: number) => void;
        uploadRotation: (children: Node2D[], startIndex: number, amount: number, array: number[], stride: number, offset: number) => void;
        uploadUvs: (children: Node2D[], startIndex: number, amount: number, array: number[], stride: number, offset: number) => void;
        uploadVertices: (children: Node2D[], startIndex: number, amount: number, array: number[], stride: number, offset: number) => void;
    }
    export interface ParticleShader {}

    // - renderers

    export interface RendererOptions {
        view?: HTMLCanvasElement;
        transparent?: boolean;
        antialias?: boolean;
        resolution?: number;
        clearBeforeRendering?: boolean;
        preserveDrawingBuffer?: boolean;
        forceFXAA?: boolean;
        roundPixels?: boolean;
        backgroundColor?: number;
    }
    export class SystemRenderer extends EventEmitter {
        protected _backgroundColor: number;
        protected _backgroundColorRgb: number[];
        protected _backgroundColorString: string;
        protected _tempDisplayObjectParent: any;
        protected _lastObjectRendered: Node2D;

        constructor(system: string, width?: number, height?: number, options?: RendererOptions);

        type: number;
        width: number;
        height: number;
        view: HTMLCanvasElement;
        resolution: number;
        transparent: boolean;
        autoResize: boolean;
        blendModes: any; //todo?
        preserveDrawingBuffer: boolean;
        clearBeforeRender: boolean;
        roundPixels: boolean;
        backgroundColor: number;

        render(object: Node2D): void;
        resize(width: number, height: number): void;
        destroy(removeView?: boolean): void;
    }
    export class CanvasRenderer extends SystemRenderer {
        protected renderDisplayObject(displayObject: Node2D, context: CanvasRenderingContext2D): void;
        protected _mapBlendModes(): void;

        constructor(width?: number, height?: number, options?: RendererOptions);

        context: CanvasRenderingContext2D;
        refresh: boolean;
        maskManager: CanvasMaskManager;
        roundPixels: boolean;
        smoothProperty: string;

        render(object: Node2D): void;
        resize(w: number, h: number): void;
    }
    export class CanvasBuffer {
        protected clear(): void;

        constructor(width: number, height: number);

        canvas: HTMLCanvasElement;
        context: CanvasRenderingContext2D;

        width: number;
        height: number;

        resize(width: number, height: number): void;
        destroy(): void;
    }
    export module CanvasGraphics {
        export function renderGraphicsMask(graphics: Graphics, context: CanvasRenderingContext2D): void;
        export function updateGraphicsTint(graphics: Graphics): void;

        export function renderGraphics(graphics: Graphics, context: CanvasRenderingContext2D): void;
    }
    export class CanvasMaskManager {
        pushMask(maskData: any, renderer: WebGLRenderer | CanvasRenderer): void;
        popMask(renderer: WebGLRenderer | CanvasRenderer): void;
        destroy(): void;
    }
    export module CanvasTinter {
        export function getTintedTexture(sprite: Node2D, color: number): HTMLCanvasElement;
        export function tintWithMultiply(texture: Texture, color: number, canvas: HTMLDivElement): void;
        export function tintWithOverlay(texture: Texture, color: number, canvas: HTMLCanvasElement): void;
        export function tintWithPerPixel(texture: Texture, color: number, canvas: HTMLCanvasElement): void;
        export function roundColor(color: number): number;
        export var cacheStepsPerColorChannel: number;
        export var convertTintToImage: boolean;
        export var vanUseMultiply: boolean;
        export var tintMethod: Function;
    }
    export class WebGLRenderer extends SystemRenderer {
        protected _useFXAA: boolean;
        protected _FXAAFilter: FXAAFilter;
        protected _contextOptions: {
            alpha: boolean;
            antiAlias: boolean;
            premultipliedAlpha: boolean;
            stencil: boolean;
            preseveDrawingBuffer: boolean;
        };
        protected _renderTargetStack: RenderTarget[];

        protected _initContext(): void;
        protected _createContext(): void;
        protected handleContextLost: (event: WebGLContextEvent) => void;
        protected _mapGlModes(): void;
        protected _managedTextures: Texture[];

        constructor(width?: number, height?: number, options?: RendererOptions);

        drawCount: number;
        shaderManager: ShaderManager;
        maskManager: MaskManager;
        stencilManager: StencilManager;
        filterManager: FilterManager;
        blendModeManager: BlendModeManager;
        currentRenderTarget: RenderTarget;
        currentRenderer: ObjectRenderer;

        render(object: Node2D): void;
        renderDisplayObject(displayObject: Node2D, renderTarget: RenderTarget, clear: boolean): void;
        setObjectRenderer(objectRenderer: ObjectRenderer): void;
        setRenderTarget(renderTarget: RenderTarget): void;
        updateTexture(texture: BaseTexture | Texture): BaseTexture | Texture;
        destroyTexture(texture: BaseTexture | Texture, _skipRemove?: boolean): void;
    }
    export class Filter {
        protected vertexSrc: string[];
        protected fragmentSrc: string[];

        constructor(vertexSrc?: string | string[], fragmentSrc?: string | string[], uniforms?: any);

        uniforms: any;

        padding: number;

        getShader(renderer: WebGLRenderer): Shader;
        applyFilter(renderer: WebGLRenderer, input: RenderTarget, output: RenderTarget, clear?: boolean): void;
        syncUniform(uniform: WebGLUniformLocation): void;
    }
    export class SpriteMaskFilter extends Filter {
        constructor(sprite: Sprite);

        maskSprite: Sprite;
        maskMatrix: Matrix;

        applyFilter(renderer: WebGLRenderbuffer, input: RenderTarget, output: RenderTarget): void;
        map: Texture;
        offset: Point;
    }
    export class FXAAFilter extends Filter {
        applyFilter(renderer: WebGLRenderer, input: RenderTarget, output: RenderTarget): void;
    }
    export class BlendModeManager extends WebGLManager {
        constructor(renderer: WebGLRenderer);

        setBlendMode(blendMode: number): boolean;
    }
    export class FilterManager extends WebGLManager {
        constructor(renderer: WebGLRenderer);

        filterStack: any[];
        renderer: WebGLRenderer;
        texturePool: any[];

        onContextChange: () => void;
        setFilterStack(filterStack: any[]): void;
        pushFilter(target: RenderTarget, filters: any[]): void;
        popFilter(): Filter;
        getRenderTarget(clear?: boolean): RenderTarget;
        protected returnRenderTarget(renderTarget: RenderTarget): void;
        applyFilter(shader: Shader | Filter, inputTarget: RenderTarget, outputTarget: RenderTarget, clear?: boolean): void;
        calculateMappedMatrix(filterArea: Rectangle, sprite: Sprite, outputMatrix?: Matrix): Matrix;
        capFilterArea(filterArea: Rectangle): void;
        resize(width: number, height: number): void;
        destroy(): void;
    }
    export class MaskManager extends WebGLManager {
        stencilStack: StencilMaskStack;
        reverse: boolean;
        count: number;
        alphaMaskPool: any[];

        pushMask(target: RenderTarget, maskData: any): void;
        popMask(target: RenderTarget, maskData: any): void;
        pushSpriteMask(target: RenderTarget, maskData: any): void;
        popSpriteMask(): void;
        pushStencilMask(target: RenderTarget, maskData: any): void;
        popStencilMask(target: RenderTarget, maskData: any): void;
    }
    export class ShaderManager extends WebGLManager {
        protected _currentId: number;
        protected currentShader: Shader;

        constructor(renderer: WebGLRenderer);

        maxAttibs: number;
        attribState: any[];
        tempAttribState: any[];
        stack: any[];

        setAttribs(attribs: any[]): void;
        setShader(shader: Shader): boolean;
        destroy(): void;
    }
    export class StencilManager extends WebGLManager {
        constructor(renderer: WebGLRenderer);

        setMaskStack(stencilMaskStack: StencilMaskStack): void;
        pushStencil(graphics: Graphics, webGLData: WebGLGraphicsData): void;
        bindGraphics(graphics: Graphics, webGLData: WebGLGraphicsData): void;
        popStencil(graphics: Graphics, webGLData: WebGLGraphicsData): void;
        destroy(): void;
        pushMask(maskData: any[]): void;
        popMask(maskData: any[]): void;
    }
    export class WebGLManager {
        protected onContextChange: () => void;

        constructor(renderer: WebGLRenderer);

        renderer: WebGLRenderer;

        destroy(): void;
    }
    export class Shader {
        protected attributes: any;
        protected textureCount: number;
        protected uniforms: any;

        protected _glCompile(type: any, src: any): Shader;

        constructor(shaderManager: ShaderManager, vertexSrc: string, fragmentSrc: string, uniforms: any, attributes: any);

        uid: number;
        gl: WebGLRenderingContext;
        shaderManager: ShaderManager;
        program: WebGLProgram;
        vertexSrc: string;
        fragmentSrc: string;

        init(): void;
        cacheUniformLocations(keys: string[]): void;
        cacheAttributeLocations(keys: string[]): void;
        compile(): WebGLProgram;
        syncUniform(uniform: any): void;
        syncUniforms(): void;
        initSampler2D(uniform: any): void;
        destroy(): void;
    }
    export class ComplexPrimitiveShader extends Shader {
        constructor(shaderManager: ShaderManager);
    }
    export class PrimitiveShader extends Shader {
        constructor(shaderManager: ShaderManager);
    }
    export class TextureShader extends Shader {
        constructor(shaderManager: ShaderManager, vertexSrc?: string, fragmentSrc?: string, customUniforms?: any, customAttributes?: any);
    }
    export interface StencilMaskStack {
        stencilStack: any[];
        reverse: boolean;
        count: number;
    }
    export class ObjectRenderer extends WebGLManager {
        start(): void;
        stop(): void;
        flush(): void;
        render(object?: any): void;
    }
    export class RenderTarget {
        constructor(gl: WebGLRenderingContext, width: number, height: number, scaleMode: number, resolution: number, root: boolean);

        gl: WebGLRenderingContext;
        frameBuffer: WebGLFramebuffer;
        texture: Texture;
        size: Rectangle;
        resolution: number;
        projectionMatrix: Matrix;
        transform: Matrix;
        frame: Rectangle;
        stencilBuffer: WebGLRenderbuffer;
        stencilMaskStack: StencilMaskStack;
        filterStack: any[];
        scaleMode: number;
        root: boolean;

        clear(bind?: boolean): void;
        attachStencilBuffer(): void;
        activate(): void;
        calculateProjection(protectionFrame: Matrix): void;
        resize(width: number, height: number): void;
        destroy(): void;
    }
    export interface Quad {
        gl: WebGLRenderingContext;
        vertices: number[];
        uvs: number[];
        colors: number[];
        indices: number[];
        vertexBuffer: WebGLBuffer;
        indexBuffer: WebGLBuffer;

        map(rect: Rectangle, rect2: Rectangle): void;
        upload(): void;
        destroy(): void;
    }

    // - sprites
    export class Sprite extends Node2D {
        static from_Frame(frameId: string): Sprite;
        static from_image(imageId: string, crossorigin?: boolean, scaleMode?: number): Sprite;

        protected _texture: Texture;
        protected _width: number;
        protected _height: number;
        protected cached_tint: number;

        protected _onTextureUpdate(): void;

        constructor(texture?: Texture | string);

        anchor: Point;
        tint: number;
        blend_mode: number;
        shader: Shader | Filter;
        texture: Texture;

        width: number;
        height: number;

        get_local_bounds(): Rectangle;
        destroy(destroyTexture?: boolean, destroyBaseTexture?: boolean): void;
    }
    interface Anim {
        speed: number;
        loop: boolean;
        frames: number[];
        name: string;
    }
    export function filmstrip(tileset: Texture, width: number, height: number): Texture[];
    export class SpriteFrames {
        constructor(data: any);
        animations: { [k: string]: Anim };
        data: any;

        add_animation(anim: string);
        has_animation(anim: string): boolean;
        remove_animation(anim: string);
        rename_animation(prev: string, next: string);
        set_animation_speed(anim: string, speed: number);
        get_animation_speed(anim: string): number;
        set_animation_loop(anim: string, loop: boolean);
        get_animation_loop(anim: string): boolean;
        get_frame_count(anim: string): number;
        get_frame(anim: string, index: number): Texture;
        set_frame(anim: string, index: number, tex: Texture);
        remove_frame(anim: string, index: number);
        clear(anim: string);
        clear_all();
    }
    export class AnimatedSprite extends Sprite {
        constructor(frames: any | SpriteFrames);

        frames: SpriteFrames;
        playing: boolean;
        animation: string;
        frame: number;
        timeout: number;

        animation_finished: Signal;
        frame_changed: Signal;

        play(anim: string, restart?: boolean);
        stop();
        set_animation(anim: string);
        get_frame(): number;
        set_frame(frame: number);
        get_sprite_frames(): SpriteFrames;
        set_sprite_frames(frames: SpriteFrames);
        set_frames(frames: SpriteFrames | string);

        protected _reset_timeout();
        protected _set_playing();
    }
    export class SpriteRenderer extends ObjectRenderer {
        protected renderBatch(texture: Texture, size: number, startIndex: number): void;

        vertSize: number;
        vertByteSize: number;
        size: number;
        vertices: number[];
        positions: number[];
        colors: number[];
        indices: number[];
        currentBatchSize: number;
        sprites: Sprite[];
        shader: Shader | Filter;

        render(sprite: Sprite): void;
        flush(): void;
        start(): void;
        destroy(): void;
    }

    // - coa sprite
    class Element {
        id: number;
        name: string;
    }
    class File extends Element {
        pivot_x: number;
        pivot_y: number;
        width: number;
        height: number;
    }
    class Folder extends Element {
        file: File[];
    }
    class ObjectInfo extends Element {
        type: number;
        w: number;
        h: number;
        pivot_x: number;
        pivot_y: number;
    }
    class Animation extends Element {
        entity: Entity;
        length: number;
        looping: boolean;
        mainline: MainlineKey[];
        timeline: TimelineKey[];
    }
    class Key extends Element {
        time: number;
        curve_type: number;
        c1: number;
        c2: number;
        c3: number;
        c4: number;
    }
    class Ref extends Element {
        parent: number;
        timeline: number;
        key: number;
    }
    class ObjectRef extends Ref {
        z_index: number;
    }
    class Spatial {
        x: number;
        y: number;
        angle: number;
        scale_x: number;
        scale_y: number;
        a: number;
        init(data: any): Spatial;
        interpolate(a: Spatial, b: Spatial, factor: number, spin: number);
        apply_parent_transform(parent: Spatial);
        copy(source: Spatial): Spatial;
    }
    class Obj extends Spatial {
        animation: number;
        entity: number;
        folder: number;
        file: number;
        pivot_x: number;
        pivot_y: number;
        t: number;
        init(data: any): Obj;
        interpolate(a: Obj, b: Obj, factor: number, spin: number);
        copy(source: Obj): Obj;
    }
    class MainlineKey extends Element {
        bone_ref: Ref[];
        object_ref: ObjectRef[];
    }
    class TimelineKey extends Key {
        spin: number;
        bone: Spatial;
        object: Obj;
    }
    class Timeline extends Element {
        object_type: number;
        obj: number;
        key: TimelineKey[];
    }
    class MapInstruction {
        folder: number;
        file: number;
        target_folder: number;
        target_file: number;
    }
    class CharacterMap extends Element {
        map: MapInstruction[];
    }
    class Entity extends Element {
        spriter: Model;
        obj_info: ObjectInfo[];
        character_map: CharacterMap[];
        animation_table: { [name: string]: Animation };
        animation: Animation[];
        get_animations(): { [name: string]: Animation };
    }
    class Model {
        folder: Folder[];
        entity: Entity[];
    }
    class FrameData {
        sprite_data: Obj[];
        clear();
    }
    export class Animator {
        animation_finished: Signal;
        entity: Entity;
        node: Node2D;
        current_animation: Animation;
        next_animation: Animation;
        name: string;
        speed: number;
        length: number;
        time: number;
        frame_data: FrameData;

        constructor(entity: Entity, node: Node2D);
        get_progress(): number;
        set_progress(value: number);
        get_animations(): string[];
        play(name: string);
        transition(name: string, total_transition_time: number);
        blend(first: string, second: string, factor: number);
        update(delta: number);
        protected animate(delta: number);
    }
    export class CoaSprite extends Node2D {
        animator: Animator;
        load(data: string, entity: number): CoaSprite;
        play(anim: string): boolean;
        transition(name: string, total_transition_time: number): boolean;
        blend(first: string, second: string, factor: number): boolean;
    }

    // - text
    export interface TextStyle {
        fontFamily?: string;
        fontSize?: string;
        fill?: string | number | CanvasGradient | CanvasPattern;
        align?: string;
        stroke?: string | number;
        strokeThickness?: number;
        wordWrap?: boolean;
        wordWrapWidth?: number;
        letterSpacing?: number;
        breakWords?: boolean;
        lineHeight?: number;
        dropShadow?: boolean;
        dropShadowColor?: string | number;
        dropShadowAngle?: number;
        dropShadowDistance?: number;
        dropShadowBlur?: number;
        padding?: number;
        textBaseline?: string;
        lineJoin?: string;
        miterLimit?: number;
    }
    export class Text extends Sprite {
        static fontPropertiesCache: any;
        static fontPropertiesCanvas: HTMLCanvasElement;
        static fontPropertiesContext: CanvasRenderingContext2D;

        protected _text: string;
        protected _style: TextStyle;

        protected updateText(): void;
        protected updateTexture(): void;
        protected drawLetterSpacing(text: string, x: number, y: number, isStroke: boolean): void;
        protected determineFontProperties(fontStyle: TextStyle): TextStyle;
        protected wordWrap(text: string): boolean;

        constructor(text?: string, style?: TextStyle, resolution?: number);

        canvas: HTMLCanvasElement;
        context: CanvasRenderingContext2D;
        dirty: boolean;
        resolution: number;
        text: string;
        style: TextStyle;

        width: number;
        height: number;
    }

    // - map
    export class BackgrounMap extends Node2D {
        constructor(tile_width: number, tile_height: number, data: number[][], texture: Texture | string);

        data: number[][];
        tile_width: number;
        tile_height: number;
        textures: Texture[];

        protected pointsBuf: Vector[];
        protected _tempSize: Float32Array;
        protected _tempTexSize: number;
        protected modificationMarker: number;

        protected vbId: number;
        protected vbBuffer: ArrayBuffer;
        protected vbArray: Float32Array;
        protected vbInts: Uint32Array;

        protected _globalMat: Matrix;
        protected _tempScale: number[];
        protected _needs_redraw: boolean;

        clear();
        get_tile(x: number, y: number): number;
        set_tile(x: number, y: number, tile: number);

        protected _push_tile(u: number, v: number, x: number, y: number);
        protected _draw_tiles();
    }

    interface CollisionResponse {
        collision: {
            x: boolean;
            y: boolean;
            slope: boolean;
        };

        tile: Vector;
        collider: Node2D;

        position: Vector;
        normal: Vector;
        travel: Vector;
        remainder: Vector;
    }
    export class CollisionMap extends Node2D {
        constructor(tile_size: number, data: number[][], layer_bit: number, tiledef: any);

        width: number;
        height: number;
        collision_layer: number;
        tilesize: number;
        data: number[][];
        last_slop: number;
        tiledef: any;

        get_collision_layer(): number;
        get_collision_layer_bit(bit): number;
        set_collision_layer(layer: number);
        set_collision_layer_bit(bit: number, value: boolean);
        trace(x: number, y: number, vx: number, vy: number, object_width: number, object_height: number, res: CollisionResponse);

        clear();
        get_tile(x: number, y: number): number;
        set_tile(x: number, y: number, tile: number);
    }

    // - timer
    export class Timer extends Node2D {
        timeout: Signal;

        wait_time: number;
        autostart: boolean;
        one_shot: boolean;
        processing: boolean;
        paused: boolean;

        time_left: number;

        set_wait_time(time: number);
        get_wait_time(): number;
        set_one_shot(one_shot: boolean);
        is_one_shot(): boolean;
        set_autostart(autostart: boolean);
        has_autostart(): boolean;
        set_paused(pause: boolean);
        is_paused(): boolean;
        is_stopped(): boolean;
        get_time_left(): number;

        start();
        stop();
    }

    // - physics
    interface CollisionShape {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }
    export class CollisionObject2D extends Node2D {
        collision_layer: number;
        collision_mask: number;

        left: number;
        right: number;
        top: number;
        bottom: number;

        protected _shape: CollisionShape;

        get_shape(): CollisionShape;
        set_shape(shape: CollisionShape);
        get_collision_layer(): number;
        get_collision_layer_bit(bit): number;
        set_collision_layer(layer: number);
        set_collision_layer_bit(bit: number, value: boolean);
        get_collision_mask(): number;
        get_collision_mask_bit(bit): number;
        set_collision_mask(mask: number);
        set_collision_mask_bit(bit: number, value: boolean);
    }
    export class RectangleShape2D implements CollisionShape {
        left: number;
        right: number;
        top: number;
        bottom: number;

        extents: ObservablePoint;
        points: Point[];
        calc_points: Point[];
        edges: Point[];
        normals: Point[];

        protected _dirty: boolean;

        constructor(extents_x: number, extents_y: number);

        calculate_points(node: Node2D);
        protected _calc_points(node: Node2D);
    }
    export class Area2D extends CollisionObject2D {
        rotation: number;

        set_rotation(rot: number);

        area_enter(area: Area2D);
        area_exit(area: Area2D);
        body_enter(body: PhysicsBody2D);
        body_exit(body: PhysicsBody2D);

        protected _area_inout(is_in: boolean, area: Area2D);
        protected _body_inout(is_in: boolean, body: PhysicsBody2D);
    }
    export class PhysicsBody2D extends CollisionObject2D {
        collision_exceptions: PhysicsBody2D[];

        move(vec: Vector);

        add_collision_exception_with(body: PhysicsBody2D);

        protected _collide_body(body: PhysicsBody2D, res: CollisionResponse): boolean;
        protected _collide_map(res: CollisionResponse);
    }

    // - textures

    export class BaseTexture extends EventEmitter {
        static from_image(imageUrl: string, crossorigin?: boolean, scaleMode?: number): BaseTexture;
        static from_canvas(canvas: HTMLCanvasElement, scaleMode?: number): BaseTexture;

        protected _glTextures: any;

        protected _sourceLoaded(): void;

        constructor(source: HTMLImageElement | HTMLCanvasElement, scaleMode?: number, resolution?: number);

        uuid: number;
        resolution: number;
        width: number;
        height: number;
        realWidth: number;
        realHeight: number;
        scaleMode: number;
        hasLoaded: boolean;
        isLoading: boolean;
        source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
        premultipliedAlpha: boolean;
        imageUrl: string;
        isPowerOfTwo: boolean;
        mipmap: boolean;

        update(): void;
        loadSource(source: HTMLImageElement | HTMLCanvasElement): void;
        destroy(): void;
        dispose(): void;
        updateSourceImage(newSrc: string): void;

        on(event: 'dispose', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        on(event: 'error', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        on(event: 'loaded', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        on(event: 'update', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        on(event: string, fn: Function, context?: any): EventEmitter;

        once(event: 'dispose', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        once(event: 'error', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        once(event: 'loaded', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        once(event: 'update', fn: (baseTexture: BaseTexture) => void, context?: any): EventEmitter;
        once(event: string, fn: Function, context?: any): EventEmitter;
    }
    export class RenderTexture extends Texture {
        protected render_webGL(displayObject: Node2D, matrix?: Matrix, clear?: boolean, updateTransform?: boolean): void;
        protected render_canvas(displayObject: Node2D, matrix?: Matrix, clear?: boolean, updateTransform?: boolean): void;

        static create(width?: number, height?: number, scaleMode?: number, resolution?: number): RenderTexture;

        constructor();

        width: number;
        height: number;
        resolution: number;
        renderer: CanvasRenderer | WebGLRenderer;
        valid: boolean;

        render(displayObject: Node2D, matrix?: Matrix, clear?: boolean, updateTransform?: boolean): void;
        resize(width: number, height: number, updateBase?: boolean): void;
        clear(): void;
        destroy(): void;
        getImage(): HTMLImageElement;
        getPixels(): number[];
        getPixel(x: number, y: number): number[];
        getBase64(): string;
        getCanvas(): HTMLCanvasElement;
    }
    export class Texture extends EventEmitter {
        static from_image(imageUrl: string, crossOrigin?: boolean, scaleMode?: number): Texture;
        static from_frame(frameId: string): Texture;
        static from_canvas(canvas: HTMLCanvasElement, scaleMode?: number): Texture;
        static from_video(video: HTMLVideoElement | string, scaleMode?: number): Texture;
        static from_video_rrl(videoUrl: string, scaleMode?: number): Texture;
        static add_texture_to_cache(texture: Texture, id: string): void;
        static remove_texture_from_cache(id: string): Texture;
        static EMPTY: Texture;
        static WHITE: Texture;

        protected _frame: Rectangle;

        protected onBaseTextureUpdated(baseTexture: BaseTexture): void;
        protected onBaseTextureLoaded(baseTexture: BaseTexture): void;

        constructor(baseTexture: BaseTexture, frame?: Rectangle, crop?: Rectangle, trim?: Rectangle, rotate?: number);

        no_frame: boolean;
        base_texture: BaseTexture;
        trim: Rectangle;
        valid: boolean;
        requires_update: boolean;
        width: number;
        height: number;
        orig: Rectangle;
        rotate: number;
        crop: Rectangle;

        frame: Rectangle;

        update(): void;
        destroy(destroyBase?: boolean): void;
        clone(): Texture;

        //pixi-spine needs it
        _uvs: TextureUvs;
        _updateUvs(): void;
    }
    namespace Texture {
        const EMPTY: Texture;
        const WHITE: Texture;
    }
    export class TextureUvs {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        x3: number;
        y3: number;

        protected set(frame: Rectangle, baseFrame: Rectangle, rotate: number): void;
    }
    export class VideoBaseTexture extends BaseTexture {
        static from_video(video: HTMLVideoElement, scaleMode?: number): VideoBaseTexture;
        static from_rrl(videoSrc: string | any | string[] | any[]): VideoBaseTexture;

        protected _loaded: boolean;
        protected _onUpdate(): void;
        protected _onPlayStart(): void;
        protected _onPlayStop(): void;
        protected _onCanPlay(): void;

        constructor(source: HTMLVideoElement, scaleMode?: number);

        auto_update: boolean;

        destroy(): void;
    }

    // - bitmap text
    export interface BitmapTextStyle {
        font?: string | {
            name?: string;
            size?: number;
        };
        align?: string;
        tint?: number;
    }
    export class BitmapText extends Node2D {
        static fonts: any;

        protected _glyphs: Sprite[];
        protected _font: string | {
            tint: number;
            align: string;
            name: string;
            size: number;
        };
        protected _text: string;

        protected updateText(): void;

        constructor(text: string, style?: BitmapTextStyle);

        text_width: number;
        text_height: number;
        max_width: number;
        letter_spacing: number;
        max_line_height: number;
        dirty: boolean;

        tint: number;
        align: string;
        font: string | {
            tint: number;
            align: string;
            name: string;
            size: number;
        };
        text: string;
        anchor: Point;
    }

    // - tiling sprite
    export class TilingSprite extends Sprite {
        //This is really unclean but is the only way :(
        //See http://stackoverflow.com/questions/29593905/typescript-declaration-extending-class-with-static-method/29595798#29595798
        //Thanks bas!
        static from_frame(frameId: string): Sprite;
        static from_image(imageId: string, crossorigin?: boolean, scaleMode?: number): Sprite;

        static from_frame(frameId: string, width?: number, height?: number): TilingSprite;
        static from_image(imageId: string, width?: number, height?: number, crossorigin?: boolean, scaleMode?: number): TilingSprite;

        constructor(texture?: Texture | string, width?: number, height?: number);

        tile_scale: Point;
        tile_position: Point;

        uv_transform: TextureMatrix;
        uv_respect_anchor: boolean;

        width: number;
        height: number;

        contains_point(point: Point): boolean;
        destroy(): void;
    }

    export class NineSliceSprite extends Node2D {
        constructor(texture: Texture | string, top: number, right: number, bottom: number, left: number);
        texture_left: number;
        texture_right: number;
        texture_top: number;
        texture_bottom: number;
        texture: Texture;

        n: Sprite;
        s: Sprite;
        e: Sprite;
        w: Sprite;
        nw: Sprite;
        ne: Sprite;
        sw: Sprite;
        se: Sprite;

        tint: number;
        width: number;
        height: number;

        resize(w: number, h: number);

        protected _center_rect: Rectangle;
        protected _update_visual();
    }

    // - mesh
    export class Mesh extends Node2D {
        static DRAW_MODES: {
            TRIANGLE_MESH: number;
            TRIANGLES: number;
        };

        constructor(texture: Texture, vertices?: ArrayLike<number>, uvs?: ArrayLike<number>, indices?: ArrayLike<number>, drawMode?: number);

        texture: Texture;
        uvs: Float32Array;
        vertices: Float32Array;
        indices: Uint16Array;
        dirty: number;
        index_dirty: number;
        blend_mode: number;
        canvas_padding: number;
        draw_mode: number;
        shader: Shader | Filter;

        getBounds(matrix?: Matrix): Rectangle;
        containsPoint(point: Point): boolean;
        multiply_uvs(): void;
        refresh(force_update?: boolean): void;
        _refresh(): void;

        protected _texture: Texture;

        protected _renderCanvasTriangleMesh(context: CanvasRenderingContext2D): void;
        protected _renderCanvasTriangles(context: CanvasRenderingContext2D): void;
        protected _renderCanvasDrawTriangle(context: CanvasRenderingContext2D, vertices: number, uvs: number, index0: number, index1: number, index2: number): void;
        protected renderMeshFlat(Mesh: Mesh): void;
        protected _onTextureUpdate(): void;
    }
    export class Rope extends Mesh {
        protected _is_ready: boolean;

        protected getTextureUvs(): TextureUvs;

        constructor(texture: Texture, points: Point[]);

        points: Point[];
        colors: number[];

        refresh(): void;
    }
    export class Plane extends Mesh {
        segmentsX: number;
        segmentsY: number;

        constructor(texture: Texture, segmentsX?: number, segmentsY?: number);
    }
    export class MeshRenderer extends ObjectRenderer {
        protected _initWebGL(mesh: Mesh): void;

        indices: number[];

        constructor(renderer: WebGLRenderer);

        render(mesh: Mesh): void;
        flush(): void;
        start(): void;
        destroy(): void;
    }
    export interface MeshShader extends Shader {}

    // - utils
    export namespace utils {
        export function uuid(): number;
        export function hex2rgb(hex: number, out?: ArrayLike<number>): ArrayLike<number>;
        export function hex2string(hex: number): string;
        export function rgb2hex(rgb: ArrayLike<number>): number;
        export function canUseNewCanvasBlendModes(): boolean;
        export function getNextPowerOfTwo(number: number): number;
        export function isPowerOfTwo(width: number, height: number): boolean;
        export function getResolutionOfUrl(url: string): number;
        export function skipHello(): void;
        export function sayHello(type: string): void;
        export function isWebGLSupported(): boolean;
        export function sign(n: number): number;
        export function removeItems<T>(arr: T[], startIdx: number, removeCount: number): void;
        export const TextureCache: { [key: string]: Texture };
        export const BaseTextureCache: { [key: string]: BaseTexture };

        export namespace isMobile {
            export * from 'ismobilejs';
        }
    }

    export module ticker {
        export var shared: Ticker;
        export class Ticker {
            protected _tick(time: number): void;
            protected _emitter: EventEmitter;
            protected _requestId: number;
            protected _maxElapsedMS: number;

            protected _requestIfNeeded(): void;
            protected _cancelIfNeeded(): void;
            protected _startIfPossible(): void;

            autoStart: boolean;
            deltaTime: number;
            elapsedMS: number;
            lastTime: number;
            speed: number;
            started: boolean;

            FPS: number;
            minFPS: number;

            add(fn: (deltaTime: number) => void, context?: any): Ticker;
            addOnce(fn: (deltaTime: number) => void, context?: any): Ticker;
            remove(fn: (deltaTime: number) => void, context?: any): Ticker;
            start(): void;
            stop(): void;
            update(): void;
        }
    }

    // filters
    export namespace filters {
        export * from 'engine/filters';
    }

    // input
    import Input from 'engine/input';
    export const input: Input;

    // interaction
    export module interaction {
        export * from 'engine/interaction';
    }

    // loaders
    import ResourceLoader, { Resource } from 'resource-loader';
    export namespace loaders {
        export class Loader extends ResourceLoader {
            protected static _pixiMiddleware: Function[];
            static addPixiMiddleware(fn: Function): void;
        }
        export class Resource extends ResourceLoader {}
    }
    export const loader: loaders.Loader;

    // index.js
    export const sound: audio.SoundLibrary;

    // SceneTree.js
    import SceneTree from 'engine/SceneTree';
    export const scene_tree: SceneTree;

    // Signal.js
    export { default as Signal } from 'mini-signals';
    export { MiniSignalBinding } from 'mini-signals';

    export function assemble_scene(scn: Node2D, data: any);

    /**
     * @type {{[k:string]: Function}}
     */
    export const registered_scene_class;

    /**
     * Register scene class, for packed scene instancing process
     * @param {string} key  Key of the scene class
     * @param {Function} ctor Class to be registered
     */
    export function register_scene_class(key: string, ctor: Function): void;
}
