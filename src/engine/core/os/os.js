import { Vector2, Vector2Like } from "engine/core/math/vector2";
import {
    MainLoop,
    NOTIFICATION_WM_MOUSE_ENTER,
    NOTIFICATION_WM_MOUSE_EXIT,
} from "engine/core/main_loop";
import { Input } from "engine/main/input";
import {
    InputEventMouseButton,
    InputEventWithModifiers,
    BUTTON_LEFT,
    BUTTON_MIDDLE,
    BUTTON_RIGHT,
} from "./input_event";
import { VisualServer } from "engine/servers/visual_server";


export const MOUSE_MODE_VISIBLE = 0;
export const MOUSE_MODE_HIDDEN = 1;
export const MOUSE_MODE_CAPTURED = 2;
export const MOUSE_MODE_CONFINED = 3;

export const VIDEO_DRIVER_GLES3 = 0;
export const VIDEO_DRIVER_GLES2 = 1;
export const VIDEO_DRIVER_MAX = 2;

export const SCREEN_LANDSCAPE = 0;
export const SCREEN_PORTRAIT = 1;
export const SCREEN_REVERSE_LANDSCAPE = 2;
export const SCREEN_REVERSE_PORTRAIT = 3;
export const SCREEN_SENSOR_LANDSCAPE = 4;
export const SCREEN_SENSOR_PORTRAIT = 5;
export const SCREEN_SENSOR = 6;

/**
 * @typedef OS_InitOptions
 * @property {HTMLCanvasElement} canvas
 */

let shift_key = false;
let alt_key = false;
let ctrl_key = false;
let meta_key = false;

export class OS {
    static get_singleton() { return singleton }

    get_window_size() {
        return this.window_size.set(
            this.canvas.width,
            this.canvas.height
        )
    }
    /**
     * @param {Vector2Like} p_size
     */
    set_window_size(p_size) {
        this.canvas.width = p_size.x;
        this.canvas.height = p_size.y;
    }

    get_main_loop() {
        return this.main_loop;
    }
    /**
     * @param {MainLoop} value
     */
    set_main_loop(value) {
        this.main_loop = value;
        this.input.main_loop = value;
    }

    constructor() {
        if (!singleton) singleton = this;

        this.video_mode = {
            width: 1024,
            height: 600,
            fullscreen: false,
            resizable: true,
        }

        this.input = null;


        this.last_click_pos = new Vector2();
        this.last_click_ms = 0;
        this.last_click_button_index = 0;

        /** @type {MainLoop} */
        this.main_loop = null;
        this.video_driver_index = VIDEO_DRIVER_GLES2;
        this.window_size = new Vector2();

        this.low_processor_usage_mode = false;
        this.no_window = false;
        this.screen_orientation = SCREEN_LANDSCAPE;

        this.start_date = performance.now();

        this.canvas = null;
    }

    initialize_core() { }

