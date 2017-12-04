import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';
/**
 * Combine all channels into mono channel.
 *
 * @class MonoFilter
 * @memberof v.audio.filters
 */
export default class MonoFilter extends Filter {
    constructor() {
        if (SoundLibrary.instance.useLegacy) {
            super(null);
        }
        const audioContext = SoundLibrary.instance.context.audioContext;
        const splitter = audioContext.createChannelSplitter();
        const merger = audioContext.createChannelMerger();
        merger.connect(splitter);
        super(merger, splitter);
        this._merger = merger;
    }
    destroy() {
        this._merger.disconnect();
        this._merger = null;
        super.destroy();
    }
}
