import SoundLibrary from '../SoundLibrary';
import WebAudioContext from './WebAudioContext';

/**
 * Internal class for Web Audio abstractions and convenience methods.
 */
export default class WebAudioUtils {
    /**
     * Dezippering is removed in the future Web Audio API, instead
     * we use the `setValueAtTime` method, however, this is not available
     * in all environments (e.g., Android webview), so we fallback to the `value` setter.
     * @param {AudioParam} param - AudioNode parameter object
     * @param {number} value - Value to set
     * @return {number} The value set
     */
    static setParamValue(param, value) {
        if (param.setValueAtTime) {
            /** @type {WebAudioContext} */
            // @ts-ignore
            const context = SoundLibrary.instance.context;
            param.setValueAtTime(value, context.audioContext.currentTime);
        } else {
            param.value = value;
        }
        return value;
    }
}
