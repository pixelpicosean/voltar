import { VObject } from 'engine/dep/index';
import InteractionData from './InteractionData';
import InteractionEvent from './InteractionEvent';
import InteractionTrackingData from './InteractionTrackingData';
import interactive_target from './interactive_target';
import { mixins } from 'engine/utils/index';
import Node2D from 'engine/scene/Node2D';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import Vector2 from 'engine/math/Vector2';
import * as ticker from 'engine/ticker/index';
import { UPDATE_PRIORITY } from 'engine/const';

// Mix interactive_target into Node2D.prototype, after deprecation has been handled
mixins.delay_mixin(
    Node2D.prototype,
    interactive_target
);

const MOUSE_POINTER_ID = 1;

const NOOP = () => {};

// helpers for hit_test() - only used inside hit_test()
const hit_test_event = {
    type: null,
    target: null,
    current_target: null,
    data: {
        global: null,
    },
    stopped: false,
    stop_propagation: NOOP,
    reset: NOOP,
};

/**
 * The interaction manager deals with mouse, touch and pointer events. Any Node2D can be interactive
 * if its interactive parameter is set to true
 * This manager also supports multitouch.
 *
 * An instance of this class is automatically created by default, and can be found at renderer.plugins.interaction
 */
export default class InteractionManager extends VObject {
    /**
     * @param {WebGLRenderer} renderer - A reference to the current renderer
     * @param {object} [options] - The options for the manager.
     * @param {boolean} [options.auto_prevent_default=true] - Should the manager automatically prevent default browser actions.
     * @param {number} [options.interaction_frequency=10] - Frequency increases the interaction events will be checked.
     */
    constructor(renderer, options) {
        super();

        options = options || {};

        /**
         * The renderer this interaction manager works for.
         *
         * @member {SystemRenderer}
         */
        this.renderer = renderer;

        /**
         * Should default browser actions automatically be prevented.
         * Does not apply to pointer events for backwards compatibility
         * preventDefault on pointer events stops mouse events from firing
         * Thus, for every pointer event, there will always be either a mouse of touch event alongside it.
         *
         * @member {boolean}
         * @default true
         */
        this.auto_prevent_default = options.auto_prevent_default !== undefined ? options.auto_prevent_default : true;

        /**
         * Frequency in milliseconds that the mousemove, moveover & mouseout interaction events will be checked.
         *
         * @member {number}
         * @default 10
         */
        this.interaction_frequency = options.interaction_frequency || 10;

        /**
         * The mouse data
         *
         * @member {InteractionData}
         */
        this.mouse = new InteractionData();
        this.mouse.identifier = MOUSE_POINTER_ID;

        // setting the mouse to start off far off screen will mean that mouse over does
        //  not get called before we even move the mouse.
        this.mouse.global.set(-999999);

        /**
         * Actively tracked InteractionData
         *
         * @private
         * @member {Object.<number,interation.InteractionData>}
         */
        this.active_interaction_data = {};
        this.active_interaction_data[MOUSE_POINTER_ID] = this.mouse;

        /**
         * Pool of unused InteractionData
         *
         * @private
         * @member {interation.InteractionData[]}
         */
        this.interaction_data_pool = [];

        /**
         * An event data object to handle all the event tracking/dispatching
         *
         * @member {object}
         */
        this.event_data = new InteractionEvent();

        /**
         * The DOM element to bind to.
         *
         * @private
         * @member {HTMLElement}
         */
        this.interaction_dom_element = null;

        /**
         * This property determines if mousemove and touchmove events are fired only when the cursor
         * is over the object.
         * Setting to true will make things work more in line with how the DOM verison works.
         * Setting to false can make things easier for things like dragging
         * It is currently set to false as this is how pixi used to work. This will be set to true in
         * future versions of pixi.
         *
         * @member {boolean}
         */
        this.move_when_inside = true;

        /**
         * Have events been attached to the dom element?
         *
         * @private
         * @member {boolean}
         */
        this.events_added = false;

        /**
         * Is the mouse hovering over the renderer?
         *
         * @private
         * @member {boolean}
         */
        this.mouse_over_renderer = false;

        /**
         * Does the device support touch events
         * https://www.w3.org/TR/touch-events/
         *
         * @readonly
         * @member {boolean}
         */
        this.supports_touch_events = 'ontouchstart' in window;

        /**
         * Does the device support pointer events
         * https://www.w3.org/Submission/pointer-events/
         *
         * @readonly
         * @member {boolean}
         */
        // @ts-ignore
        this.supports_pointer_events = !!window.PointerEvent;

        // this will make it so that you don't have to call bind all the time

        /**
         * @private
         * @member {Function}
         */
        this.on_pointer_up = this.on_pointer_up.bind(this);
        this.process_pointer_up = this.process_pointer_up.bind(this);

        /**
         * @private
         * @member {Function}
         */
        this.on_pointer_cancel = this.on_pointer_cancel.bind(this);
        this.process_pointer_cancel = this.process_pointer_cancel.bind(this);

        /**
         * @private
         * @member {Function}
         */
        this.on_pointer_down = this.on_pointer_down.bind(this);
        this.process_pointer_down = this.process_pointer_down.bind(this);

        /**
         * @private
         * @member {Function}
         */
        this.on_pointer_move = this.on_pointer_move.bind(this);
        this.process_pointer_move = this.process_pointer_move.bind(this);

        /**
         * @private
         * @member {Function}
         */
        this.on_pointer_out = this.on_pointer_out.bind(this);
        this.process_pointer_over_out = this.process_pointer_over_out.bind(this);

        /**
         * @private
         * @member {Function}
         */
        this.on_pointer_over = this.on_pointer_over.bind(this);

        /**
         * Dictionary of how different cursor modes are handled. Strings are handled as CSS cursor
         * values, objects are handled as dictionaries of CSS values for interaction_dom_element,
         * and functions are called instead of changing the CSS.
         * Default CSS cursor values are provided for 'default' and 'pointer' modes.
         * @member {Object.<string, (string|Function|Object.<string, string>)>}
         */
        this.cursor_styles = {
            default: 'inherit',
            pointer: 'pointer',
        };

        /**
         * The mode of the cursor that is being used.
         * The value of this is a key from the cursor_styles dictionary.
         *
         * @member {string}
         */
        this.current_cursor_mode = null;

        /**
         * Internal cached let.
         *
         * @private
         * @member {string}
         */
        this.cursor = null;

        /**
         * Internal cached let.
         *
         * @private
         * @member {Vector2}
         */
        this._temp_point = new Vector2();

        /**
         * The current resolution / device pixel ratio.
         *
         * @member {number}
         * @default 1
         */
        this.resolution = 1;

        this.set_target_element(this.renderer.view, this.renderer.resolution);

        this.did_move = false;

        /**
         * Fired when a pointer device button (usually a mouse left-button) is pressed on the display
         * object.
         *
         * @event InteractionManager#mousedown
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
         * on the display object.
         *
         * @event InteractionManager#rightdown
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is released over the display
         * object.
         *
         * @event InteractionManager#mouseup
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is released
         * over the display object.
         *
         * @event InteractionManager#rightup
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is pressed and released on
         * the display object.
         *
         * @event InteractionManager#click
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
         * and released on the display object.
         *
         * @event InteractionManager#rightclick
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is released outside the
         * display object that initially registered a
         * [mousedown]{@link InteractionManager#event:mousedown}.
         *
         * @event InteractionManager#mouseupoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is released
         * outside the display object that initially registered a
         * [rightdown]{@link InteractionManager#event:rightdown}.
         *
         * @event InteractionManager#rightupoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device (usually a mouse) is moved while over the display object
         *
         * @event InteractionManager#mousemove
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device (usually a mouse) is moved onto the display object
         *
         * @event InteractionManager#mouseover
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device (usually a mouse) is moved off the display object
         *
         * @event InteractionManager#mouseout
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is pressed on the display object.
         *
         * @event InteractionManager#pointerdown
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is released over the display object.
         *
         * @event InteractionManager#pointerup
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when the operating system cancels a pointer event
         *
         * @event InteractionManager#pointercancel
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is pressed and released on the display object.
         *
         * @event InteractionManager#pointertap
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is released outside the display object that initially
         * registered a [pointerdown]{@link InteractionManager#event:pointerdown}.
         *
         * @event InteractionManager#pointerupoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device is moved while over the display object
         *
         * @event InteractionManager#pointermove
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device is moved onto the display object
         *
         * @event InteractionManager#pointerover
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device is moved off the display object
         *
         * @event InteractionManager#pointerout
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is placed on the display object.
         *
         * @event InteractionManager#touchstart
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is removed from the display object.
         *
         * @event InteractionManager#touchend
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when the operating system cancels a touch
         *
         * @event InteractionManager#touchcancel
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is placed and removed from the display object.
         *
         * @event InteractionManager#tap
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is removed outside of the display object that initially
         * registered a [touchstart]{@link InteractionManager#event:touchstart}.
         *
         * @event InteractionManager#touchendoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is moved along the display object.
         *
         * @event InteractionManager#touchmove
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is pressed on the display.
         * object. Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#mousedown
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
         * on the display object. Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#rightdown
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is released over the display
         * object. Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#mouseup
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is released
         * over the display object. Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#rightup
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is pressed and released on
         * the display object. Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#click
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
         * and released on the display object. Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#rightclick
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button (usually a mouse left-button) is released outside the
         * display object that initially registered a
         * [mousedown]{@link Node2D#event:mousedown}.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#mouseupoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device secondary button (usually a mouse right-button) is released
         * outside the display object that initially registered a
         * [rightdown]{@link Node2D#event:rightdown}.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#rightupoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device (usually a mouse) is moved while over the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#mousemove
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device (usually a mouse) is moved onto the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#mouseover
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device (usually a mouse) is moved off the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#mouseout
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is pressed on the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointerdown
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is released over the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointerup
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when the operating system cancels a pointer event.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointercancel
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is pressed and released on the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointertap
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device button is released outside the display object that initially
         * registered a [pointerdown]{@link Node2D#event:pointerdown}.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointerupoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device is moved while over the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointermove
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device is moved onto the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointerover
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a pointer device is moved off the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#pointerout
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is placed on the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#touchstart
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is removed from the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#touchend
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when the operating system cancels a touch.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#touchcancel
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is placed and removed from the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#tap
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is removed outside of the display object that initially
         * registered a [touchstart]{@link Node2D#event:touchstart}.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#touchendoutside
         * @param {InteractionEvent} event - Interaction event
         */

        /**
         * Fired when a touch point is moved along the display object.
         * Node2D's `interactive` property must be set to `true` to fire event.
         *
         * @event Node2D#touchmove
         * @param {InteractionEvent} event - Interaction event
         */
    }

