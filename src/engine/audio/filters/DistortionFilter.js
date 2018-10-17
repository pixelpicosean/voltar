import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';

export default class DistortionFilter extends Filter {
    /**
     * Filter for adding adding delaynode.
     *
     * @param {number} [amount=0] The amount of distoration from 0 to 1.
     */
    constructor(amount = 0) {
        if (SoundLibrary.instance.useLegacy) {
            super(null);
            return;
        }

        const context = SoundLibrary.instance.context;
        const distortion = context.audioContext.createWaveShaper();

        super(distortion);

        /**
         * The Wave shape node use to distort
         * @type {WaveShaperNode}
         * @private
         */
        this._distortion = distortion;
        /**
         * The amount of distoration
         * @type {number}
         * @private
         */
        this._amount = 0;

        this.amount = amount;
    }
    /**
     * @type {number}
     */
    set amount(value) {
        value *= 1000;
        this._amount = value;
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        let i = 0;
        let x;

        for (; i < samples; ++i) {
            x = i * 2 / samples - 1;
            curve[i] = (3 + value) * x * 20 * deg / (Math.PI + value * Math.abs(x));
        }
        this._distortion.curve = curve;
        this._distortion.oversample = '4x';
    }
    get amount() {
        return this._amount;
    }
    destroy() {
        this._distortion = null;
        super.destroy();
    }
}
