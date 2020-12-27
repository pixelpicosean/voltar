import { GDCLASS } from "engine/core/v_object";
import {
    InputEvent,
    InputEventMouseButton,
    InputEventMouseMotion,
    BUTTON_MASK_LEFT,
} from "engine/core/os/input_event";
import { Resource } from "engine/core/resource";

import {
    NOTIFICATION_DRAG_BEGIN,
    NOTIFICATION_EXIT_TREE,
} from "../main/node.js";
import { NOTIFICATION_VISIBILITY_CHANGED } from "../2d/canvas_item.js";
import {
    Control,
    NOTIFICATION_MOUSE_ENTER,
    NOTIFICATION_MOUSE_EXIT,
    NOTIFICATION_SCROLL_BEGIN,
    NOTIFICATION_FOCUS_ENTER,
    NOTIFICATION_FOCUS_EXIT,
} from "./control.js";


export const ACTION_MODE_BUTTON_PRESS = 0;
export const ACTION_MODE_BUTTON_RELEASE = 1;

export const DRAW_NORMAL = 0;
export const DRAW_PRESSED = 1;
export const DRAW_HOVER = 2;
export const DRAW_DISABLED = 3;
export const DRAW_HOVER_PRESSED = 4;

export class BaseButton extends Control {
    get class() { return 'BaseButton' }

    get disabled() { return this.status.disabled }
    set disabled(value) { this.set_disabled(value) }

    get pressed() { return this.toggle_mode ? this.status.pressed : this.status.press_attempt }
    set pressed(value) { this.set_pressed(value) }

    constructor() {
        super();

        this.button_mask = BUTTON_MASK_LEFT;
        this.toggle_mode = false;
        this.shortcut_in_tooltip = true;
        this.keep_pressed_outside = false;
        this.enabled_focus_mode = 0;
        this.shortcut = null;

        this.action_mode = ACTION_MODE_BUTTON_RELEASE;

        this.status = {
            pressed: false,
            hovering: false,
            press_attempt: false,
            pressing_inside: false,

            disabled: false,
            pressing_button: 0,
        };

        /** @type {ButtonGroup} */
        this.button_group = null;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.toggle_mode !== undefined) {
            this.toggle_mode = data.toggle_mode;
        }
        if (data.action_mode !== undefined) {
            this.action_mode = data.action_mode;
        }
        if (data.disabled !== undefined) {
            this.set_disabled(data.disabled);
        }
        if (data.pressed !== undefined) {
            this.set_pressed(data.pressed);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_MOUSE_ENTER) {
            this.status.hovering = true;
            this.update();
        }

        if (p_what === NOTIFICATION_MOUSE_EXIT) {
            this.status.hovering = false;
            this.update();
        }

        if (p_what === NOTIFICATION_DRAG_BEGIN || p_what === NOTIFICATION_SCROLL_BEGIN) {
            if (this.status.press_attempt) {
                this.status.press_attempt = false;
                this.update();
            }
        }

        if (p_what === NOTIFICATION_FOCUS_ENTER) {
            this.status.hovering = true;
            this.update();
        }

        if (p_what === NOTIFICATION_FOCUS_EXIT) {
            if (this.status.press_attempt) {
                this.status.press_attempt = false;
                this.status.hovering = false;
                this.update();
            } else if (this.status.hovering) {
                this.status.hovering = false;
                this.update();
            }
        }