    /**
     * Hit tests a point against the display tree, returning the first interactive object that is hit.
     *
     * @param {Vector2} global_point - A point to hit test with, in global space.
     * @param {Node2D} [root] - The root display object to start from. If omitted, defaults
     * to the last rendered root of the associated renderer.
     * @return {Node2D} The hit display object, if any.
     */
    hit_test(global_point, root) {
        // clear the target for our hit test
        hit_test_event.target = null;
        // assign the global point
        hit_test_event.data.global = global_point;
        // ensure safety of the root
        if (!root) {
            root = this.renderer._last_object_rendered;
        }
        // run the hit test
        this.process_interactive(hit_test_event, root, null, true);
        // return our found object - it'll be null if we didn't hit anything

        return hit_test_event.target;
    }

    /**
     * Sets the DOM element which will receive mouse/touch events. This is useful for when you have
     * other DOM elements on top of the renderers Canvas element. With this you'll be bale to deletegate
     * another DOM element to receive those events.
     *
     * @param {HTMLCanvasElement} element - the DOM element which will receive mouse and touch events.
     * @param {number} [resolution=1] - The resolution / device pixel ratio of the new element (relative to the canvas).
     */
    set_target_element(element, resolution = 1) {
        this.remove_events();

        this.interaction_dom_element = element;

        this.resolution = resolution;

        this.add_events();
    }

