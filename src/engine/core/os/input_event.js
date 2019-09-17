import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { InputMap } from "engine/core/input_map";

import {
    KEY_MASK_CTRL,
    KEY_MASK_ALT,
    KEY_MASK_SHIFT,
    KEY_MASK_META,
    keycode_get_string,
    find_keycode_name,
    KEYS,
} from "./keyboard";


export const BUTTON_LEFT = 1;
export const BUTTON_RIGHT = 2;
export const BUTTON_MIDDLE = 3;
export const BUTTON_WHEEL_UP = 4;
export const BUTTON_WHEEL_DOWN = 5;
export const BUTTON_WHEEL_LEFT = 6;
export const BUTTON_WHEEL_RIGHT = 7;
export const BUTTON_XBUTTON1 = 8;
export const BUTTON_XBUTTON2 = 9;
export const BUTTON_MASK_LEFT = (1 << (BUTTON_LEFT - 1));
export const BUTTON_MASK_RIGHT = (1 << (BUTTON_RIGHT - 1));
export const BUTTON_MASK_MIDDLE = (1 << (BUTTON_MIDDLE - 1));
export const BUTTON_MASK_XBUTTON1 = (1 << (BUTTON_XBUTTON1 - 1));
export const BUTTON_MASK_XBUTTON2 = (1 << (BUTTON_XBUTTON2 - 1));

/**
 * @typedef ActionStatusRet
 * @property {boolean} pressed
 * @property {number} strength
 */

const action_status = {
    pressed: false,
    strength: 0,
};

export class InputEvent {
    get class() { return 'InputEvent' }

    constructor() {
        this.device = 0;
    }

    /**
     * @param {InputEvent} p_event
     */
    accumulate(p_event) { return false }
    as_text() { return '' }
    /**
     * @param {string} p_action
     */
    get_action_strength(p_action) {
        const valid = InputMap.get_singleton().event_get_action_status(this, p_action, action_status);
        return valid ? action_status.strength : 0;
    }
    /**
     * @param {string} p_action
     */
    is_action(p_action) {
        return InputMap.get_singleton().event_is_action(this, p_action);
    }
    is_pressed() { return false }
    /**
     * @param {string} p_action
     */
    is_action_pressed(p_action) {
        const valid = InputMap.get_singleton().event_get_action_status(this, p_action, action_status);
        return valid && action_status.pressed && !this.is_echo();
    }
    /**
     * @param {string} p_action
     */
    is_action_released(p_action) {
        const valid = InputMap.get_singleton().event_get_action_status(this, p_action, action_status);
        return valid && !action_status.pressed;
    }
    is_action_type() { return false }
    is_echo() { return false }
    /**
     * @param {InputEvent} p_event
     */
    shortcut_match(p_event) { return false }
    /**
     * @param {Transform2D} p_xform
     * @param {Vector2Like} p_local_ofs
     */
    xformed_by(p_xform, p_local_ofs = Vector2.ZERO) { return /** @type {InputEvent} */(null) }

    /**
     * @param {InputEvent} p_event
     * @param {ActionStatusRet} p_ret
     * @param {number} p_deadzone
     */
    action_match(p_event, p_ret, p_deadzone) { return false }
}

export class InputEventWithModifiers extends InputEvent {
    get class() { return 'InputEventWithModifiers' }

    constructor() {
        super();

        this.alt = false;
        this.control = false;
        this.meta = false;
        this.shift = false;
    }

    /* private */

    /**
     * @param {InputEventWithModifiers} event
     */
    set_modifiers_from_event(event) {
        this.alt = event.alt;
        this.shift = event.shift;
        this.control = event.control;
        this.meta = event.meta;
    }
}

export class InputEventKey extends InputEventWithModifiers {
    get class() { return 'InputEventKey' }

    constructor() {
        super();

        this.pressed = false;

        this.scancode = 0;
        this.unicode = 0;

        this.echo = false;
    }
    is_pressed() { return this.pressed }