        if (p_what === NOTIFICATION_EXIT_TREE || (p_what === NOTIFICATION_VISIBILITY_CHANGED && !this.is_visible_in_tree())) {
            if (this.toggle_mode) {
                this.status.pressed = false;
            }
            this.status.hovering = false;
            this.status.press_attempt = false;
            this.status.pressing_inside = false;
        }
    }

    _pressed() { }

    /**
     * @param {boolean} pressed
     */
    _toggled(pressed) { }

    /* public */

    set_disabled(value) {
        if (this.status.disabled === value) return;

        this.status.disabled = value;
        if (value) {
            if (!this.toggle_mode) {
                this.status.pressed = false;
            }
            this.status.press_attempt = false;
            this.status.pressing_inside = false;
        }
        this.update();
    }
    is_disabled() { return this.status.disabled }

    set_pressed(value) {
        if (!this.toggle_mode) return;
        if (this.status.pressed === value) return;

        this.status.pressed = value;

        if (value) {
            this._unpress_group();
        }
        this.__toggled(this.status.pressed);

        this.update();
    }

    /**
     * @param {InputEvent} p_event
     */
    _gui_input_(p_event) {
        super._gui_input_(p_event);

        if (this.status.disabled) return;

        const mouse_button = (p_event.class === 'InputEventMouseButton') ? /** @type {InputEventMouseButton} */(p_event) : null;
        const ui_accept = p_event.is_action('ui_accept') && !p_event.is_echo();

        const button_masked = mouse_button && ((1 << (mouse_button.button_index - 1)) & this.button_mask) > 0;
        if (button_masked || ui_accept) {
            this.on_action_event(p_event);
            return;
        }

        if (p_event.class === 'InputEventMouseMotion') {
            const mouse_motion = /** @type {InputEventMouseMotion} */(p_event);
            if (this.status.press_attempt) {
                const last_press_inside = this.status.pressing_inside;
                this.status.pressing_inside = this._has_point_(mouse_motion.position);
                if (last_press_inside !== this.status.pressing_inside) {
                    this.update();
                }
            }
        }
    }

    /* public */

    get_draw_mode() {
        if (this.status.disabled) {
            return DRAW_DISABLED;
        }

        if (!this.status.press_attempt && this.status.hovering) {
            if (this.status.pressed) {
                return DRAW_HOVER_PRESSED;
            }

            return DRAW_HOVER;
        } else {
            let pressing = false;
            if (this.status.press_attempt) {
                pressing = (this.status.pressing_inside || this.keep_pressed_outside);
                if (this.status.pressed) {
                    pressing = !pressing;
                }
            } else {
                pressing = this.status.pressed;
            }

            if (pressing) {
                return DRAW_PRESSED;
            } else {
                return DRAW_NORMAL;
            }
        }
    }

    is_hovered() {
        return this.status.hovering;
    }

    /* private */

    _unpress_group() {
        if (!this.button_group) return;

        if (this.toggle_mode) {
            this.status.pressed = true;
        }

        for (let E of this.button_group.buttons) {
            if (E === this) continue;
            E.set_pressed(false);
        }
    }

    /**
     * @param {InputEvent} p_event
     */
    on_action_event(p_event) {
        if (p_event.is_pressed()) {
            this.status.press_attempt = true;
            this.status.pressing_inside = true;
            this.emit_signal('button_down');
        }

        if (this.status.press_attempt && this.status.pressing_inside) {
            if (this.toggle_mode) {
                if ((p_event.is_pressed() && this.action_mode === ACTION_MODE_BUTTON_PRESS) || (!p_event.is_pressed() && this.action_mode === ACTION_MODE_BUTTON_RELEASE)) {
                    if (this.action_mode === ACTION_MODE_BUTTON_PRESS) {
                        this.status.press_attempt = false;
                        this.status.pressing_inside = false;
                    }
                    this.status.pressed = !this.status.pressed;
                    this._unpress_group();
                    this.__toggled(this.status.pressed);
                    this.__pressed();
                }
            } else {
                if (!p_event.is_pressed()) {
                    this.__pressed();
                }
            }
        }

        if (!p_event.is_pressed()) {
            this.emit_signal('button_up');
            this.status.press_attempt = false;
        }

        this.update();
    }

    __pressed() {
        this._pressed();
        this.pressed_();
        this.emit_signal('pressed');
    }

    /**
     * @param {boolean} pressed
     */
    __toggled(pressed) {
        this._toggled(pressed);
        this.toggled_(pressed);
        this.emit_signal('toggled', pressed);
    }

    pressed_() { }

    /**
     * @param {boolean} pressed
     */
    toggled_(pressed) { }
}
GDCLASS(BaseButton, Control)

export class ButtonGroup extends Resource {
    constructor() {
        super();

        /** @type {BaseButton[]} */
        this.buttons = [];
    }
    get_pressed_button() { }
}
GDCLASS(ButtonGroup, Resource)
