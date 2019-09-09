import { VObject, GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { OS } from "engine/core/os/os";
import { Engine } from "engine/core/engine";
import { MainLoop } from "engine/core/main_loop";
import { InputEvent, InputEventKey, InputEventMouseButton } from "engine/core/os/input_event";


class Action {
    constructor() {
        this.physics_frame = 0;
        this.idle_frame = 0;
        this.pressed = false;
        this.strength = 0;
    }
}

const slice = new Vector2();

class SpeedTrack {
    constructor() {
        this.last_tick = 0;
        this.speed = { x: 0, y: 0 };
        this.accum = { x: 0, y: 0 };
        this.accum_t = 0;
        this.min_ref_frame = 0.1;
        this.max_ref_frame = 0.3;

        this.reset();
    }
    /**
     * @param {Vector2Like} p_delta_p
     */
    update(p_delta_p) {
        const tick = OS.get_singleton().get_ticks_usec();
        const tdiff = tick - this.last_tick;
        const delta_t = tdiff / 1000000;
        this.last_tick = tick;

        this.accum.x += p_delta_p.x;
        this.accum.y += p_delta_p.y;
        this.accum_t += delta_t;

        if (this.accum_t > this.max_ref_frame * 10) {
            this.accum_t = this.max_ref_frame * 10;
        }

        while (this.accum_t >= this.min_ref_frame) {
            const slice_t = this.min_ref_frame / this.accum_t;
            slice.copy(this.accum).scale(slice_t);
            this.accum.x -= slice.x;
            this.accum.y -= slice.y;
            this.accum_t -= this.min_ref_frame;

            this.speed = slice.divide(this.min_ref_frame).linear_interpolate(this.speed, this.min_ref_frame / this.max_ref_frame);
        }
    }
    reset() {
        this.last_tick = OS.get_singleton().get_ticks_usec();
        this.speed.x = this.speed.y = 0;
        this.accum_t = 0;
    }
}

export class Input extends VObject {
    constructor() {
        super();

        this.mouse_button_mask = 0;

        /** @type {Set<number>} */
        this.keys_pressed = new Set();
        this.mouse_pos = new Vector2();
        /** @type {MainLoop} */
        this.main_loop = null;

        /** @type {Map<string, Action>} */
        this.action_state = new Map();

        this.mouse_speed_track = new SpeedTrack();

        this.emulate_touch_from_mouse = false;
        this.emulate_mouse_from_touch = false;

        this.mouse_from_touch_index = -1;
    }

    /**
     * @param {string} p_action
     */
    is_action_pressed(p_action) {
        return this.action_state.has(p_action) && this.action_state.get(p_action).pressed;
    }
    /**
     * @param {string} p_action
     */
    is_action_just_pressed(p_action) {
        const E = this.action_state.get(p_action);
        if (!E) {
            return false;
        }

        if (Engine.get_singleton().is_in_physics_frame()) {
            return E.pressed && E.physics_frame === Engine.get_singleton().physics_frames;
        } else {
            return E.pressed && E.idle_frame === Engine.get_singleton().idle_frames;
        }
    }
    /**
     * @param {string} p_action
     */
    is_action_just_released(p_action) {
        const E = this.action_state.get(p_action);
        if (!E) {
            return false;
        }

        if (Engine.get_singleton().is_in_physics_frame()) {
            return !E.pressed && E.physics_frame === Engine.get_singleton().physics_frames;
        } else {
            return !E.pressed && E.idle_frame === Engine.get_singleton().idle_frames;
        }
    }
    /**
     * @param {string} p_action
     */
    get_action_strength(p_action) {
        const E = this.action_state.get(p_action);
        if (!E) {
            return 0;
        }

        return E.strength;
    }

    /**
     * @param {Vector2Like} p_pos
     */
    set_mouse_position(p_pos) {
        const tmp = Vector2.new(p_pos.x, p_pos.y);
        this.mouse_speed_track.update(tmp.subtract(this.mouse_pos));
        Vector2.free(tmp);
        this.mouse_pos.x = p_pos.x;
        this.mouse_pos.y = p_pos.y;
    }
    get_mouse_position() { return this.mouse_pos }

    get_last_mouse_speed() { return this.mouse_speed_track.speed }
    get_mouse_button_mask() { return this.mouse_button_mask }

    warp_mouse_position(p_to) { }
    warp_mouse_motion(p_motion, p_rect) { }

    /**
     * @param {InputEvent} p_event
     */
    parse_input_event(p_event) {
        // Notes on mouse-touch emulation:
        // - Emulated mouse events are parsed, that is, re-routed to this method, so they make the same effects
        //   as true mouse events. The only difference is the situation is flagged as emulated so they are not
        //   emulated back to touch events in an endless loop.
        // - Emulated touch events are handed right to the main loop (i.e., the SceneTree) because they don't
        //   require additional handling by this class.

        switch (p_event.class) {
            case 'InputEventKey': {
                const k = /** @type {InputEventKey} */(p_event);
                if (!k.is_echo() && k.scancode !== 0) {
                    if (k.is_pressed()) {
                        this.keys_pressed.add(k.scancode);
                    } else {
                        this.keys_pressed.delete(k.scancode);
                    }
                }
            } break;
            case 'InputEventMouseButton': {
                const mb = /** @type {InputEventMouseButton} */(p_event);
                if (mb.is_pressed()) {
                    this.mouse_button_mask |= (1 << (mb.button_index - 1));
                } else {
                    this.mouse_button_mask &= ~(1 << (mb.button_index - 1));
                }
                const pos = mb.global_position;
                if (!this.mouse_pos.equals(pos)) {
                    this.mouse_pos.copy(pos);
                }

                if (this.main_loop && this.emulate_touch_from_mouse && mb.button_index === 1) {
                    // TODO: emulate touch from mouse
                    // const touch_event = new InputEventScreenTouch();
                    // touch_event.pressed = mb.is_pressed();
                    // touch_event.position.copy(mb.position);
                    // this.main_loop.input_event(touch_event);
                }
            } break;
            case 'InputEventMouseMotion': { } break;
            case 'InputEventScreenTouch': { } break;
            case 'InputEventScreenDrag': { } break;
            case 'InputEventJoypadButton': { } break;
            case 'InputEventJoypadMotion': { } break;
            case 'InputEventGesture': { } break;
        }

        if (this.main_loop) {
            this.main_loop.input_event(p_event);
        }
    }

    /**
     * @param {string} p_action
     * @param {number} p_strength
     */
    action_press(p_action, p_strength = 1.0) {
        let action = this.action_state.get(p_action);
        if (!action) {
            action = new Action();
        }
        action.physics_frame = Engine.get_singleton().physics_frames;
        action.idle_frame = Engine.get_singleton().idle_frames;
        action.pressed = true;
        action.strength = p_strength;

        this.action_state.set(p_action, action);
    }
    /**
     * @param {string} p_action
     */
    action_release(p_action) {
        let action = this.action_state.get(p_action);
        if (!action) {
            action = new Action();
        }
        action.physics_frame = Engine.get_singleton().physics_frames;
        action.idle_frame = Engine.get_singleton().idle_frames;
        action.pressed = false;
        action.strength = 0.0;

        this.action_state.set(p_action, action);
    }

    release_pressed_events() { }
}
GDCLASS(Input, VObject)
