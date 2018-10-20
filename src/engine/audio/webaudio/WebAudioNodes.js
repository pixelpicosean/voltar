import Filterable from "../Filterable";
import WebAudioUtils from "./WebAudioUtils";
import WebAudioContext from "./WebAudioContext";

/**
 * @typedef SourceClone
 * @property {AudioBufferSourceNode} source
 * @property {GainNode} gain
 */

/**
 * @param {WebAudioContext} audioContext The audio context.
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

        /**
         * Reference to the SoundContext
         * @type {WebAudioContext}
         * @readonly
         */
        this.context = context;

        /**
         * Get the buffer source node
         * @type {AudioBufferSourceNode}
         * @readonly
         */
        this.bufferSource = bufferSource;

        /**
         * Get the script processor node.
         * @type {ScriptProcessorNode}
         * @readonly
         */
        this.script = script;

        /**
         * Get the gain node
         * @type {GainNode}
         * @readonly
         */
        this.gain = gain;

        /**
         * Get the analyser node
         * @type {AnalyserNode}
         * @readonly
         */
        this.analyser = analyser;
    }
    /**
     * Cleans up.
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
     * @returns {SourceClone} The clone AudioBufferSourceNode.
     */
    cloneBufferSource() {
        const orig = this.bufferSource;
        const source = this.context.audioContext.createBufferSource();
        source.buffer = orig.buffer;
        WebAudioUtils.setParamValue(source.playbackRate, orig.playbackRate.value);
        source.loop = orig.loop;

        const gain = this.context.audioContext.createGain();
        source.connect(gain);
        gain.connect(this.destination);
        return { source, gain };
    }
}

/**
 * The buffer size for script processor
 * @name SoundNodes.BUFFER_SIZE
 * @type {number}
 * @default 256
 */
WebAudioNodes.BUFFER_SIZE = 256;