    get_scancode_with_modifiers() {
        let sc = this.scancode;
        if (this.control) {
            sc |= KEY_MASK_CTRL;
        }
        if (this.alt) {
            sc |= KEY_MASK_ALT;
        }
        if (this.shift) {
            sc |= KEY_MASK_SHIFT;
        }
        if (this.meta) {
            sc |= KEY_MASK_META;
        }
        return sc;
    }

    /* private */

    is_echo() { return this.echo }
    /**
     * @param {InputEvent} p_event
     */
    shortcut_match(p_event) {
        if (p_event.class !== 'InputEventKey') {
            return false;
        }
        const key = /** @type {InputEventKey} */(p_event);

        const code = this.get_scancode_with_modifiers();
        const event_code = key.get_scancode_with_modifiers();

        return code === event_code;
    }

    /**
     * @param {InputEvent} p_event
     * @param {ActionStatusRet} r_ret
     * @param {number} p_deadzone
     */
    action_match(p_event, r_ret, p_deadzone) {
        if (p_event.class !== 'InputEventKey') {
            return false;
        }
        const key = /** @type {InputEventKey} */(p_event);

        const code = this.get_scancode_with_modifiers();
        const event_code = key.get_scancode_with_modifiers();

        const match = this.scancode === key.scancode && (!key.is_pressed() || (code & event_code) === code);
        if (match) {
            if (r_ret) {
                r_ret.pressed = key.is_pressed();
                r_ret.strength = key.is_pressed() ? 1 : 0;
            }
        }
        return match;
    }
    as_text() {
        let kc = keycode_get_string(this.scancode);
        if (kc.length === 0) {
            return kc;
        }

        if (this.meta) {
            kc = `${find_keycode_name(KEYS.META)}+${kc}`;
        }
        if (this.alt) {
            kc = `${find_keycode_name(KEYS.ALT)}+${kc}`;
        }
        if (this.shift) {
            kc = `${find_keycode_name(KEYS.SHIFT)}+${kc}`;
        }
        if (this.control) {
            kc = `${find_keycode_name(KEYS.CTRL)}+${kc}`;
        }
        return kc;
    }
}

export class InputEventMouse extends InputEventWithModifiers {
    get class() { return 'InputEventMouse' }

    constructor() {
        super();

        this.button_mask = 0;

        this.position = new Vector2();
        this.global_position = new Vector2();
    }
}

export class InputEventMouseButton extends InputEventMouse {
    get class() { return 'InputEventMouseButton' }

    constructor() {
        super();

        this.button_index = 0;
        this.doubleclick = false;
        this.factor = 1;
        this.pressed = false;
    }
    is_pressed() { return this.pressed }

    /* private */

    /**
     * @param {Transform2D} p_xform
     * @param {Vector2Like} p_local_ofs
     */
    xformed_by(p_xform, p_local_ofs = Vector2.ZERO) {
        const mb = new InputEventMouseButton();
        mb.device = this.device;
        mb.set_modifiers_from_event(this);

        p_xform.xform(mb.position.copy(this.position).add(p_local_ofs), mb.position);
        mb.global_position.copy(this.global_position);

        mb.button_mask = this.button_mask;
        mb.pressed = this.pressed;
        mb.doubleclick = this.doubleclick;
        mb.factor = this.factor;
        mb.button_index = this.button_index;
        return mb;
    }

    /**
     * @param {InputEvent} p_event
     * @param {ActionStatusRet} r_ret
     * @param {number} p_deadzone
     */
    action_match(p_event, r_ret, p_deadzone) {
        if (p_event.class !== 'InputEventMouseButton') {
            return false;
        }

        const mb = /** @type {InputEventMouseButton} */(p_event);
        const match = (this.button_index === mb.button_index);
        if (match) {
            if (r_ret) {
                r_ret.pressed = mb.pressed;
                r_ret.strength = mb.pressed ? 1 : 0;
            }
        }
        return match;
    }

    is_action_type() { return true }

