import { device } from "engine/dep/index";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import {
    MainLoop,
    NOTIFICATION_WM_MOUSE_ENTER,
    NOTIFICATION_WM_MOUSE_EXIT,
    NOTIFICATION_WM_FOCUS_IN,
    NOTIFICATION_WM_FOCUS_OUT,
} from "engine/core/main_loop";
import { Input } from "engine/main/input";
import {
    InputEventWithModifiers,
    InputEventMouseButton,
    InputEventMouseMotion,
    BUTTON_LEFT,
    BUTTON_MIDDLE,
    BUTTON_RIGHT,
    InputEventKey,
} from "./input_event";
import { VisualServer } from "engine/servers/visual_server";
import { VSG } from "engine/servers/visual/visual_server_globals";


export const MOUSE_MODE_VISIBLE = 0;
export const MOUSE_MODE_HIDDEN = 1;
export const MOUSE_MODE_CAPTURED = 2;
export const MOUSE_MODE_CONFINED = 3;

export const VIDEO_DRIVER_GLES3 = 0; // webgl2
export const VIDEO_DRIVER_GLES2 = 1; // webgl
export const VIDEO_DRIVER_GLES2_LEGACY = 2; // older wegbl 1
export const VIDEO_DRIVER_MAX = 3;

export const SCREEN_LANDSCAPE = 0;
export const SCREEN_PORTRAIT = 1;
export const SCREEN_REVERSE_LANDSCAPE = 2;
export const SCREEN_REVERSE_PORTRAIT = 3;
export const SCREEN_SENSOR_LANDSCAPE = 4;
export const SCREEN_SENSOR_PORTRAIT = 5;
export const SCREEN_SENSOR = 6;

export class OS {
    static get_singleton() { return singleton }

    get_window_size() {
        return this.window_size.set(
            this.video_mode.resizable ? window.innerWidth : this.canvas.width,
            this.video_mode.resizable ? window.innerHeight : this.canvas.height
        )
    }
    /**
     * @param {Vector2Like} p_size
     */
    set_window_size(p_size) {
        this.set_window_size_n(p_size.x, p_size.y);
    }
    /**
     * @param {number} width
     * @param {number} height
     */
    set_window_size_n(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
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
            resizable: false,
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

        this.start_date = 0;

        this.canvas = null;
        this.gl = null;
    }

    initialize_core() { }

