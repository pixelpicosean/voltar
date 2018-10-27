import { Vector2 } from "engine/math/index";
import Node2D from "engine/scene/Node2D";

/**
 * Holds all information related to an Interaction event
 */
export default class InteractionData {
    /**
     *
     */
    constructor() {
        /**
         * This point stores the global coords of where the touch/mouse event happened
         *
         * @member {Vector2}
         */
        this.global = new Vector2();

        /**
         * The target Node2D that was interacted with
         *
         * @member {Node2D}
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
    get pointer_id() {
        return this.identifier;
    }

    /**
     * This will return the local coordinates of the specified node for this InteractionData
     *
     * @param {Node2D} node - The Node2D that you would like the local
     *  coords off
     * @param {import("engine/math/Vector2").Vector2Like} [point] - A Vector2 object in which to store the value, optional (otherwise
     *  will create a new point)
     * @param {import("engine/math/Vector2").Vector2Like} [globalPos] - A Vector2 object containing your custom global coords, optional
     *  (otherwise will use the current global coords)
     * @return {import("engine/math/Vector2").Vector2Like} A point containing the coordinates of the InteractionData position relative
     *  to the Node2D
     */
    get_local_position(node, point, globalPos) {
        return node.world_transform.apply_inverse(globalPos || this.global, point);
    }

    /**
     * Copies properties from normalized event data.
     *
     * @param {Touch|MouseEvent|PointerEvent} event The normalized event data
     * @private
     */
    copy_event(event) {
        // isPrimary should only change on touchstart/pointerdown, so we don't want to overwrite
        // it with "false" on later events when our shim for it on touch events might not be
        // accurate
        // @ts-ignore
        if (event.isPrimary) {
            this.is_primary = true;
        }
        // @ts-ignore
        this.button = event.button;
        // event.buttons is not available in all browsers (ie. Safari), but it does have a non-standard
        // event.which property instead, which conveys the same information.
        // @ts-ignore
        this.buttons = Number.isInteger(event.buttons) ? event.buttons : event.which;
        // @ts-ignore
        this.width = event.width;
        // @ts-ignore
        this.height = event.height;
        // @ts-ignore
        this.tilt_x = event.tiltX;
        // @ts-ignore
        this.tilt_y = event.tiltY;
        // @ts-ignore
        this.pointer_type = event.pointerType;
        // @ts-ignore
        this.pressure = event.pressure;
        // @ts-ignore
        this.rotation_angle = event.rotationAngle;
        // @ts-ignore
        this.twist = event.twist || 0;
        // @ts-ignore
        this.tangential_pressure = event.tangentialPressure || 0;
    }

    /**
     * Resets the data for pooling.
     *
     * @private
     */
    reset() {
        // is_primary is the only property that we really need to reset - everything else is
        // guaranteed to be overwritten
        this.is_primary = false;
    }
}
