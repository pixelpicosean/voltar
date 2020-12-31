import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Transform2D } from "../math/transform_2d";
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
import { res_class_map } from "engine/registry";


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

const pool_map: { [s: string]: InputEvent[]; } = {};
function create_pool(type: string, ctor: typeof InputEvent) {
    pool_map[type] = [];

    ctor.instance = () => {
        let inst = pool_map[type].pop();
        if (!inst) {
            return new ctor;
        }
        return inst.init();
    }
}

export interface ActionStatusRet {
    pressed: boolean;
    strength: number;
}

const action_status = {
    pressed: false,
    strength: 0,
};

export class InputEvent {
    get class() { return "InputEvent" }

    static instance() { return new InputEvent }

    device = 0;

    init() {
        this.device = 0;
        return this;
    }
    _load_data(data: any) {
        Object.assign(this, data);
        return this;
    }

    _predelete() {
        return true;
    }
    _free() {
        pool_map[this.class].push(this);
    }

    accumulate(p_event: InputEvent): boolean { return false }
    toString(): string { return "" }

    get_action_strength(p_action: string): number {
        const valid = InputMap.get_singleton().event_get_action_status(this, p_action, action_status);
        return valid ? action_status.strength : 0;
    }
    is_action(p_action: string): boolean {
        return InputMap.get_singleton().event_is_action(this, p_action);
    }
    is_pressed(): boolean { return false }
    is_action_pressed(p_action: string): boolean {
        const valid = InputMap.get_singleton().event_get_action_status(this, p_action, action_status);
        return valid && action_status.pressed && !this.is_echo();
    }
    is_action_released(p_action: string): boolean {
        const valid = InputMap.get_singleton().event_get_action_status(this, p_action, action_status);
        return valid && !action_status.pressed;
    }
    is_action_type(): boolean { return false }
    is_echo(): boolean { return false }
    shortcut_match(p_event: InputEvent): boolean { return false }
    xformed_by(p_xform: Transform2D, p_local_ofs: Vector2Like = Vector2.ZERO): InputEvent { return this }

    action_match(p_event: InputEvent, p_ret: ActionStatusRet, p_deadzone: number): boolean { return false }
}
create_pool("InputEvent", InputEvent);
res_class_map["InputEvent"] = InputEvent;

export class InputEventWithModifiers extends InputEvent {
    get class() { return "InputEventWithModifiers" }

    static instance() { return new InputEventWithModifiers }

    alt = false;
    control = false;
    meta = false;
    shift = false;

    init() {
        this.alt = false;
        this.control = false;
        this.meta = false;
        this.shift = false;
        return this;
    }

    /* private */

    set_modifiers_from_event(event: InputEventWithModifiers) {
        this.alt = event.alt;
        this.shift = event.shift;
        this.control = event.control;
        this.meta = event.meta;
    }
}
create_pool("InputEventWithModifiers", InputEventWithModifiers)
res_class_map["InputEventWithModifiers"] = InputEventWithModifiers;

export class InputEventKey extends InputEventWithModifiers {
    get class() { return "InputEventKey" }

    static instance() { return new InputEventKey }

    pressed = false;
    echo = false;

    scancode = 0;
    key = "";

    /**
     * Only exist when the key is a character with valid unicode value
     */
    unicode: string = null;

    init() {
        this.pressed = false;

        this.scancode = 0;
        this.key = "";
        this.unicode = null;

        this.echo = false;
        return this;
    }

    is_pressed(): boolean { return this.pressed }

