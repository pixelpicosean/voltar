declare module 'engine/audio' {
    export class SoundLibrary {
        context: IMediaContext;
        supported: boolean;
        useLegacy: boolean;
        volumeAll: number;
        speedAll: number;
        filtersAll: Filter[];
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
        static resolveUrl(source: string | PIXI.loaders.Resource): string;
        static sineTone(hertz?: number, seconds?: number): Sound;
        static render(sound: Sound, options?: RenderOptions): PIXI.BaseTexture;
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
