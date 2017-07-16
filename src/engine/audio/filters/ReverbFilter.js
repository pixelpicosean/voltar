import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';
/**
 * Filter for adding reverb. Refactored from
 * https://github.com/web-audio-components/simple-reverb/
 *
 * @class ReverbFilter
 * @memberof PIXI.sound.filters
 * @param {Number} [seconds=3] Seconds for reverb
 * @param {Number} [decay=2] The decay length
 * @param {Boolean} [reverse=false] Reverse reverb
 */
export default class ReverbFilter extends Filter {
    constructor(seconds = 3, decay = 2, reverse = false) {
        if (SoundLibrary.instance.useLegacy) {
            super(null);
            return;
        }
        const convolver = SoundLibrary.instance.context.audioContext.createConvolver();
        super(convolver);
        this._convolver = convolver;
        this._seconds = this._clamp(seconds, 1, 50);
        this._decay = this._clamp(decay, 0, 100);
        this._reverse = reverse;
        this._rebuild();
    }
    /**
     * Clamp a value
     * @method PIXI.sound.filters.ReverbFilter#_clamp
     * @private
     * @param {Number} value
     * @param {Number} min Minimum value
     * @param {Number} max Maximum value
     * @return {Number} Clamped number
     */
    _clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    /**
     * Length of reverb in seconds from 1 to 50
     * @name PIXI.sound.filters.ReverbFilter#decay
     * @type {Number}
     * @default 3
     */
    get seconds() {
        return this._seconds;
    }
    set seconds(seconds) {
        this._seconds = this._clamp(seconds, 1, 50);
        this._rebuild();
    }
    /**
     * Decay value from 0 to 100
     * @name PIXI.sound.filters.ReverbFilter#decay
     * @type {Number}
     * @default 2
     */
    get decay() {
        return this._decay;
    }
    set decay(decay) {
        this._decay = this._clamp(decay, 0, 100);
        this._rebuild();
    }
    /**
     * Reverse value from 0 to 1
     * @name PIXI.sound.filters.ReverbFilter#reverse
     * @type {Boolean}
     * @default false
     */
    get reverse() {
        return this._reverse;
    }
    set reverse(reverse) {
        this._reverse = reverse;
        this._rebuild();
    }
    /**
     * Utility function for building an impulse response
     * from the module parameters.
     * @method PIXI.sound.filters.ReverbFilter#_rebuild
     * @private
     */
    _rebuild() {
        const context = SoundLibrary.instance.context.audioContext;
        const rate = context.sampleRate;
        const length = rate * this._seconds;
        const impulse = context.createBuffer(2, length, rate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        let n;
        for (let i = 0; i < length; i++) {
            n = this._reverse ? length - i : i;
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, this._decay);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, this._decay);
        }
        this._convolver.buffer = impulse;
    }
    destroy() {
        this._convolver = null;
        super.destroy();
    }
}
