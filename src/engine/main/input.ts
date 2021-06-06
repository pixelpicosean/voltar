import { VObject, GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { OS } from "engine/core/os/os";
import { Engine } from "engine/core/engine";
import { MainLoop } from "engine/core/main_loop";
import {
    InputEvent,
    InputEventKey,
    InputEventMouseButton,
    InputEventMouseMotion,
    InputEventScreenDrag,
} from "engine/core/os/input_event";
import { InputMap } from "engine/core/input_map";


class Action {
    physics_frame = 0;
    idle_frame = 0;
    pressed = false;
    strength = 0;
}

const slice = new Vector2();

class SpeedTrack {
    last_tick = 0;
    speed = { x: 0, y: 0 };
    accum = { x: 0, y: 0 };
    accum_t = 0;
    min_ref_frame = 0.1;
    max_ref_frame = 0.3;

    update(p_delta_p: Vector2Like) {
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
    static get_singleton() { return singleton }

    mouse_button_mask = 0;

    keys_pressed: Set<number> = new Set;
    mouse_pos = new Vector2;
    main_loop: MainLoop = null;

    action_state: Map<string, Action> = new Map;

    mouse_speed_track = new SpeedTrack;

    emulate_touch_from_mouse = false;
    emulate_mouse_from_touch = false;

    mouse_from_touch_index = -1;

    constructor() {
        super();

        if (!singleton) singleton = this;
    }

    /**
     * @param {string} p_action
     */
    is_action_pressed(p_action: string) {
        return this.action_state.has(p_action) && this.action_state.get(p_action).pressed;
    }
    /**
     * @param {string} p_action
     */
    is_action_just_pressed(p_action: string) {
        const E = this.action_state.get(p_action);
        if (!E) {
            return false;
        }

        if (Engine.get_singleton().is_in_physics_frame()) {
            return E.pressed && E.physics_frame === Engine.get_singleton().physics_frames;
        } else {
            const idle_frames = Engine.get_singleton().idle_frames;
            return E.pressed && E.idle_frame === Engine.get_singleton().idle_frames;
        }
    }
    /**
     * @param {string} p_action
     */
    is_action_just_released(p_action: string) {
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
    get_action_strength(p_action: string) {
        const E = this.action_state.get(p_action);
        if (!E) {
            return 0;
        }

        return E.strength;
    }

    /**
     * @param {Vector2Like} p_pos
     */
    set_mouse_position(p_pos: Vector2Like) {
        const tmp = _i_vec2.set(p_pos.x, p_pos.y);
        this.mouse_speed_track.update(tmp.subtract(this.mouse_pos));
        this.mouse_pos.x = p_pos.x;
        this.mouse_pos.y = p_pos.y;
    }
    get_mouse_position() { return this.mouse_pos }

    get_last_mouse_speed() { return this.mouse_speed_track.speed }
    get_mouse_button_mask() { return this.mouse_button_mask }

    warp_mouse_position(p_to: Vector2Like) { }
    warp_mouse_motion(p_motion: Vector2Like, p_rect: Rect2) { }

    /**
     * @param {InputEvent} p_event
     */
    parse_input_event(p_event: InputEvent) {
        this._parse_input_event_impl(p_event, false);
    }

    /**
     * @param {string} p_action
     * @param {number} p_strength
     */
    action_press(p_action: string, p_strength: number = 1.0) {
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
    action_release(p_action: string) {
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

    /**

     * @param {InputEvent} p_event
     * @param {boolean} p_is_emulated
     */
    _parse_input_event_impl(p_event: InputEvent, p_is_emulated: boolean) {
        // Notes on mouse-touch emulation:
        // - Emulated mouse events are parsed, that is, re-routed to this method, so they make the same effects
        //   as true mouse events. The only difference is the situation is flagged as emulated so they are not
        //   emulated back to touch events in an endless loop.
        // - Emulated touch events are handed right to the main loop (i.e., the SceneTree) because they don't
        //   require additional handling by this class.

        switch (p_event.class) {
            case 'InputEventKey': {
                const k: InputEventKey = p_event as InputEventKey;
                if (!k.is_echo() && k.scancode !== 0) {
                    if (k.is_pressed()) {
                        this.keys_pressed.add(k.scancode);
                    } else {
                        this.keys_pressed.delete(k.scancode);
                    }
                }
            } break;
            case 'InputEventMouseButton': {
                const mb: InputEventMouseButton = p_event as InputEventMouseButton;
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
                    // const touch_event = InputEventScreenTouch.instance();
                    // touch_event.pressed = mb.is_pressed();
                    // touch_event.position.copy(mb.position);
                    // this.main_loop.input_event(touch_event);
                }
            } break;
            case 'InputEventMouseMotion': {
                const mm: InputEventMouseMotion = p_event as InputEventMouseMotion;
                const pos = mm.global_position;
                if (!this.mouse_pos.equals(pos)) {
                    this.mouse_pos.copy(pos);
                }

                if (this.main_loop && this.emulate_touch_from_mouse && !p_is_emulated && mm.button_mask & 1) {
                    const sd = InputEventScreenDrag.instance();

                    sd.position.copy(mm.position);
                    sd.relative.copy(mm.relative);
                    sd.speed.copy(mm.speed);

                    this.main_loop.input_event(sd);

                    sd._free();
                }
            } break;
            case 'InputEventScreenTouch': { } break;
            case 'InputEventScreenDrag': { } break;
            case 'InputEventJoypadButton': { } break;
            case 'InputEventJoypadMotion': { } break;
            case 'InputEventGesture': { } break;
        }

        const action_map = InputMap.get_singleton().input_map;
        for (let [key, _] of action_map) {
            if (InputMap.get_singleton().event_is_action(p_event, key)) {
                if (!p_event.is_echo() && this.is_action_pressed(key) !== p_event.is_action_pressed(key)) {
                    const action = new Action;
                    action.physics_frame = Engine.get_singleton().physics_frames;
                    action.idle_frame = Engine.get_singleton().idle_frames;
                    action.pressed = p_event.is_action_pressed(key);
                    action.strength = 0;
                    this.action_state.set(key, action);
                }
                if (!this.action_state.has(key)) {
                    this.action_state.set(key, new Action);
                }
                this.action_state.get(key).strength = p_event.get_action_strength(key);
            }
        }

        if (this.main_loop) {
            this.main_loop.input_event(p_event);
        }
    }
}
GDCLASS(Input, VObject)

/** @type {Input} */
let singleton: Input = null;

const _i_vec2 = new Vector2;
