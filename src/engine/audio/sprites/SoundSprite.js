/**
 * Object that represents a single Sound's sprite.
 * @class SoundSprite
 * @memberof v.audio
 * @param {v.audio.Sound} parent The parent sound
 * @param {Object} options Data associated with object.
 * @param {number} options.start The start time in seconds.
 * @param {number} options.end The end time in seconds.
 * @param {number} [options.speed] The optional speed, if not speed, uses
 *        the default speed of the parent.
 */
export default class SoundSprite {
    /**
     * Constructor
     */
    constructor(parent, options) {
        this.parent = parent;
        Object.assign(this, options);
        this.duration = this.end - this.start;
        // @if DEBUG
        console.assert(this.duration > 0, "End time must be after start time");
        // @endif
    }
    /**
     * Play the sound sprite.
     * @method v.audio.SoundSprite#play
     * @param {v.audio.Sound~completeCallback} [complete] Function call when complete
     * @return {v.audio.IMediaInstance|Promise<v.audio.IMediaInstance>} Sound instance being played.
     */
    play(complete) {
        return this.parent.play(Object.assign({
            complete,
            speed: this.speed || this.parent.speed,
            end: this.end,
            start: this.start,
        }));
    }
    /**
     * Destroy and don't use after this
     * @method v.audio.SoundSprite#destroy
     */
    destroy() {
        this.parent = null;
    }
}