    /**
     * @param {HTMLCanvasElement} canvas
     */
    initialize(canvas) {
        this.canvas = canvas;
        if (this.video_mode.resizable) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else {
            canvas.width = this.video_mode.width;
            canvas.height = this.video_mode.height;
        }

        // if (device.phone || device.tablet) {
            this.video_driver_index = VIDEO_DRIVER_GLES2;
        // } else {
        //     this.video_driver_index = VIDEO_DRIVER_GLES3;
        // }
        const options = {
            alpha: false,
            antialias: true,
            depth: true,
            stencil: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
        };
        /** @type {WebGLRenderingContext} */
        let gl = null;
        if (this.video_driver_index === VIDEO_DRIVER_GLES3) {
            gl = /** @type {WebGLRenderingContext} */(this.canvas.getContext('webgl2', options));
        }
        if (!gl) {
            this.video_driver_index = VIDEO_DRIVER_GLES2;
            gl = /** @type {WebGLRenderingContext} */(this.canvas.getContext('webgl', options));
        }
        this.gl = gl;

        const visual_server = new VisualServer();
        this.input = new Input();


        const focus_canvas = () => {
            canvas.focus();
        };

        const support_touch_events = 'ontouchstart' in window;
        const support_pointer_events = 'PointerEvent' in window;

        const mouse_pos = new Vector2();
        let cursor_inside_canvas = true;
        const on_pointer_move = (/** @type {MouseEvent | PointerEvent} */e) => {
            const input_mask = this.input.get_mouse_button_mask();
            map_position_to_canvas_local(mouse_pos, canvas, e.clientX, e.clientY);
            // FIXME: should we only care about mouse motion when cursor is inside canvas?
            // if (!cursor_inside_canvas && !input_mask) {
            //     return false;
            // }

            const ev = InputEventMouseMotion.instance();
            map_position_to_canvas_local(ev.position, canvas, e.clientX, e.clientY);
            ev.global_position.copy(ev.position);
            ev.button_mask = input_mask;

            ev.relative.set(e.movementX, e.movementY);
            this.input.set_mouse_position(ev.position);
            ev.speed.copy(this.input.get_last_mouse_speed());

            this.input.parse_input_event(ev);
            return false;
        };
        const on_pointer_button = (/** @type {MouseEvent | PointerEvent} */e, /** @type {boolean} */is_down) => {
            const ev = InputEventMouseButton.instance();
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

        // mouse events
        if (support_pointer_events) {
            window.addEventListener('pointermove', on_pointer_move, true);
            canvas.addEventListener('pointerdown', (e) => on_pointer_button(e, true), true);
            window.addEventListener('pointerup', (e) => on_pointer_button(e, false), true);
        } else {
            window.addEventListener('mousemove', on_pointer_move, true);
            canvas.addEventListener('mousedown', (e) => on_pointer_button(e, true), true);
            window.addEventListener('mouseup', (e) => on_pointer_button(e, false), true);
        }

        // touch events
        if (support_touch_events) {
            // canvas.addEventListener('touchstart', (e) => on_pointer_button(e, true), true);
            // canvas.addEventListener('touchcancel', on_pointer_cancel, true);
            // canvas.addEventListener('touchend', (e) => on_pointer_button(e, false), true);
            // canvas.addEventListener('touchmove', on_pointer_move, true);
        }

        /**
         * @param {KeyboardEvent} e
         */
        function setup_key_event(e) {
            const ev = InputEventKey.instance();
            ev.echo = e.repeat;
            ev.alt = e.altKey;
            ev.shift = e.shiftKey;
            ev.meta = e.metaKey;
            ev.control = e.ctrlKey;
            ev.scancode = e.keyCode;
            ev.unicode = e.char;
            return ev;
        }

        // keyboard events
        window.addEventListener('keydown', (e) => {
            const ev = setup_key_event(e);
            ev.pressed = true;
            if (/** @type {any} */(ev.unicode) === 0) {
                // TODO: defer to keypress event for legacy unicode retrieval
                // return false;
            }
            this.input.parse_input_event(ev);
            // TODO: resume audio context after input
            return true;
        })
        window.addEventListener('keyup', (e) => {
            const ev = setup_key_event(e);
            ev.pressed = false;
            this.input.parse_input_event(ev);
            // TODO: resume audio context after input
            return /** @type {any} */(ev.unicode) !== 0;
        })

        // over/leave and focus/blur events
        canvas.addEventListener('mouseover', () => {
            cursor_inside_canvas = true;
            this.main_loop.notification(NOTIFICATION_WM_MOUSE_ENTER);
        })
        canvas.addEventListener('mouseleave', () => {
            cursor_inside_canvas = false;
            this.main_loop.notification(NOTIFICATION_WM_MOUSE_EXIT);
        })
        canvas.addEventListener('focus', () => {
            this.main_loop.notification(NOTIFICATION_WM_FOCUS_IN);
        })
        canvas.addEventListener('blur', () => {
            this.main_loop.notification(NOTIFICATION_WM_FOCUS_OUT);
        })

        const resize_canvas = () => {
            if (this.video_mode.resizable) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                this.canvas.style.width = `${window.innerWidth}px`;
                this.canvas.style.height = `${window.innerHeight}px`;
            } else {
                // adjust the canvas style, to fit the window
                const window_size = Vector2.new(window.innerWidth, window.innerHeight);
                const game_size = Vector2.new(this.video_mode.width, this.video_mode.height);
                const window_aspect = window_size.aspect();
                const game_aspect = game_size.aspect();
                VSG.canvas_render.resize(game_size.x, game_size.y);
                const canvas = OS.get_singleton().canvas;
                // - window is taller
                if (window_aspect < game_aspect) {
                    canvas.style.width = `${window_size.x}px`;
                    canvas.style.height = `${window_size.x / game_aspect}px`;
                }
                // - game is taller
                else if (window_aspect > game_aspect) {
                    canvas.style.height = `${window_size.y}px`;
                    canvas.style.width = `${window_size.y * game_aspect}px`;
                }
                else {
                    canvas.style.width = `${window_size.x}px`;
                    canvas.style.height = `${window_size.y}px`;
                }
                Vector2.free(game_size);
                Vector2.free(window_size);
            }
        }
        window.addEventListener('resize', resize_canvas)

        visual_server.init();
        resize_canvas();

        this.start_date = performance.now();
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
        return this.input.get_mouse_position();
    }
    get_mouse_button_state() {
        return this.input.get_mouse_button_mask();
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