    as_text() {
        let button_index_string = '';
        switch (this.button_index) {
            case BUTTON_LEFT: button_index_string = 'BUTTON_LEFT'; break;
            case BUTTON_MIDDLE: button_index_string = 'BUTTON_MIDDLE'; break;
            case BUTTON_RIGHT: button_index_string = 'BUTTON_RIGHT'; break;
            default: button_index_string = `${this.button_index}`; break;
        }
        return `InputEventMouseButton : button_index=${button_index_string}, pressed=${this.pressed ? 'true' : 'false'}, position=(${this.position.x}, ${this.position.y}), button_mask=${this.button_mask}, doubleclick=${this.doubleclick ? 'true' : 'false'}`
    }
}

export class InputEventMouseMotion extends InputEventMouse {
    get class() { return 'InputEventMouseMotion' }

    constructor() {
        super();

        this.relative = new Vector2();
        this.speed = new Vector2();
    }

    /* private */

    /**
     * @param {Transform2D} p_xform
     * @param {Vector2Like} p_local_ofs
     */
    xformed_by(p_xform, p_local_ofs = Vector2.ZERO) {
        const mm = new InputEventMouseMotion();
        mm.device = this.device;
        mm.set_modifiers_from_event(this);

        p_xform.xform(mm.position.copy(this.position).add(p_local_ofs), mm.position);
        mm.global_position.copy(this.global_position);

        mm.button_mask = this.button_mask;
        mm.relative.copy(this.relative);
        mm.speed.copy(this.speed);
        return mm;
    }

    as_text() {
        let button_mask_string = '';
        switch (this.button_mask) {
            case BUTTON_MASK_LEFT: button_mask_string = 'BUTTON_MASK_LEFT'; break;
            case BUTTON_MASK_MIDDLE: button_mask_string = 'BUTTON_MASK_MIDDLE'; break;
            case BUTTON_MASK_RIGHT: button_mask_string = 'BUTTON_MASK_RIGHT'; break;
            default: button_mask_string = `${this.button_mask}`; break;
        }
        return `InputEventMouseMotion : button_mask=${button_mask_string}, position=(${this.position.x}, ${this.position.y}), relative=(${this.relative.x}, ${this.relative.y}, speed=(${this.speed.x}, ${this.speed.y}))`
    }

    /**
     * @param {InputEvent} p_event
     */
    accumulate(p_event) {
        if (p_event.class !== 'InputEventMouseMotion') return false;

        const motion = /** @type {InputEventMouseMotion} */(p_event);

        if (this.is_pressed() !== motion.is_pressed()) {
            return false;
        }
        if (this.button_mask !== motion.button_mask) {
            return false;
        }
        if (this.shift !== motion.shift) {
            return false;
        }
        if (this.control !== motion.control) {
            return false;
        }
        if (this.alt !== motion.alt) {
            return false;
        }
        if (this.meta !== motion.meta) {
            return false;
        }

        this.position.copy(motion.position);
        this.global_position.copy(motion.global_position);
        this.speed.copy(motion.speed);
        this.relative.add(motion.relative);

        return true;
    }
}

export class InputEventAction extends InputEvent {
    get class() { return 'InputEventAction' }

    constructor() {
        super();

        this.action = '';
        this.pressed = false;
        this.strength = 1;
    }

    /**
     * @param {string} p_action
     */
    is_action(p_action) {
        return InputMap.get_singleton().event_is_action(this, p_action);
    }

    /**
     * @param {InputEvent} p_event
     * @param {ActionStatusRet} r_ret
     * @param {number} p_deadzone
     */
    action_match(p_event, r_ret, p_deadzone) {
        if (p_event.class !== 'InputEventAction') {
            return false;
        }

        const act = /** @type {InputEventAction} */(p_event);
        const match = (this.action === act.action);
        if (match) {
            if (r_ret) {
                r_ret.pressed = act.pressed;
                r_ret.strength = act.pressed ? 1 : 0;
            }
        }
        return match;
    }
    /**
     * @param {InputEvent} p_event
     */
    shortcut_match(p_event) {
        if (!p_event) return false;
        return p_event.is_action(this.action);
    }
    is_action_type() { return true }
    as_text() { return `InputEventAction : action=${this.action}, pressed=(${this.pressed ? 'true' : 'false'})` }
}
