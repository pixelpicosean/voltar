import Sound from '../Sound';

/**
 * @typedef SoundSpriteData
 * @property {number} start
 * @property {number} end
 * @property {speed} [start]
 */

 /**
  * @typedef SoundSprites {[id: string]: SoundSprite}
  */

/**
 * Object that represents a single Sound's sprite.
 * @param {Sound} parent The parent sound
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
        this.start = 0;
        this.end = 0;
        this.speed = 1;

        this.parent = parent;
        Object.assign(this, options);
        this.duration = this.end - this.start;

        console.assert(this.duration > 0, 'End time must be after start time');
    }
    /**
     * Play the sound sprite.
     * @method SoundSprite#play
     * @param {import('../Sound').CompleteCallback} [complete] Function call when complete
     * @return {IMediaInstance|Promise<IMediaInstance>} Sound instance being played.
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
     * @method SoundSprite#destroy
     */
    destroy() {
        this.parent = null;
    }
}
