/**
 * Node2Ds with the {@link V.interaction.interactiveTarget} mixin use this class to track interactions
 *
 * @class
 * @private
 * @memberof V.interaction
 */
export default class InteractionTrackingData
{
    /**
     * @param {number} pointer_id - Unique pointer id of the event
     */
    constructor(pointer_id)
    {
        this._pointer_id = pointer_id;
        this._flags = InteractionTrackingData.FLAGS.NONE;
    }

    /**
     *
     * @private
     * @param {number} flag - The interaction flag to set
     * @param {boolean} yn - Should the flag be set or unset
     */
    _doSet(flag, yn)
    {
        if (yn)
        {
            this._flags = this._flags | flag;
        }
        else
        {
            this._flags = this._flags & (~flag);
        }
    }

    /**
     * Unique pointer id of the event
     *
     * @readonly
     * @member {number}
     */
    get pointer_id()
    {
        return this._pointer_id;
    }

    /**
     * State of the tracking data, expressed as bit flags
     *
     * @member {number}
     * @memberof V.interaction.InteractionTrackingData#
     */
    get flags()
    {
        return this._flags;
    }

    /**
     * Set the flags for the tracking data
     *
     * @param {number} flags - Flags to set
     */
    set flags(flags)
    {
        this._flags = flags;
    }

    /**
     * Is the tracked event inactive (not over or down)?
     *
     * @member {number}
     * @memberof V.interaction.InteractionTrackingData#
     */
    get none()
    {
        return this._flags === this.constructor.FLAGS.NONE;
    }

    /**
     * Is the tracked event over the Node2D?
     *
     * @member {boolean}
     * @memberof V.interaction.InteractionTrackingData#
     */
    get over()
    {
        return (this._flags & this.constructor.FLAGS.OVER) !== 0;
    }

    /**
     * Set the over flag
     *
     * @param {boolean} yn - Is the event over?
     */
    set over(yn)
    {
        this._doSet(this.constructor.FLAGS.OVER, yn);
    }

    /**
     * Did the right mouse button come down in the Node2D?
     *
     * @member {boolean}
     * @memberof V.interaction.InteractionTrackingData#
     */
    get right_down()
    {
        return (this._flags & this.constructor.FLAGS.RIGHT_DOWN) !== 0;
    }

    /**
     * Set the right down flag
     *
     * @param {boolean} yn - Is the right mouse button down?
     */
    set right_down(yn)
    {
        this._doSet(this.constructor.FLAGS.RIGHT_DOWN, yn);
    }

    /**
     * Did the left mouse button come down in the Node2D?
     *
     * @member {boolean}
     * @memberof V.interaction.InteractionTrackingData#
     */
    get left_down()
    {
        return (this._flags & this.constructor.FLAGS.LEFT_DOWN) !== 0;
    }

    /**
     * Set the left down flag
     *
     * @param {boolean} yn - Is the left mouse button down?
     */
    set left_down(yn)
    {
        this._doSet(this.constructor.FLAGS.LEFT_DOWN, yn);
    }
}

InteractionTrackingData.FLAGS = Object.freeze({
    NONE: 0,
    OVER: 1 << 0,
    LEFT_DOWN: 1 << 1,
    RIGHT_DOWN: 1 << 2,
});