    /**
     * Registers all the DOM events
     *
     * @private
     */
    add_events() {
        if (!this.interaction_dom_element) {
            return;
        }

        ticker.shared.add(this.update, this, UPDATE_PRIORITY.INTERACTION);

        if (window.navigator.msPointerEnabled) {
            this.interaction_dom_element.style['-ms-content-zooming'] = 'none';
            this.interaction_dom_element.style['-ms-touch-action'] = 'none';
        }
        else if (this.supports_pointer_events) {
            this.interaction_dom_element.style['touch-action'] = 'none';
        }

        /**
         * These events are added first, so that if pointer events are normalised, they are fired
         * in the same order as non-normalised events. ie. pointer event 1st, mouse / touch 2nd
         */
        if (this.supports_pointer_events) {
            window.document.addEventListener('pointermove', this.on_pointer_move, true);
            this.interaction_dom_element.addEventListener('pointerdown', this.on_pointer_down, true);
            // pointerout is fired in addition to pointerup (for touch events) and pointercancel
            // we already handle those, so for the purposes of what we do in on_pointer_out, we only
            // care about the pointerleave event
            this.interaction_dom_element.addEventListener('pointerleave', this.on_pointer_out, true);
            this.interaction_dom_element.addEventListener('pointerover', this.on_pointer_over, true);
            window.addEventListener('pointercancel', this.on_pointer_cancel, true);
            window.addEventListener('pointerup', this.on_pointer_up, true);
        }
        else {
            window.document.addEventListener('mousemove', this.on_pointer_move, true);
            this.interaction_dom_element.addEventListener('mousedown', this.on_pointer_down, true);
            this.interaction_dom_element.addEventListener('mouseout', this.on_pointer_out, true);
            this.interaction_dom_element.addEventListener('mouseover', this.on_pointer_over, true);
            window.addEventListener('mouseup', this.on_pointer_up, true);
        }

        // always look directly for touch events so that we can provide original data
        // In a future version we should change this to being just a fallback and rely solely on
        // PointerEvents whenever available
        if (this.supports_touch_events) {
            this.interaction_dom_element.addEventListener('touchstart', this.on_pointer_down, true);
            this.interaction_dom_element.addEventListener('touchcancel', this.on_pointer_cancel, true);
            this.interaction_dom_element.addEventListener('touchend', this.on_pointer_up, true);
            this.interaction_dom_element.addEventListener('touchmove', this.on_pointer_move, true);
        }

        this.events_added = true;
    }

    /**
     * Removes all the DOM events that were previously registered
     *
     * @private
     */
    remove_events() {
        if (!this.interaction_dom_element) {
            return;
        }

        ticker.shared.remove(this.update, this);

        if (window.navigator.msPointerEnabled) {
            this.interaction_dom_element.style['-ms-content-zooming'] = '';
            this.interaction_dom_element.style['-ms-touch-action'] = '';
        }
        else if (this.supports_pointer_events) {
            this.interaction_dom_element.style['touch-action'] = '';
        }

        if (this.supports_pointer_events) {
            window.document.removeEventListener('pointermove', this.on_pointer_move, true);
            this.interaction_dom_element.removeEventListener('pointerdown', this.on_pointer_down, true);
            this.interaction_dom_element.removeEventListener('pointerleave', this.on_pointer_out, true);
            this.interaction_dom_element.removeEventListener('pointerover', this.on_pointer_over, true);
            window.removeEventListener('pointercancel', this.on_pointer_cancel, true);
            window.removeEventListener('pointerup', this.on_pointer_up, true);
        }
        else {
            window.document.removeEventListener('mousemove', this.on_pointer_move, true);
            this.interaction_dom_element.removeEventListener('mousedown', this.on_pointer_down, true);
            this.interaction_dom_element.removeEventListener('mouseout', this.on_pointer_out, true);
            this.interaction_dom_element.removeEventListener('mouseover', this.on_pointer_over, true);
            window.removeEventListener('mouseup', this.on_pointer_up, true);
        }

        if (this.supports_touch_events) {
            this.interaction_dom_element.removeEventListener('touchstart', this.on_pointer_down, true);
            this.interaction_dom_element.removeEventListener('touchcancel', this.on_pointer_cancel, true);
            this.interaction_dom_element.removeEventListener('touchend', this.on_pointer_up, true);
            this.interaction_dom_element.removeEventListener('touchmove', this.on_pointer_move, true);
        }

        this.interaction_dom_element = null;

        this.events_added = false;
    }

    /**
     * Updates the state of interactive objects.
     * Invoked by a throttled ticker update from {@link ticker.shared}.
     *
     * @param {number} delta_time - time delta since last tick
     */
    update(delta_time) {
        this._delta_time += delta_time;

        if (this._delta_time < this.interaction_frequency) {
            return;
        }

        this._delta_time = 0;

        if (!this.interaction_dom_element) {
            return;
        }

        // if the user move the mouse this check has already been done using the mouse move!
        if (this.did_move) {
            this.did_move = false;

            return;
        }

        this.cursor = null;

        // Resets the flag as set by a stop_propagation call. This flag is usually reset by a user interaction of any kind,
        // but there was a scenario of a display object moving under a static mouse cursor.
        // In this case, mouseover and mouseevents would not pass the flag test in dispatch_event function
        for (const k in this.active_interaction_data) {
            // eslint-disable-next-line no-prototype-builtins
            if (this.active_interaction_data.hasOwnProperty(k)) {
                const interactionData = this.active_interaction_data[k];

                if (interactionData.original_event && interactionData.pointer_type !== 'touch') {
                    const interaction_event = this.configure_interaction_event_for_dom_event(
                        this.event_data,
                        interactionData.original_event,
                        interactionData
                    );

                    this.process_interactive(
                        interaction_event,
                        this.renderer._last_object_rendered,
                        this.process_pointer_over_out,
                        true
                    );
                }
            }
        }

        this.set_cursor_mode(this.cursor);

        // TODO
    }