    get_scancode_with_modifiers(): number {
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

    is_echo(): boolean { return this.echo }
    shortcut_match(p_event: InputEvent): boolean {
        if (p_event.class !== "InputEventKey") {
            return false;
        }
        const key = p_event as InputEventKey;

        const code = this.get_scancode_with_modifiers();
        const event_code = key.get_scancode_with_modifiers();

        return code === event_code;
    }

    action_match(p_event: InputEvent, r_ret: ActionStatusRet, p_deadzone: number) {
        if (p_event.class !== "InputEventKey") {
            return false;
        }
        const key = p_event as InputEventKey;

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
    toString() {
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
create_pool("InputEventKey", InputEventKey)
res_class_map["InputEventKey"] = InputEventKey;

export class InputEventMouse extends InputEventWithModifiers {
    get class() { return "InputEventMouse" }

    static instance() { return new InputEventMouse }

    button_mask = 0;

    position = new Vector2;
    global_position = new Vector2;

    init() {
        this.button_mask = 0;
        this.position.set(0, 0);
        this.global_position.set(0, 0);
        return this;
    }
}
create_pool("InputEventMouse", InputEventMouse)
res_class_map["InputEventMouse"] = InputEventMouse;

export class InputEventMouseButton extends InputEventMouse {
    get class() { return "InputEventMouseButton" }

    static instance() { return new InputEventMouseButton }

    button_index = 0;
    doubleclick = false;
    factor = 1;
    pressed = false;

    init() {
        this.button_index = 0;
        this.doubleclick = false;
        this.factor = 1;
        this.pressed = false;
        return this;
    }

    is_pressed(): boolean { return this.pressed }

    /* private */

    /**
     * returns new InputEventMouseButton
     */
    xformed_by(p_xform: Transform2D, p_local_ofs: Vector2Like = Vector2.ZERO): InputEventMouseButton {
        const mb = InputEventMouseButton.instance();
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

    action_match(p_event: InputEvent, r_ret: ActionStatusRet, p_deadzone: number): boolean {
        if (p_event.class !== "InputEventMouseButton") {
            return false;
        }

        const mb = p_event as InputEventMouseButton;
        const match = (this.button_index === mb.button_index);
        if (match) {
            if (r_ret) {
                r_ret.pressed = mb.pressed;
                r_ret.strength = mb.pressed ? 1 : 0;
            }
        }
        return match;
    }

    is_action_type(): boolean { return true }

    toString() {
        let button_index_string = "";
        switch (this.button_index) {
            case BUTTON_LEFT: button_index_string = "BUTTON_LEFT"; break;
            case BUTTON_MIDDLE: button_index_string = "BUTTON_MIDDLE"; break;
            case BUTTON_RIGHT: button_index_string = "BUTTON_RIGHT"; break;
            default: button_index_string = `${this.button_index}`; break;
        }
        return `InputEventMouseButton : button_index=${button_index_string}, pressed=${this.pressed ? "true" : "false"}, position=(${this.position.x}, ${this.position.y}), button_mask=${this.button_mask}, doubleclick=${this.doubleclick ? "true" : "false"}`
    }
}
create_pool("InputEventMouseButton", InputEventMouseButton)
res_class_map["InputEventMouseButton"] = InputEventMouseButton;

export class InputEventMouseMotion extends InputEventMouse {
    get class() { return "InputEventMouseMotion" }

    static instance() { return new InputEventMouseMotion }

    relative = new Vector2;
    speed = new Vector2;

    init() {
        this.relative.set(0, 0);
        this.speed.set(0, 0);
        return this;
    }

    /* private */

    xformed_by(p_xform: Transform2D, p_local_ofs: Vector2Like = Vector2.ZERO): InputEventMouseMotion {
        const mm = InputEventMouseMotion.instance();
        mm.device = this.device;
        mm.set_modifiers_from_event(this);

        p_xform.xform(mm.position.copy(this.position).add(p_local_ofs), mm.position);
        mm.global_position.copy(this.global_position);

        mm.button_mask = this.button_mask;
        p_xform.basis_xform(this.relative, mm.relative);
        p_xform.basis_xform(this.speed, mm.speed);
        return mm;
    }

    toString() {
        let button_mask_string = "";
        switch (this.button_mask) {
            case BUTTON_MASK_LEFT: button_mask_string = "BUTTON_MASK_LEFT"; break;
            case BUTTON_MASK_MIDDLE: button_mask_string = "BUTTON_MASK_MIDDLE"; break;
            case BUTTON_MASK_RIGHT: button_mask_string = "BUTTON_MASK_RIGHT"; break;
            default: button_mask_string = `${this.button_mask}`; break;
        }
        return `InputEventMouseMotion : button_mask=${button_mask_string}, position=(${this.position.x}, ${this.position.y}), relative=(${this.relative.x}, ${this.relative.y}, speed=(${this.speed.x}, ${this.speed.y}))`
    }

    accumulate(p_event: InputEvent) {
        if (p_event.class !== "InputEventMouseMotion") return false;

        const motion = p_event as InputEventMouseMotion;

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
create_pool("InputEventMouseMotion", InputEventMouseMotion)
res_class_map["InputEventMouseMotion"] = InputEventMouseMotion;

export class InputEventScreenDrag extends InputEventMouse {
    get class() { return "InputEventScreenDrag" }

    static instance() { return new InputEventScreenDrag }

    index = 0;
    relative = new Vector2;
    speed = new Vector2;

    init() {
        this.index = 0;
        this.relative.set(0, 0);
        this.speed.set(0, 0);
        return this;
    }

    /* private */

    xformed_by(p_xform: Transform2D, p_local_ofs: Vector2Like = Vector2.ZERO): InputEventScreenDrag {
        const sd = InputEventScreenDrag.instance();
        sd.device = this.device;
        sd.index = this.index;

        p_xform.xform(sd.position.copy(this.position).add(p_local_ofs), sd.position);
        sd.global_position.copy(this.global_position);

        p_xform.basis_xform(this.relative, sd.relative);
        p_xform.basis_xform(this.speed, sd.speed);
        return sd;
    }

    toString() {
        return `InputEventScreenDrag : index=${this.index}, position=(${this.position.x}, ${this.position.y}), relative=(${this.relative.x}, ${this.relative.y}, speed=(${this.speed.x}, ${this.speed.y}))`
    }
}
create_pool("InputEventScreenDrag", InputEventScreenDrag)
res_class_map["InputEventScreenDrag"] = InputEventScreenDrag;

export class InputEventAction extends InputEvent {
    get class() { return "InputEventAction" }

    static instance() { return new InputEventAction }

    action = "";
    pressed = false;
    strength = 1;

    init() {
        this.action = "";
        this.pressed = false;
        this.strength = 1;
        return this;
    }

    is_action(p_action: string): boolean {
        return InputMap.get_singleton().event_is_action(this, p_action);
    }

    action_match(p_event: InputEvent, r_ret: ActionStatusRet, p_deadzone: number): boolean {
        if (p_event.class !== "InputEventAction") {
            return false;
        }

        const act = p_event as InputEventAction;
        const match = (this.action === act.action);
        if (match) {
            if (r_ret) {
                r_ret.pressed = act.pressed;
                r_ret.strength = act.pressed ? 1 : 0;
            }
        }
        return match;
    }
    shortcut_match(p_event: InputEvent): boolean {
        if (!p_event) return false;
        return p_event.is_action(this.action);
    }
    is_action_type() { return true }
    toString() { return `InputEventAction : action=${this.action}, pressed=(${this.pressed ? "true" : "false"})` }
}
create_pool("InputEventAction", InputEventAction)
res_class_map["InputEventAction"] = InputEventAction;