    /**
     * @param {OS_InitOptions} param0
     */
    initialize({ canvas }) {
        this.canvas = canvas;

        const visual_server = new VisualServer();
        this.input = new Input();


        const focus_canvas = () => {
            canvas.focus();
        };

        const support_touch_events = 'ontouchstart' in window;
        const support_pointer_events = 'PointerEvent' in window;

        const mouse_pos = new Vector2();
        let cursor_inside_canvas = true;
        const on_pointer_move = (e) => {
            const input_mask = this.input.get_mouse_button_mask();
            map_position_to_canvas_local(mouse_pos, canvas, e.clientX, e.clientY);
            if (!cursor_inside_canvas && !input_mask) {
                return false;
            }
        };
        const on_pointer_button = (/** @type {MouseEvent} */e, /** @type {boolean} */is_down) => {
            const ev = new InputEventMouseButton();
            ev.pressed = is_down;
            map_position_to_canvas_local(ev.position, canvas, e.clientX, e.clientY);
            ev.global_position.copy(ev.position);
            dom2godot_mod(e, ev);
            switch (e.button) {
                case 0: ev.button_index = BUTTON_LEFT; break;
                case 1: ev.button_index = BUTTON_MIDDLE; break;
                case 2: ev.button_index = BUTTON_RIGHT; break;
                default: return false;
            }

            if (ev.is_pressed()) {
                const diff = e.timeStamp - this.last_click_ms;

                if (ev.button_index === this.last_click_button_index) {
                    if (diff < 400 && this.last_click_pos.distance_to(ev.position) < 5) {
                        this.last_click_ms = 0;
                        this.last_click_pos.set(-100, -100);
                        this.last_click_button_index = -1;
                        ev.doubleclick = true;
                    }
                } else {
                    this.last_click_button_index = ev.button_index;
                }

                if (!ev.doubleclick) {
                    this.last_click_ms += diff;
                    this.last_click_pos.copy(ev.position);
                }
            }

            let mask = this.input.get_mouse_button_mask();
            const button_flag = 1 << (ev.button_index - 1);
            if (ev.is_pressed()) {
                focus_canvas();
                mask |= button_flag;
            } else if (mask & button_flag) {
                mask &= (~button_flag);
            } else {
                return false;
            }
            ev.button_mask = mask;

            this.input.parse_input_event(ev);
            // TODO: resume audio driver after input in case autoplay was denied
            return true;
        }
        const on_pointer_over = (e) => {
            cursor_inside_canvas = true;
            this.main_loop.notification(NOTIFICATION_WM_MOUSE_ENTER);
        }
        const on_pointer_out = (e) => {
            cursor_inside_canvas = false;
            this.main_loop.notification(NOTIFICATION_WM_MOUSE_EXIT);
        }
        const on_pointer_cancel = (e) => {
            map_position_to_canvas_local(mouse_pos, canvas, e.clientX, e.clientY);
        }

        if (support_pointer_events) {
            window.addEventListener('pointermove', on_pointer_move, true);
            canvas.addEventListener('pointerdown', (e) => on_pointer_button(e, true), true);
            canvas.addEventListener('pointerleave', on_pointer_out, true);
            canvas.addEventListener('pointerover', on_pointer_over, true);
            window.addEventListener('pointercancel', on_pointer_cancel, true);
            window.addEventListener('pointerup', (e) => on_pointer_button(e, false), true);
        } else {
            window.addEventListener('mousemove', on_pointer_move, true);
            canvas.addEventListener('mousedown', (e) => on_pointer_button(e, true), true);
            canvas.addEventListener('mouseout', on_pointer_out, true);
            canvas.addEventListener('mouseover', on_pointer_over, true);
            window.addEventListener('mouseup', (e) => on_pointer_button(e, false), true);
        }

        if (support_touch_events) {
            // canvas.addEventListener('touchstart', (e) => on_pointer_button(e, true), true);
            // canvas.addEventListener('touchcancel', on_pointer_cancel, true);
            // canvas.addEventListener('touchend', (e) => on_pointer_button(e, false), true);
            // canvas.addEventListener('touchmove', on_pointer_move, true);
        }

        window.addEventListener('keydown', (e) => {

        })
        visual_server.init();
    }

    get_ticks_msec() {
        return performance.now() - this.start_date;
    }
    get_ticks_usec() {
        return this.get_ticks_msec() * 1000;
    }

    can_draw() {
        return true;
    }

    get_mouse_position() {

    }
}

/** @type {OS} */
let singleton = null;

/**
 * @param {Vector2Like} out
 * @param {HTMLCanvasElement} canvas
 * @param {number} x
 * @param {number} y
 */
function map_position_to_canvas_local(out, canvas, x, y) {
    const rect = canvas.getBoundingClientRect();
    out.x = (x - rect.left) * (canvas.width / rect.width);
    out.y = (y - rect.top) * (canvas.height / rect.height);
}

/**
 * @param {MouseEvent} e
 * @param {InputEventWithModifiers} ev
 */
function dom2godot_mod(e, ev) {
    ev.shift = e.shiftKey;
    ev.alt = e.altKey;
    ev.control = e.ctrlKey;
    ev.meta = e.metaKey;
}

/**
 * @param {KeyboardEvent} event
 */
function is_caps_locked(event) {
    const code = event.charCode || event.keyCode;
    if (code > 64 && code < 91 && !event.shiftKey) {
        return true;
    }
    return false;
}