    /**
     * Sets the current cursor mode, handling any callbacks or CSS style changes.
     *
     * @param {string} mode - cursor mode, a key from the cursor_styles dictionary
     */
    set_cursor_mode(mode) {
        mode = mode || 'default';
        // if the mode didn't actually change, bail early
        if (this.current_cursor_mode === mode) {
            return;
        }
        this.current_cursor_mode = mode;
        const style = this.cursor_styles[mode];

        // only do things if there is a cursor style for it
        if (style) {
            switch (typeof style) {
                case 'string':
                    // string styles are handled as cursor CSS
                    this.interaction_dom_element.style.cursor = style;
                    break;
                case 'function':
                    // functions are just called, and passed the cursor mode
                    style(mode);
                    break;
                case 'object':
                    // if it is an object, assume that it is a dictionary of CSS styles,
                    // apply it to the interaction_dom_element
                    Object.assign(this.interaction_dom_element.style, style);
                    break;
            }
        }
        else if (typeof mode === 'string' && !Object.prototype.hasOwnProperty.call(this.cursor_styles, mode)) {
            // if it mode is a string (not a Symbol) and cursor_styles doesn't have any entry
            // for the mode, then assume that the dev wants it to be CSS for the cursor.
            this.interaction_dom_element.style.cursor = mode;
        }
    }

    /**
     * Dispatches an event on the display object that was interacted with
     *
     * @param {Node2D} node - the display object in question
     * @param {string} eventString - the name of the event (e.g, mousedown)
     * @param {object} event_data - the event data object
     * @private
     */
    dispatch_event(node, eventString, event_data) {
        if (!event_data.stopped) {
            event_data.current_target = node;
            event_data.type = eventString;

            node.emit_signal(eventString, event_data);

            if (node[eventString]) {
                node[eventString](event_data);
            }
        }
    }

    /**
     * Maps x and y coords from a DOM object and maps them correctly to the pixi view. The
     * resulting value is stored in the point. This takes into account the fact that the DOM
     * element could be scaled and positioned anywhere on the screen.
     *
     * @param  {Vector2} point - the point that the result will be stored in
     * @param  {number} x - the x coord of the position to map
     * @param  {number} y - the y coord of the position to map
     */
    map_position_to_point(point, x, y) {
        let rect;

        // IE 11 fix
        if (!this.interaction_dom_element.parentElement) {
            rect = { x: 0, y: 0, width: 0, height: 0 };
        }
        else {
            rect = this.interaction_dom_element.getBoundingClientRect();
        }

        // @ts-ignore
        const resolutionMultiplier = navigator.isCocoonJS ? this.resolution : (1.0 / this.resolution);

        // @ts-ignore
        point.x = ((x - rect.left) * (this.interaction_dom_element.width / rect.width)) * resolutionMultiplier;
        // @ts-ignore
        point.y = ((y - rect.top) * (this.interaction_dom_element.height / rect.height)) * resolutionMultiplier;
    }

