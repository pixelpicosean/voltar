import Filterable from "../Filterable";
/**
 * @class WebAudioNodes
 * @extends PIXI.sound.Filterable
 * @private
 * @memberof PIXI.sound.webaudio
 * @param {PIXI.sound.webaudio.WebAudioContext} audioContext The audio context.
 */
export default class WebAudioNodes extends Filterable {
    constructor(context) {
        const audioContext = context.audioContext;
        const bufferSource = audioContext.createBufferSource();
        const script = audioContext.createScriptProcessor(WebAudioNodes.BUFFER_SIZE);
        const gain = audioContext.createGain();
        const analyser = audioContext.createAnalyser();
        bufferSource.connect(analyser);
        analyser.connect(gain);
        gain.connect(context.destination);
        script.connect(context.destination);
        super(analyser, gain);
        this.context = context;
        this.bufferSource = bufferSource;
        this.script = script;
        this.gain = gain;
        this.analyser = analyser;
    }
    /**
     * Cleans up.
     * @method PIXI.sound.SoundNodes#destroy
     */
    destroy() {
        super.destroy();
        this.bufferSource.disconnect();
        this.script.disconnect();
        this.gain.disconnect();
        this.analyser.disconnect();
        this.bufferSource = null;
        this.script = null;
        this.gain = null;
        this.analyser = null;
        this.context = null;
    }
    /**
     * Clones the bufferSource. Used just before playing a sound.
     * @method PIXI.sound.SoundNodes#cloneBufferSource
     * @returns {AudioBufferSourceNode} The clone AudioBufferSourceNode.
     */
    cloneBufferSource() {
        const orig = this.bufferSource;
        const clone = this.context.audioContext.createBufferSource();
        clone.buffer = orig.buffer;
        clone.playbackRate.value = orig.playbackRate.value;
        clone.loop = orig.loop;
        clone.connect(this.destination);
        return clone;
    }
}
/**
 * The buffer size for script processor
 * @name PIXI.sound.SoundNodes.BUFFER_SIZE
 * @type {Number}
 * @default 256
 */
WebAudioNodes.BUFFER_SIZE = 256;
