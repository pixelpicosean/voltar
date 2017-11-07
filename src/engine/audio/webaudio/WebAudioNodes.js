import Filterable from "../Filterable";
;
/**
 * @private
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
     * @returns {PIXI.sound.SoundNodes~SourceClone} The clone AudioBufferSourceNode.
     */
    cloneBufferSource() {
        const orig = this.bufferSource;
        const source = this.context.audioContext.createBufferSource();
        source.buffer = orig.buffer;
        source.playbackRate.value = orig.playbackRate.value;
        source.loop = orig.loop;
        const gain = this.context.audioContext.createGain();
        source.connect(gain);
        gain.connect(this.destination);
        return { source, gain };
    }
}
/**
 * The buffer size for script processor
 * @name PIXI.sound.SoundNodes.BUFFER_SIZE
 * @type {number}
 * @default 256
 */
WebAudioNodes.BUFFER_SIZE = 256;