    /**
     * This function is provides a neat way of crawling through the scene graph and running a
     * specified function on all interactive objects it finds. It will also take care of hit
     * testing the interactive objects and passes the hit across in the function.
     *
     * @private
     * @param {InteractionEvent} interactionEvent - event containing the point that
     *  is tested for collision
     * @param {Node2D} node - the node
     *  that will be hit test (recursively crawls its children)
     * @param {Function} [func] - the function that will be called on each interactive object. The
     *  interactionEvent, node and hit will be passed to the function
     * @param {boolean} [hit_test] - this indicates if the objects inside should be hit test against the point
     * @param {boolean} [interactive] - Whether the node is interactive
     * @return {boolean} returns true if the node hit the point
     */
    process_interactive(interactionEvent, node, func, hit_test, interactive) {
        if (!node || !node.visible) {
            return false;
        }

        const point = interactionEvent.data.global;

        // Took a little while to rework this function correctly! But now it is done and nice and optimised. ^_^
        //
        // This function will now loop through all objects and then only hit test the objects it HAS
        // to, not all of them. MUCH faster..
        // An object will be hit test if the following is true:
        //
        // 1: It is interactive.
        // 2: It belongs to a parent that is interactive AND one of the parents children have not already been hit.
        //
        // As another little optimisation once an interactive object has been hit we can carry on
        // through the scenegraph, but we know that there will be no more hits! So we can avoid extra hit tests
        // A final optimisation is that an object is not hit test directly if a child has already been hit.

        interactive = node.interactive || interactive;

        let hit = false;
        let interactiveParent = interactive;

        // Flag here can set to false if the event is outside the parents hit_area or mask
        let hit_test_children = true;

        // If there is a hit_area, no need to test against anything else if the pointer is not within the hit_area
        // There is also no longer a need to hitTest children.
        if (node.hit_area) {
            if (hit_test) {
                node.world_transform.xform_inv(point, this._temp_point);
                if (!node.hit_area.contains(this._temp_point.x, this._temp_point.y)) {
                    hit_test = false;
                    hit_test_children = false;
                }
                else {
                    hit = true;
                }
            }
            interactiveParent = false;
        }
        // If there is a mask, no need to test against anything else if the pointer is not within the mask
        else if (node._mask) {
            if (hit_test) {
                if (!node._mask.contains_point(point)) {
                    hit_test = false;
                    hit_test_children = false;
                }
            }
        }

        // ** FREE TIP **! If an object is not interactive or has no buttons in it
        // (such as a game scene!) set interactive_children to false for that node.
        // This will allow pixi to completely ignore and bypass checking the displayObjects children.
        if (hit_test_children && node.interactive_children && node.children) {
            const children = node.children;

            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i];

                // time to get recursive.. if this function will return if something is hit..
                const childHit = this.process_interactive(interactionEvent, child, func, hit_test, interactiveParent);

                if (childHit) {
                    // its a good idea to check if a child has lost its parent.
                    // this means it has been removed whilst looping so its best
                    if (!child.parent) {
                        continue;
                    }

                    // we no longer need to hit test any more objects in this container as we we
                    // now know the parent has been hit
                    interactiveParent = false;

                    // If the child is interactive , that means that the object hit was actually
                    // interactive and not just the child of an interactive object.
                    // This means we no longer need to hit test anything else. We still need to run
                    // through all objects, but we don't need to perform any hit tests.

                    if (childHit) {
                        if (interactionEvent.target) {
                            hit_test = false;
                        }
                        hit = true;
                    }
                }
            }
        }

        // no point running this if the item is not interactive or does not have an interactive parent.
        if (interactive) {
            // if we are hit testing (as in we have no hit any objects yet)
            // We also don't need to worry about hit testing if once of the displayObjects children
            // has already been hit - but only if it was interactive, otherwise we need to keep
            // looking for an interactive child, just in case we hit one
            if (hit_test && !interactionEvent.target) {
                // already tested against hit_area if it is defined
                // @ts-ignore
                if (!node.hit_area && node.contains_point) {
                    // @ts-ignore
                    if (node.contains_point(point)) {
                        hit = true;
                    }
                }
            }

            if (node.interactive) {
                if (hit && !interactionEvent.target) {
                    interactionEvent.target = node;
                }

                if (func) {
                    func(interactionEvent, node, !!hit);
                }
            }
        }

        return hit;
    }

    /**
     * Is called when the pointer button is pressed down on the renderer element
     *
     * @private
     * @param {PointerEvent} original_event - The DOM event of a pointer button being pressed down
     */
    on_pointer_down(original_event) {
        // if we support touch events, then only use those for touch events, not pointer events
        if (this.supports_touch_events && original_event.pointerType === 'touch') return;

        const events = this.normalize_to_pointer_data(original_event);

        /**
         * No need to prevent default on natural pointer events, as there are no side effects
         * Normalized events, however, may have the double mousedown/touchstart issue on the native android browser,
         * so still need to be prevented.
         */

        // Guaranteed that there will be at least one event in events, and all events must have the same pointer type

        // @ts-ignore
        if (this.auto_prevent_default && events[0].isNormalized) {
            original_event.preventDefault();
        }

        const eventLen = events.length;

        for (let i = 0; i < eventLen; i++) {
            const event = events[i];

            const interactionData = this.get_interaction_data_for_pointer_id(event);

            const interactionEvent = this.configure_interaction_event_for_dom_event(this.event_data, event, interactionData);

            interactionEvent.data.original_event = original_event;

            this.process_interactive(interactionEvent, this.renderer._last_object_rendered, this.process_pointer_down, true);

            this.emit_signal('pointerdown', interactionEvent);
            if (event.pointerType === 'touch') {
                this.emit_signal('touchstart', interactionEvent);
            }
            // emit a mouse event for "pen" pointers, the way a browser would emit a fallback event
            else if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
                const isRightButton = event.button === 2;

                this.emit_signal(isRightButton ? 'rightdown' : 'mousedown', this.event_data);
            }
        }
    }

    /**
     * Processes the result of the pointer down check and dispatches the event if need be
     *
     * @private
     * @param {InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {Node2D} node - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    process_pointer_down(interactionEvent, node, hit) {
        const data = interactionEvent.data;
        const id = interactionEvent.data.identifier;

        if (hit) {
            // @ts-ignore
            if (!node.tracked_pointers[id]) {
                // @ts-ignore
                node.tracked_pointers[id] = new InteractionTrackingData(id);
            }
            this.dispatch_event(node, 'pointerdown', interactionEvent);

            if (data.pointer_type === 'touch') {
                this.dispatch_event(node, 'touchstart', interactionEvent);
            }
            else if (data.pointer_type === 'mouse' || data.pointer_type === 'pen') {
                const isRightButton = data.button === 2;

                if (isRightButton) {
                    // @ts-ignore
                    node.tracked_pointers[id].right_down = true;
                }
                else {
                    // @ts-ignore
                    node.tracked_pointers[id].left_down = true;
                }

                this.dispatch_event(node, isRightButton ? 'rightdown' : 'mousedown', interactionEvent);
            }
        }
    }

    /**
     * Is called when the pointer button is released on the renderer element
     *
     * @private
     * @param {PointerEvent} original_event - The DOM event of a pointer button being released
     * @param {boolean} cancelled - true if the pointer is cancelled
     * @param {Function} func - Function passed to {@link process_interactive}
     */
    on_pointer_complete(original_event, cancelled, func) {
        const events = this.normalize_to_pointer_data(original_event);

        const eventLen = events.length;

        // if the event wasn't targeting our canvas, then consider it to be pointerupoutside
        // in all cases (unless it was a pointercancel)
        const eventAppend = original_event.target !== this.interaction_dom_element ? 'outside' : '';

        for (let i = 0; i < eventLen; i++) {
            const event = events[i];

            const interactionData = this.get_interaction_data_for_pointer_id(event);

            const interactionEvent = this.configure_interaction_event_for_dom_event(this.event_data, event, interactionData);

            interactionEvent.data.original_event = original_event;

            // perform hit testing for events targeting our canvas or cancel events
            this.process_interactive(interactionEvent, this.renderer._last_object_rendered, func, cancelled || !eventAppend);

            this.emit_signal(cancelled ? 'pointercancel' : `pointerup${eventAppend}`, interactionEvent);

            if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
                const isRightButton = event.button === 2;

                this.emit_signal(isRightButton ? `rightup${eventAppend}` : `mouseup${eventAppend}`, interactionEvent);
            }
            else if (event.pointerType === 'touch') {
                this.emit_signal(cancelled ? 'touchcancel' : `touchend${eventAppend}`, interactionEvent);
                this.release_interaction_data_for_pointer_id(event.pointerId);
            }
        }
    }

    /**
     * Is called when the pointer button is cancelled
     *
     * @private
     * @param {PointerEvent} event - The DOM event of a pointer button being released
     */
    on_pointer_cancel(event) {
        // if we support touch events, then only use those for touch events, not pointer events
        if (this.supports_touch_events && event.pointerType === 'touch') return;

        this.on_pointer_complete(event, true, this.process_pointer_cancel);
    }

    /**
     * Processes the result of the pointer cancel check and dispatches the event if need be
     *
     * @private
     * @param {InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {Node2D} node - The display object that was tested
     */
    process_pointer_cancel(interactionEvent, node) {
        const data = interactionEvent.data;

        const id = interactionEvent.data.identifier;

        // @ts-ignore
        if (node.tracked_pointers[id] !== undefined) {
            // @ts-ignore
            delete node.tracked_pointers[id];
            this.dispatch_event(node, 'pointercancel', interactionEvent);

            if (data.pointer_type === 'touch') {
                this.dispatch_event(node, 'touchcancel', interactionEvent);
            }
        }
    }

    /**
     * Is called when the pointer button is released on the renderer element
     *
     * @private
     * @param {PointerEvent} event - The DOM event of a pointer button being released
     */
    on_pointer_up(event) {
        // if we support touch events, then only use those for touch events, not pointer events
        if (this.supports_touch_events && event.pointerType === 'touch') return;

        this.on_pointer_complete(event, false, this.process_pointer_up);
    }

    /**
     * Processes the result of the pointer up check and dispatches the event if need be
     *
     * @private
     * @param {InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {Node2D} node - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    process_pointer_up(interactionEvent, node, hit) {
        const data = interactionEvent.data;

        const id = interactionEvent.data.identifier;

        // @ts-ignore
        const trackingData = node.tracked_pointers[id];

        const isTouch = data.pointer_type === 'touch';

        const isMouse = (data.pointer_type === 'mouse' || data.pointer_type === 'pen');
        // need to track mouse down status in the mouse block so that we can emit
        // event in a later block
        let isMouseTap = false;

        // Mouse only
        if (isMouse) {
            const isRightButton = data.button === 2;

            const flags = InteractionTrackingData.FLAGS;

            const test = isRightButton ? flags.RIGHT_DOWN : flags.LEFT_DOWN;

            const isDown = trackingData !== undefined && (trackingData.flags & test);

            if (hit) {
                this.dispatch_event(node, isRightButton ? 'rightup' : 'mouseup', interactionEvent);

                if (isDown) {
                    this.dispatch_event(node, isRightButton ? 'rightclick' : 'click', interactionEvent);
                    // because we can confirm that the mousedown happened on this object, emit pointertap
                    isMouseTap = true;
                }
            }
            else if (isDown) {
                this.dispatch_event(node, isRightButton ? 'rightupoutside' : 'mouseupoutside', interactionEvent);
            }
            // update the down state of the tracking data
            if (trackingData) {
                if (isRightButton) {
                    trackingData.right_down = false;
                }
                else {
                    trackingData.left_down = false;
                }
            }
        }

        // Pointers and Touches, and Mouse
        if (hit) {
            this.dispatch_event(node, 'pointerup', interactionEvent);
            if (isTouch) this.dispatch_event(node, 'touchend', interactionEvent);

            if (trackingData) {
                // emit pointertap if not a mouse, or if the mouse block decided it was a tap
                if (!isMouse || isMouseTap) {
                    this.dispatch_event(node, 'pointertap', interactionEvent);
                }
                if (isTouch) {
                    this.dispatch_event(node, 'tap', interactionEvent);
                    // touches are no longer over (if they ever were) when we get the touchend
                    // so we should ensure that we don't keep pretending that they are
                    trackingData.over = false;
                }
            }
        }
        else if (trackingData) {
            this.dispatch_event(node, 'pointerupoutside', interactionEvent);
            if (isTouch) this.dispatch_event(node, 'touchendoutside', interactionEvent);
        }
        // Only remove the tracking data if there is no over/down state still associated with it
        if (trackingData && trackingData.none) {
            // @ts-ignore
            delete node.tracked_pointers[id];
        }
    }

    /**
     * Is called when the pointer moves across the renderer element
     *
     * @private
     * @param {PointerEvent} original_event - The DOM event of a pointer moving
     */
    on_pointer_move(original_event) {
        // if we support touch events, then only use those for touch events, not pointer events
        if (this.supports_touch_events && original_event.pointerType === 'touch') return;

        const events = this.normalize_to_pointer_data(original_event);

        if (events[0].pointerType === 'mouse' || events[0].pointerType === 'pen') {
            this.did_move = true;

            this.cursor = null;
        }

        const eventLen = events.length;

        for (let i = 0; i < eventLen; i++) {
            const event = events[i];

            const interactionData = this.get_interaction_data_for_pointer_id(event);

            const interactionEvent = this.configure_interaction_event_for_dom_event(this.event_data, event, interactionData);

            interactionEvent.data.original_event = original_event;

            const interactive = event.pointerType === 'touch' ? this.move_when_inside : true;

            this.process_interactive(
                interactionEvent,
                this.renderer._last_object_rendered,
                this.process_pointer_move,
                interactive
            );
            this.emit_signal('pointermove', interactionEvent);
            if (event.pointerType === 'touch') this.emit_signal('touchmove', interactionEvent);
            if (event.pointerType === 'mouse' || event.pointerType === 'pen') this.emit_signal('mousemove', interactionEvent);
        }

        if (events[0].pointerType === 'mouse' || events[0].pointerType === 'pen') {
            this.set_cursor_mode(this.cursor);

            // TODO BUG for parents interactive object (border order issue)
        }
    }

    /**
     * Processes the result of the pointer move check and dispatches the event if need be
     *
     * @private
     * @param {InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {Node2D} node - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    process_pointer_move(interactionEvent, node, hit) {
        const data = interactionEvent.data;

        const isTouch = data.pointer_type === 'touch';

        const isMouse = (data.pointer_type === 'mouse' || data.pointer_type === 'pen');

        if (isMouse) {
            this.process_pointer_over_out(interactionEvent, node, hit);
        }

        if (!this.move_when_inside || hit) {
            this.dispatch_event(node, 'pointermove', interactionEvent);
            if (isTouch) this.dispatch_event(node, 'touchmove', interactionEvent);
            if (isMouse) this.dispatch_event(node, 'mousemove', interactionEvent);
        }
    }

    /**
     * Is called when the pointer is moved out of the renderer element
     *
     * @private
     * @param {PointerEvent} original_event - The DOM event of a pointer being moved out
     */
    on_pointer_out(original_event) {
        // if we support touch events, then only use those for touch events, not pointer events
        if (this.supports_touch_events && original_event.pointerType === 'touch') return;

        const events = this.normalize_to_pointer_data(original_event);

        // Only mouse and pointer can call on_pointer_out, so events will always be length 1
        const event = events[0];

        if (event.pointerType === 'mouse') {
            this.mouse_over_renderer = false;
            this.set_cursor_mode(null);
        }

        const interactionData = this.get_interaction_data_for_pointer_id(event);

        const interactionEvent = this.configure_interaction_event_for_dom_event(this.event_data, event, interactionData);

        interactionEvent.data.original_event = event;

        this.process_interactive(interactionEvent, this.renderer._last_object_rendered, this.process_pointer_over_out, false);

        this.emit_signal('pointerout', interactionEvent);
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
            this.emit_signal('mouseout', interactionEvent);
        }
        else {
            // we can get touchleave events after touchend, so we want to make sure we don't
            // introduce memory leaks
            this.release_interaction_data_for_pointer_id(interactionData.identifier);
        }
    }

    /**
     * Processes the result of the pointer over/out check and dispatches the event if need be
     *
     * @private
     * @param {InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {Node2D} node - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    process_pointer_over_out(interactionEvent, node, hit) {
        const data = interactionEvent.data;

        const id = interactionEvent.data.identifier;

        const isMouse = (data.pointer_type === 'mouse' || data.pointer_type === 'pen');

        // @ts-ignore
        let trackingData = node.tracked_pointers[id];

        // if we just moused over the display object, then we need to track that state
        if (hit && !trackingData) {
            // @ts-ignore
            trackingData = node.tracked_pointers[id] = new InteractionTrackingData(id);
        }

        if (trackingData === undefined) return;

        if (hit && this.mouse_over_renderer) {
            if (!trackingData.over) {
                trackingData.over = true;
                this.dispatch_event(node, 'pointerover', interactionEvent);
                if (isMouse) {
                    this.dispatch_event(node, 'mouseover', interactionEvent);
                }
            }

            // only change the cursor if it has not already been changed (by something deeper in the
            // display tree)
            if (isMouse && this.cursor === null) {
                this.cursor = node.cursor;
            }
        }
        else if (trackingData.over) {
            trackingData.over = false;
            this.dispatch_event(node, 'pointerout', this.event_data);
            if (isMouse) {
                this.dispatch_event(node, 'mouseout', interactionEvent);
            }
            // if there is no mouse down information for the pointer, then it is safe to delete
            if (trackingData.none) {
                // @ts-ignore
                delete node.tracked_pointers[id];
            }
        }
    }

    /**
     * Is called when the pointer is moved into the renderer element
     *
     * @private
     * @param {PointerEvent} original_event - The DOM event of a pointer button being moved into the renderer view
     */
    on_pointer_over(original_event) {
        const events = this.normalize_to_pointer_data(original_event);

        // Only mouse and pointer can call on_pointer_over, so events will always be length 1
        const event = events[0];

        const interactionData = this.get_interaction_data_for_pointer_id(event);

        const interactionEvent = this.configure_interaction_event_for_dom_event(this.event_data, event, interactionData);

        interactionEvent.data.original_event = event;

        if (event.pointerType === 'mouse') {
            this.mouse_over_renderer = true;
        }

        this.emit_signal('pointerover', interactionEvent);
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
            this.emit_signal('mouseover', interactionEvent);
        }
    }

    /**
     * Get InteractionData for a given pointer_id. Store that data as well
     *
     * @private
     * @param {PointerEvent} event - Normalized pointer event, output from normalize_to_pointer_data
     * @return {InteractionData} - Interaction data for the given pointer identifier
     */
    get_interaction_data_for_pointer_id(event) {
        const pointer_id = event.pointerId;

        let interactionData;

        if (pointer_id === MOUSE_POINTER_ID || event.pointerType === 'mouse') {
            interactionData = this.mouse;
        }
        else if (this.active_interaction_data[pointer_id]) {
            interactionData = this.active_interaction_data[pointer_id];
        }
        else {
            interactionData = this.interaction_data_pool.pop() || new InteractionData();
            interactionData.identifier = pointer_id;
            this.active_interaction_data[pointer_id] = interactionData;
        }
        // copy properties from the event, so that we can make sure that touch/pointer specific
        // data is available
        interactionData.copy_event(event);

        return interactionData;
    }

    /**
     * Return unused InteractionData to the pool, for a given pointer_id
     *
     * @private
     * @param {number} pointer_id - Identifier from a pointer event
     */
    release_interaction_data_for_pointer_id(pointer_id) {
        const interactionData = this.active_interaction_data[pointer_id];

        if (interactionData) {
            delete this.active_interaction_data[pointer_id];
            interactionData.reset();
            this.interaction_data_pool.push(interactionData);
        }
    }

    /**
     * Configure an InteractionEvent to wrap a DOM PointerEvent and InteractionData
     *
     * @private
     * @param {InteractionEvent} interactionEvent - The event to be configured
     * @param {PointerEvent} pointerEvent - The DOM event that will be paired with the InteractionEvent
     * @param {InteractionData} interactionData - The InteractionData that will be paired
     *        with the InteractionEvent
     * @return {InteractionEvent} the interaction event that was passed in
     */
    configure_interaction_event_for_dom_event(interactionEvent, pointerEvent, interactionData) {
        interactionEvent.data = interactionData;

        this.map_position_to_point(interactionData.global, pointerEvent.clientX, pointerEvent.clientY);

        // This is the way InteractionManager processed touch events before the refactoring, so I've kept
        // it here. But it doesn't make that much sense to me, since map_position_to_point already factors
        // in this.resolution, so this just divides by this.resolution twice for touch events...
        // @ts-ignore
        if (navigator.isCocoonJS && pointerEvent.pointerType === 'touch') {
            interactionData.global.x = interactionData.global.x / this.resolution;
            interactionData.global.y = interactionData.global.y / this.resolution;
        }

        // Not really sure why this is happening, but it's how a previous version handled things
        if (pointerEvent.pointerType === 'touch') {
            // @ts-ignore
            pointerEvent.globalX = interactionData.global.x;
            // @ts-ignore
            pointerEvent.globalY = interactionData.global.y;
        }

        interactionData.original_event = pointerEvent;
        interactionEvent.reset();

        return interactionEvent;
    }

    /**
     * Ensures that the original event object contains all data that a regular pointer event would have
     *
     * @private
     * @param {TouchEvent|MouseEvent|PointerEvent} event - The original event data from a touch or mouse event
     * @return {PointerEvent[]} An array containing a single normalized pointer event, in the case of a pointer
     *  or mouse event, or a multiple normalized pointer events if there are multiple changed touches
     */
    normalize_to_pointer_data(event) {
        const normalizedEvents = [];

        if (this.supports_touch_events && event instanceof TouchEvent) {
            for (let i = 0, li = event.changedTouches.length; i < li; i++) {
                const touch = event.changedTouches[i];

                // @ts-ignore
                if (typeof touch.button === 'undefined') touch.button = event.touches.length ? 1 : 0;
                // @ts-ignore
                if (typeof touch.buttons === 'undefined') touch.buttons = event.touches.length ? 1 : 0;
                // @ts-ignore
                if (typeof touch.isPrimary === 'undefined') {
                // @ts-ignore
                    touch.isPrimary = event.touches.length === 1 && event.type === 'touchstart';
                }
                // @ts-ignore
                if (typeof touch.width === 'undefined') touch.width = touch.radiusX || 1;
                // @ts-ignore
                if (typeof touch.height === 'undefined') touch.height = touch.radiusY || 1;
                // @ts-ignore
                if (typeof touch.tiltX === 'undefined') touch.tiltX = 0;
                // @ts-ignore
                if (typeof touch.tiltY === 'undefined') touch.tiltY = 0;
                // @ts-ignore
                if (typeof touch.pointerType === 'undefined') touch.pointerType = 'touch';
                // @ts-ignore
                if (typeof touch.pointerId === 'undefined') touch.pointerId = touch.identifier || 0;
                // @ts-ignore
                if (typeof touch.pressure === 'undefined') touch.pressure = touch.force || 0.5;
                // @ts-ignore
                touch.twist = 0;
                // @ts-ignore
                touch.tangentialPressure = 0;
                // TODO: Remove these, as layerX/Y is not a standard, is deprecated, has uneven
                // support, and the fill ins are not quite the same
                // offsetX/Y might be okay, but is not the same as clientX/Y when the canvas's top
                // left is not 0,0 on the page
                // @ts-ignore
                if (typeof touch.layerX === 'undefined') touch.layerX = touch.offsetX = touch.clientX;
                // @ts-ignore
                if (typeof touch.layerY === 'undefined') touch.layerY = touch.offsetY = touch.clientY;

                // mark the touch as normalized, just so that we know we did it
                // @ts-ignore
                touch.isNormalized = true;

                normalizedEvents.push(touch);
            }
        }
        // apparently PointerEvent subclasses MouseEvent, so yay
        // @ts-ignore
        else if (event instanceof MouseEvent && (!this.supports_pointer_events || !(event instanceof window.PointerEvent))) {
            // @ts-ignore
            if (typeof event.isPrimary === 'undefined') event.isPrimary = true;
            // @ts-ignore
            if (typeof event.width === 'undefined') event.width = 1;
            // @ts-ignore
            if (typeof event.height === 'undefined') event.height = 1;
            // @ts-ignore
            if (typeof event.tiltX === 'undefined') event.tiltX = 0;
            // @ts-ignore
            if (typeof event.tiltY === 'undefined') event.tiltY = 0;
            // @ts-ignore
            if (typeof event.pointerType === 'undefined') event.pointerType = 'mouse';
            // @ts-ignore
            if (typeof event.pointerId === 'undefined') event.pointerId = MOUSE_POINTER_ID;
            // @ts-ignore
            if (typeof event.pressure === 'undefined') event.pressure = 0.5;
            // @ts-ignore
            event.twist = 0;
            // @ts-ignore
            event.tangentialPressure = 0;

            // mark the mouse event as normalized, just so that we know we did it
            // @ts-ignore
            event.isNormalized = true;

            normalizedEvents.push(event);
        }
        else {
            normalizedEvents.push(event);
        }

        // @ts-ignore
        return normalizedEvents;
    }

    /**
     * Destroys the interaction manager
     *
     */
    destroy() {
        this.remove_events();

        this.disconnect_all();

        this.renderer = null;

        this.mouse = null;

        this.event_data = null;

        this.interaction_dom_element = null;

        this.on_pointer_down = null;
        this.process_pointer_down = null;

        this.on_pointer_up = null;
        this.process_pointer_up = null;

        this.on_pointer_cancel = null;
        this.process_pointer_cancel = null;

        this.on_pointer_move = null;
        this.process_pointer_move = null;

        this.on_pointer_out = null;
        this.process_pointer_over_out = null;

        this.on_pointer_over = null;

        this._temp_point = null;
    }
}

WebGLRenderer.register_plugin('interaction', InteractionManager);
