import * as core from '../core';

/**
 * Holds all information related to an Interaction event
 *
 * @class
 * @memberof V.interaction
 */
export default class InteractionData
{
    /**
     *
     */
    constructor()
    {
        /**
         * This point stores the global coords of where the touch/mouse event happened
         *
         * @member {V.Point}
         */
        this.global = new core.Point();

        /**
         * The target Node2D that was interacted with
         *
         * @member {V.Node2D}
         */
        this.target = null;

        /**
         * When passed to an event handler, this will be the original DOM Event that was captured
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
         * @see https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
         * @member {MouseEvent|TouchEvent|PointerEvent}
         */
        this.original_event = null;

        /**
         * Unique identifier for this interaction
         *
         * @member {number}
         */
        this.identifier = null;

        /**
         * Indicates whether or not the pointer device that created the event is the primary pointer.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/is_primary
         * @type {Boolean}
         */
        this.is_primary = false;

        /**
         * Indicates which button was pressed on the mouse or pointer device to trigger the event.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
         * @type {number}
         */
        this.button = 0;

        /**
         * Indicates which buttons are pressed on the mouse or pointer device when the event is triggered.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
         * @type {number}
         */
        this.buttons = 0;

        /**
         * The width of the pointer's contact along the x-axis, measured in CSS pixels.
         * radiusX of TouchEvents will be represented by this value.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/width
         * @type {number}
         */
        this.width = 0;

        /**
         * The height of the pointer's contact along the y-axis, measured in CSS pixels.
         * radiusY of TouchEvents will be represented by this value.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/height
         * @type {number}
         */
        this.height = 0;

        /**
         * The angle, in degrees, between the pointer device and the screen.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/tiltX
         * @type {number}
         */
        this.tilt_x = 0;

        /**
         * The angle, in degrees, between the pointer device and the screen.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/tiltY
         * @type {number}
         */
        this.tilt_y = 0;

        /**
         * The type of pointer that triggered the event.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType
         * @type {string}
         */
        this.pointer_type = null;

        /**
         * Pressure applied by the pointing device during the event. A Touch's force property
         * will be represented by this value.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure
         * @type {number}
         */
        this.pressure = 0;

        /**
         * From TouchEvents (not PointerEvents triggered by touches), the rotation_angle of the Touch.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Touch/rotationAngle
         * @type {number}
         */
        this.rotation_angle = 0;

        /**
         * Twist of a stylus pointer.
         * @see https://w3c.github.io/pointerevents/#pointerevent-interface
         * @type {number}
         */
        this.twist = 0;

        /**
         * Barrel pressure on a stylus pointer.
         * @see https://w3c.github.io/pointerevents/#pointerevent-interface
         * @type {number}
         */
        this.tangential_pressure = 0;
    }

    /**
     * The unique identifier of the pointer. It will be the same as `identifier`.
     * @readonly
     * @member {number}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointer_id
     */
    get pointer_id()
    {
        return this.identifier;
    }

    /**
     * This will return the local coordinates of the specified displayObject for this InteractionData
     *
     * @param {V.Node2D} displayObject - The Node2D that you would like the local
     *  coords off
     * @param {V.Point} [point] - A Point object in which to store the value, optional (otherwise
     *  will create a new point)
     * @param {V.Point} [globalPos] - A Point object containing your custom global coords, optional
     *  (otherwise will use the current global coords)
     * @return {V.Point} A point containing the coordinates of the InteractionData position relative
     *  to the Node2D
     */
    get_local_position(displayObject, point, globalPos)
    {
        return displayObject.world_transform.apply_inverse(globalPos || this.global, point);
    }

    /**
     * Copies properties from normalized event data.
     *
     * @param {Touch|MouseEvent|PointerEvent} event The normalized event data
     * @private
     */
    _copyEvent(event)
    {
        // is_primary should only change on touchstart/pointerdown, so we don't want to overwrite
        // it with "false" on later events when our shim for it on touch events might not be
        // accurate
        if (event.is_primary)
        {
            this.is_primary = true;
        }
        this.button = event.button;
        this.buttons = event.buttons;
        this.width = event.width;
        this.height = event.height;
        this.tilt_x = event.tiltX;
        this.tilt_y = event.tiltY;
        this.pointer_type = event.pointerType;
        this.pressure = event.pressure;
        this.rotation_angle = event.rotationAngle;
        this.twist = event.twist || 0;
        this.tangential_pressure = event.tangentialPressure || 0;
    }

    /**
     * Resets the data for pooling.
     *
     * @private
     */
    _reset()
    {
        // is_primary is the only property that we really need to reset - everything else is
        // guaranteed to be overwritten
        this.is_primary = false;
    }
}
