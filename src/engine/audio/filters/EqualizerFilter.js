import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';
import WebAudioUtils from '../webaudio/WebAudioUtils';
/**
 * Filter for adding equalizer bands.
 *
 * @class EqualizerFilter
 * @memberof v.audio.filters
 * @param {number} [f32=0] Default gain for 32 Hz
 * @param {number} [f64=0] Default gain for 64 Hz
 * @param {number} [f125=0] Default gain for 125 Hz
 * @param {number} [f250=0] Default gain for 250 Hz
 * @param {number} [f500=0] Default gain for 500 Hz
 * @param {number} [f1k=0] Default gain for 1000 Hz
 * @param {number} [f2k=0] Default gain for 2000 Hz
 * @param {number} [f4k=0] Default gain for 4000 Hz
 * @param {number} [f8k=0] Default gain for 8000 Hz
 * @param {number} [f16k=0] Default gain for 16000 Hz
 */
export default class EqualizerFilter extends Filter {
    constructor(f32 = 0, f64 = 0, f125 = 0, f250 = 0, f500 = 0, f1k = 0, f2k = 0, f4k = 0, f8k = 0, f16k = 0) {
        if (SoundLibrary.instance.useLegacy) {
            super(null);
            return;
        }
        const equalizerBands = [
            {
                f: EqualizerFilter.F32,
                type: 'lowshelf',
                gain: f32
            },
            {
                f: EqualizerFilter.F64,
                type: 'peaking',
                gain: f64
            },
            {
                f: EqualizerFilter.F125,
                type: 'peaking',
                gain: f125
            },
            {
                f: EqualizerFilter.F250,
                type: 'peaking',
                gain: f250
            },
            {
                f: EqualizerFilter.F500,
                type: 'peaking',
                gain: f500
            },
            {
                f: EqualizerFilter.F1K,
                type: 'peaking',
                gain: f1k
            },
            {
                f: EqualizerFilter.F2K,
                type: 'peaking',
                gain: f2k
            },
            {
                f: EqualizerFilter.F4K,
                type: 'peaking',
                gain: f4k
            },
            {
                f: EqualizerFilter.F8K,
                type: 'peaking',
                gain: f8k
            },
            {
                f: EqualizerFilter.F16K,
                type: 'highshelf',
                gain: f16k
            }
        ];
        const bands = equalizerBands.map(function (band) {
            const filter = SoundLibrary.instance.context.audioContext.createBiquadFilter();
            filter.type = band.type;
            WebAudioUtils.setParamValue(filter.gain, band.gain);
            WebAudioUtils.setParamValue(filter.Q, 1);
            WebAudioUtils.setParamValue(filter.frequency, band.f);
            return filter;
        });
        // Setup the constructor AudioNode, where first is the input, and last is the output
        super(bands[0], bands[bands.length - 1]);
        // Manipulate the bands
        this.bands = bands;
        // Create a map
        this.bandsMap = {};
        for (let i = 0; i < this.bands.length; i++) {
            const node = this.bands[i];
            // Connect the previous band to the current one
            if (i > 0) {
                this.bands[i - 1].connect(node);
            }
            this.bandsMap[node.frequency.value] = node;
        }
    }
    /**
     * Set gain on a specific frequency.
     * @method v.audio.filters.EqualizerFilter#setGain
     * @param {number} frequency The frequency, see EqualizerFilter.F* for bands
     * @param {number} [gain=0] Recommended -40 to 40.
     */
    setGain(frequency, gain = 0) {
        if (!this.bandsMap[frequency]) {
            throw 'No band found for frequency ' + frequency;
        }
        WebAudioUtils.setParamValue(this.bandsMap[frequency].gain, gain);
    }
    /**
     * Get gain amount on a specific frequency.
     * @method v.audio.filters.EqualizerFilter#getGain
     * @return {number} The amount of gain set.
     */
    getGain(frequency) {
        if (!this.bandsMap[frequency]) {
            throw 'No band found for frequency ' + frequency;
        }
        return this.bandsMap[frequency].gain.value;
    }
    /**
     * Gain at 32 Hz frequencey.
     * @name v.audio.filters.EqualizerFilter#f32
     * @type {number}
     * @default 0
     */
    set f32(value) {
        this.setGain(EqualizerFilter.F32, value);
    }
    get f32() {
        return this.getGain(EqualizerFilter.F32);
    }
    /**
     * Gain at 64 Hz frequencey.
     * @name v.audio.filters.EqualizerFilter#f64
     * @type {number}
     * @default 0
     */
    set f64(value) {
        this.setGain(EqualizerFilter.F64, value);
    }
    get f64() {
        return this.getGain(EqualizerFilter.F64);
    }
    /**
     * Gain at 125 Hz frequencey.
     * @name v.audio.filters.EqualizerFilter#f125
     * @type {number}
     * @default 0
     */
    set f125(value) {
        this.setGain(EqualizerFilter.F125, value);
    }
    get f125() {
        return this.getGain(EqualizerFilter.F125);
    }
    /**
     * Gain at 250 Hz frequencey.
     * @name v.audio.filters.EqualizerFilter#f250
     * @type {number}
     * @default 0
     */
    set f250(value) {
        this.setGain(EqualizerFilter.F250, value);
    }
    get f250() {
        return this.getGain(EqualizerFilter.F250);
    }
    /**
     * Gain at 500 Hz frequencey.
     * @name v.audio.filters.EqualizerFilter#f500
     * @type {number}
     * @default 0
     */
    set f500(value) {
        this.setGain(EqualizerFilter.F500, value);
    }
    get f500() {
        return this.getGain(EqualizerFilter.F500);
    }
    /**
     * Gain at 1 KHz frequencey.
     * @name v.audio.filters.EqualizerFilter#f1k
     * @type {number}
     * @default 0
     */
    set f1k(value) {
        this.setGain(EqualizerFilter.F1K, value);
    }
    get f1k() {
        return this.getGain(EqualizerFilter.F1K);
    }
    /**
     * Gain at 2 KHz frequencey.
     * @name v.audio.filters.EqualizerFilter#f2k
     * @type {number}
     * @default 0
     */
    set f2k(value) {
        this.setGain(EqualizerFilter.F2K, value);
    }
    get f2k() {
        return this.getGain(EqualizerFilter.F2K);
    }
    /**
     * Gain at 4 KHz frequencey.
     * @name v.audio.filters.EqualizerFilter#f4k
     * @type {number}
     * @default 0
     */
    set f4k(value) {
        this.setGain(EqualizerFilter.F4K, value);
    }
    get f4k() {
        return this.getGain(EqualizerFilter.F4K);
    }
    /**
     * Gain at 8 KHz frequencey.
     * @name v.audio.filters.EqualizerFilter#f8k
     * @type {number}
     * @default 0
     */
    set f8k(value) {
        this.setGain(EqualizerFilter.F8K, value);
    }
    get f8k() {
        return this.getGain(EqualizerFilter.F8K);
    }
    /**
     * Gain at 16 KHz frequencey.
     * @name v.audio.filters.EqualizerFilter#f16k
     * @type {number}
     * @default 0
     */
    set f16k(value) {
        this.setGain(EqualizerFilter.F16K, value);
    }
    get f16k() {
        return this.getGain(EqualizerFilter.F16K);
    }
    /**
     * Reset all frequency bands to have gain of 0
     * @method v.audio.filters.EqualizerFilter#reset
     */
    reset() {
        this.bands.forEach((band) => {
            WebAudioUtils.setParamValue(band.gain, 0);
        });
    }
    destroy() {
        this.bands.forEach((band) => {
            band.disconnect();
        });
        this.bands = null;
        this.bandsMap = null;
    }
}
/**
 * Band at 32 Hz
 * @name v.audio.filters.EqualizerFilter.F32
 * @type {number}
 * @readonly
 */
