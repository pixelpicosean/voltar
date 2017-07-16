import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';
/**
 * Filter for adding Stereo panning.
 *
 * @class StereoFilter
 * @memberof PIXI.sound.filters
 * @param {Number} [pan=0] The amount of panning, -1 is left, 1 is right, 0 is centered.
 */
export default class StereoFilter extends Filter {
    constructor(pan = 0) {
        if (SoundLibrary.instance.useLegacy) {
            super(null);
            return;
        }
        let stereo;
        let panner;
        let destination;
        const audioContext = SoundLibrary.instance.context.audioContext;
        if (audioContext.createStereoPanner) {
            stereo = audioContext.createStereoPanner();
            destination = stereo;
        }
        else {
            panner = audioContext.createPanner();
            panner.panningModel = 'equalpower';
            destination = panner;
        }
        super(destination);
        this._stereo = stereo;
        this._panner = panner;
        this.pan = pan;
    }
    /**
     * Set the amount of panning, where -1 is left, 1 is right, and 0 is centered
     * @name PIXI.sound.filters.StereoFilter#pan
     * @type {Number}
     */
    set pan(value) {
        this._pan = value;
        if (this._stereo) {
            this._stereo.pan.value = value;
        }
        else {
            this._panner.setPosition(value, 0, 1 - Math.abs(value));
        }
    }
    get pan() {
        return this._pan;
    }
    destroy() {
        super.destroy();
        this._stereo = null;
        this._panner = null;
    }
}
