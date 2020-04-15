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

declare module "*.png" {
    const value: string;
    export default value;
}

declare module "*.jpg" {
    const value: string;
    export default value;
}

declare module "*.jpeg" {
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

interface SVGElement {
    _tex_id: string;
    width: number;
    height: number;
}

// for howler.js

interface HTMLAudioElement {
    _unlocked: boolean;
}

interface AudioBufferSourceNode {
    noteOn: (n: number) => void;
    noteOff: (n: number) => void;
    noteGrainOn: (a: number, b: number, c: number) => void;
    noteGrainOff: (a: number, b: number, c: number) => void;
}

interface AudioContext {
    createGainNode: () => GainNode;
}

interface GainNode {
    paused: boolean;
    ended: boolean;
    currentTime: number;
    bufferSource: AudioBufferSourceNode;
}

// for font face observer

interface Document {
    fonts: {
        load: Function;
    }
}