EqualizerFilter.F32 = 32;
/**
 * Band at 64 Hz
 * @name v.audio.filters.EqualizerFilter.F64
 * @type {number}
 * @readonly
 */
EqualizerFilter.F64 = 64;
/**
 * Band at 125 Hz
 * @name v.audio.filters.EqualizerFilter.F125
 * @type {number}
 * @readonly
 */
EqualizerFilter.F125 = 125;
/**
 * Band at 250 Hz
 * @name v.audio.filters.EqualizerFilter.F250
 * @type {number}
 * @readonly
 */
EqualizerFilter.F250 = 250;
/**
 * Band at 500 Hz
 * @name v.audio.filters.EqualizerFilter.F500
 * @type {number}
 * @readonly
 */
EqualizerFilter.F500 = 500;
/**
 * Band at 1000 Hz
 * @name v.audio.filters.EqualizerFilter.F1K
 * @type {number}
 * @readonly
 */
EqualizerFilter.F1K = 1000;
/**
 * Band at 2000 Hz
 * @name v.audio.filters.EqualizerFilter.F2K
 * @type {number}
 * @readonly
 */
EqualizerFilter.F2K = 2000;
/**
 * Band at 4000 Hz
 * @name v.audio.filters.EqualizerFilter.F4K
 * @type {number}
 * @readonly
 */
EqualizerFilter.F4K = 4000;
/**
 * Band at 8000 Hz
 * @name v.audio.filters.EqualizerFilter.F8K
 * @type {number}
 * @readonly
 */
EqualizerFilter.F8K = 8000;
/**
 * Band at 16000 Hz
 * @name v.audio.filters.EqualizerFilter.F16K
 * @type {number}
 * @readonly
 */
EqualizerFilter.F16K = 16000;
