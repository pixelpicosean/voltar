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
import { VisualServer } from "engine/servers/visual/visual_server";
import { VSG } from "engine/servers/visual/visual_server_globals";
import { AudioServer } from "engine/audio/index";

type ProjectSettings = import('../project_settings').ProjectSettings;


export const MOUSE_MODE_VISIBLE = 0;
export const MOUSE_MODE_HIDDEN = 1;
export const MOUSE_MODE_CAPTURED = 2;
export const MOUSE_MODE_CONFINED = 3;

export const VIDEO_DRIVER_GLES3 = 0; // webgl2
export const VIDEO_DRIVER_GLES2 = 1; // webgl
export const VIDEO_DRIVER_MAX = 2;

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
    set_window_size(p_size: Vector2Like) {
        this.set_window_size_n(p_size.x, p_size.y);
    }
    /**
     * @param {number} width
     * @param {number} height
     */
    set_window_size_n(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    get_main_loop() {
        return this.main_loop;
    }
    /**
     * @param {MainLoop} value
     */
    set_main_loop(value: MainLoop) {
        this.main_loop = value;
        this.input.main_loop = value;
    }

    video_mode = {
        width: 1024,
        height: 600,
        fullscreen: false,
        resizable: false,
    }

    input: Input = null;
    audio: AudioServer = null;


    last_click_pos = new Vector2();
    last_click_ms = 0;
    last_click_button_index = 0;

    main_loop: MainLoop = null;
    video_driver_index = VIDEO_DRIVER_GLES2;
    window_size = new Vector2;

    low_processor_usage_mode = false;
    no_window = false;
    screen_orientation = SCREEN_LANDSCAPE;

    start_date = 0;

    canvas: HTMLCanvasElement = null;
    gl: WebGLRenderingContext = null;
    gl_ext: any = null;

    constructor() {
        if (!singleton) singleton = this;

    }

    initialize_core() { }

    initialize(canvas: HTMLCanvasElement, settings: ProjectSettings) {
        this.canvas = canvas;
        if (this.video_mode.resizable) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else {
            canvas.width = this.video_mode.width;
            canvas.height = this.video_mode.height;
        }

        if (settings.display.antialias) {
            canvas.style.imageRendering = 'auto';
        } else {
            canvas.style.imageRendering = 'crisp-edges';
            canvas.style.imageRendering = 'pixelated';
        }

        if (settings.display.webgl2) {
            this.video_driver_index = VIDEO_DRIVER_GLES3;
        } else {
            this.video_driver_index = VIDEO_DRIVER_GLES2;
        }
        const options = {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
        };

        const driver_config = VSG.config;

        if (this.video_driver_index === VIDEO_DRIVER_GLES3) {
            const gl = this.canvas.getContext('webgl2', options) as WebGL2RenderingContext;
            this.gl_ext = {
                /* instancing API */

                VERTEX_ATTRIB_ARRAY_DIVISOR: gl.VERTEX_ATTRIB_ARRAY_DIVISOR,
                /**
                 * @param {number} index
                 * @param {number} divisor
                 */
                vertexAttribDivisor: (index: number, divisor: number) => gl.vertexAttribDivisor(index, divisor),
                /**
                 * @param {number} mode
                 * @param {number} first
                 * @param {number} count
                 * @param {number} primcount
                 */
                drawArraysInstanced: (mode: number, first: number, count: number, primcount: number) => gl.drawArraysInstanced(mode, first, count, primcount),
                /**
                 * @param {number} mode
                 * @param {number} count
                 * @param {number} type
                 * @param {number} offset
                 * @param {number} primcount
                 */
                drawElementsInstanced: (mode: number, count: number, type: number, offset: number, primcount: number) => gl.drawElementsInstanced(mode, count, type, offset, primcount),
            }
            this.gl = gl;

            if (gl) {
                driver_config.support_depth_texture = true;
                driver_config.use_rgba_3d_shadows = !driver_config.support_depth_texture;
                driver_config.depth_internalformat = gl.DEPTH_COMPONENT;
                driver_config.depth_type = gl.UNSIGNED_INT;
            }
        }
        if (!this.gl) {
            this.video_driver_index = VIDEO_DRIVER_GLES2;
            const gl = this.canvas.getContext('webgl', options) as WebGLRenderingContext;

            let instancing = gl.getExtension("ANGLE_instanced_arrays");

            // depth texture
            let depth_texture = gl.getExtension("WEBGL_depth_texture");
            if (depth_texture) {
                driver_config.support_depth_texture = true;
                driver_config.use_rgba_3d_shadows = !driver_config.support_depth_texture;
                driver_config.depth_internalformat = gl.DEPTH_COMPONENT;
                driver_config.depth_type = gl.UNSIGNED_INT;
            } else {
                // @ts-ignore
                depth_texture = {};
            }

            // VAO
            let vao = gl.getExtension("OES_vertex_array_object");
            if (vao) {
                driver_config.vao = true;
            } else {
                // @ts-ignore
                vao = {};
            }

            // TODO: compressed textures

            gl.getExtension('EXT_shader_texture_lod');

            driver_config.support_float_texture = !!gl.getExtension('OES_texture_float');

            this.gl_ext = {
                /* instancing API */
                VERTEX_ATTRIB_ARRAY_DIVISOR: instancing.VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE,
                vertexAttribDivisor: (index: number, divisor: number) => instancing.vertexAttribDivisorANGLE(index, divisor),
                drawArraysInstanced: (mode: number, first: number, count: number, primcount: number) => instancing.drawArraysInstancedANGLE(mode, first, count, primcount),
                drawElementsInstanced: (mode: number, count: number, type: number, offset: number, primcount: number) => instancing.drawElementsInstancedANGLE(mode, count, type, offset, primcount),

                /* depth texture */
                UNSIGNED_INT_24_8: depth_texture.UNSIGNED_INT_24_8_WEBGL,

                /* VAO */
                createVertexArray: () => vao.createVertexArrayOES(),
                deleteVertexArray: (arrayObject: WebGLVertexArrayObjectOES) => vao.deleteVertexArrayOES(arrayObject),
                isVertexArray: (arrayObject: WebGLVertexArrayObjectOES) => vao.isVertexArrayOES(arrayObject),
                bindVertexArray: (arrayObject: WebGLVertexArrayObjectOES) => vao.bindVertexArrayOES(arrayObject),
            }
            this.gl = gl;
        }

        {
            /* update config info */

            const gl = this.gl;

            driver_config.depth_buffer_internalformat = gl.DEPTH_COMPONENT16;

            driver_config.max_vertex_texture_image_units = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
            driver_config.max_texture_image_units = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
            driver_config.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE);

            // @Incomplete: support huge uniform based hardware skin instead
            driver_config.use_skeleton_software = !driver_config.support_float_texture || (driver_config.max_vertex_texture_image_units === 0);
        }

        const visual_server = new VisualServer;
        this.input = new Input;
        this.audio = new AudioServer;


        const focus_canvas = () => {
            canvas.focus();
        };

        const support_touch_events = 'ontouchstart' in window;
        const support_pointer_events = 'PointerEvent' in window;

        const mouse_pos = new Vector2();
        let cursor_inside_canvas = true;
        const on_pointer_move = (/** @type {MouseEvent | PointerEvent} */e: MouseEvent | PointerEvent) => {
            const input_mask = this.input.get_mouse_button_mask();
            map_position_to_canvas_local(mouse_pos, canvas, e.clientX, e.clientY);
            // @Question: should we only care about mouse motion when cursor is inside canvas?
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
            ev._free();

            return false;
        };
        const on_pointer_button = (/** @type {MouseEvent | PointerEvent} */e: MouseEvent | PointerEvent, /** @type {boolean} */is_down: boolean) => {
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
            // @Incomplete: resume audio driver after input in case autoplay was denied

            ev._free();

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
        window.oncontextmenu = (e: MouseEvent) => false;

        // touch events
        if (support_touch_events) {
            // canvas.addEventListener('touchstart', (e) => on_pointer_button(e, true), true);
            // canvas.addEventListener('touchcancel', on_pointer_cancel, true);
            // canvas.addEventListener('touchend', (e) => on_pointer_button(e, false), true);
            // canvas.addEventListener('touchmove', on_pointer_move, true);
        }

        function setup_key_event(e: KeyboardEvent) {
            const ev = InputEventKey.instance();
            ev.echo = e.repeat;
            ev.alt = e.altKey;
            ev.shift = e.shiftKey;
            ev.meta = e.metaKey;
            ev.control = e.ctrlKey;
            ev.scancode = e.keyCode;
            ev.key = e.key;
            ev.unicode = (e.key && e.key.length === 1) ? e.key : null;
            return ev;
        }

        // keyboard events
        window.addEventListener('keydown', (e) => {
            const ev = setup_key_event(e);
            ev.pressed = true;
            this.input.parse_input_event(ev);
            return true;
        })
        window.addEventListener('keyup', (e) => {
            const ev = setup_key_event(e);
            ev.pressed = false;
            this.input.parse_input_event(ev);
            return !!ev.unicode;
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

        const game_size = new Vector2;
        const window_size = new Vector2;
        const resize_canvas = () => {
            if (this.video_mode.resizable) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                this.canvas.style.width = `${window.innerWidth}px`;
                this.canvas.style.height = `${window.innerHeight}px`;
            } else {
                // adjust the canvas style, to fit the window
                window_size.set(window.innerWidth, window.innerHeight);
                game_size.set(this.video_mode.width, this.video_mode.height);
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
            }
        }
        window.addEventListener('resize', resize_canvas)

        visual_server.init();
        resize_canvas();

        this.start_date = performance.now();
    }

    get_ticks_msec(): number {
        return Math.floor(performance.now() - this.start_date);
    }
    get_ticks_usec(): number {
        return Math.floor((performance.now() - this.start_date) * 1000);
    }

    can_draw(): boolean {
        return true;
    }

    get_mouse_position() {
        return this.input.get_mouse_position();
    }
    get_mouse_button_state() {
        return this.input.get_mouse_button_mask();
    }
}

let singleton: OS = null;

function map_position_to_canvas_local(out: Vector2Like, canvas: HTMLCanvasElement, x: number, y: number) {
    const rect = canvas.getBoundingClientRect();
    out.x = (x - rect.left) * (canvas.width / rect.width);
    out.y = (y - rect.top) * (canvas.height / rect.height);
}

function dom2godot_mod(e: MouseEvent, ev: InputEventWithModifiers) {
    ev.shift = e.shiftKey;
    ev.alt = e.altKey;
    ev.control = e.ctrlKey;
    ev.meta = e.metaKey;
}

function is_caps_locked(event: KeyboardEvent): boolean {
    const code = event.charCode || event.keyCode;
    if (code > 64 && code < 91 && !event.shiftKey) {
        return true;
    }
    return false;
}
