/**
 * Object that represents a single Sound's sprite.
 * @class SoundSprite
 * @memberof PIXI.sound
 * @param {PIXI.sound.Sound} parent The parent sound
 * @param {Object} options Data associated with object.
 * @param {Number} options.start The start time in seconds.
 * @param {Number} options.end The end time in seconds.
 * @param {Number} [options.speed] The optional speed, if not speed, uses
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
     * @method PIXI.sound.SoundSprite#play
     * @param {PIXI.sound.Sound~completeCallback} [complete] Function call when complete
     * @return {PIXI.sound.SoundInstance|Promise<PIXI.sound.SoundInstance>} Sound instance being played.
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
     * @method PIXI.sound.SoundSprite#destroy
     */
    destroy() {
        this.parent = null;
    }
}
