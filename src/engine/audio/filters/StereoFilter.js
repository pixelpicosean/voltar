import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';
import WebAudioUtils from '../webaudio/WebAudioUtils';

/**
 * Filter for adding Stereo panning.
 *
 * @param {number} [pan=0] The amount of panning, -1 is left, 1 is right, 0 is centered.
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
        } else {
            panner = audioContext.createPanner();
            panner.panningModel = 'equalpower';
            destination = panner;
        }

        super(destination);

        /**
         * The stereo panning node
         * @type {StereoPannerNode}
         * @private
         */
        this._stereo = stereo;

        /**
         * The stereo panning node
         * @type {PannerNode}
         * @private
         */
        this._panner = panner;

        /**
         * The amount of panning, -1 is left, 1 is right, 0 is centered
         * @type {number}
         * @private
         */
        this._pan = 0;

        this.pan = pan;
    }
    /**
     * Set the amount of panning, where -1 is left, 1 is right, and 0 is centered
     * @type {number}
     */
    set pan(value) {
        this._pan = value;
        if (this._stereo) {
            WebAudioUtils.setParamValue(this._stereo.pan, value);
        } else {
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
