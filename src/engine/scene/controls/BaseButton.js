import Control from "./Control";
import { Rectangle } from "engine/math/index";

/**
 * @enum {number}
 */
export const ActionMode = {
    BUTTON_PRESS: 0,
    BUTTON_RELEASE: 1,
}

export const DrawMode = {
    NORMAL: 0,
    PRESSED: 1,
    HOVER: 2,
    DISABLED: 3,
    HOVER_PRESSED: 4,
}

export default class BaseButton extends Control {
    get disabled() {
        return this.status.disabled;
    }
    set disabled(value) {
        if (this.status.disabled === value) {
            return;
        }

        this.status.disabled = value;
        if (value) {
            if (!this.toggle_mode) {
                this.status.pressed = false;
            }
            this.status.press_attempt = false;
            this.status.pressing_inside = false;
            this.status.pressing_button = 0;
        }

        this.interactive = true;
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_disabled(value) {
        this.disabled = value;
        return this;
    }

    get pressed() {
        return this.toggle_mode ? this.status.pressed : this.status.press_attempt;
    }
    set pressed(value) {
        if (!this.toggle_mode) {
            return;
        }
        if (this.status.pressed === value) {
            return;
        }

        this.status.pressed = value;
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_pressed(value) {
        this.pressed = value;
        return this;
    }

    constructor() {
        super();

        this.action_mode = ActionMode.BUTTON_RELEASE;
        this.toggle_mode = false;

        this.status = {
            pressed: false,
            hovering: false,
            press_attempt: false,
            pressing_inside: false,

            disabled: false,
            pressing_button: 0,
        };

        this.interactive = true;
        this.on('pointerover', this._pointer_over, this);
        this.on('pointerout', this._pointer_out, this);
        this.on('pointerdown', this._pointer_down, this);
        this.on('pointerup', this._pointer_up, this);
        this.on('pointerupoutside', this._pointer_up_outside, this);
    }

    _visibility_changed() {
        if (!this.toggle_mode) {
            this.status.pressed = false;
        }
        this.status.hovering = false;
        this.status.press_attempt = false;
        this.status.pressing_inside = false;
        this.status.pressing_button = 0;
    }

    _pressed() { }
    _toggled(pressed) { }

    get_draw_mode() {
        if (this.status.disabled) {
            return DrawMode.DISABLED;
        }

        if (!this.status.press_attempt && this.status.hovering) {
            if (this.status.pressed) {
                return DrawMode.HOVER_PRESSED;
            }

            return DrawMode.HOVER;
        } else {
            let pressing = false;
            if (this.status.press_attempt) {
                pressing = this.status.pressing_inside;
                if (this.status.pressed) {
                    pressing = !pressing;
                }
            } else {
                pressing = this.status.pressed;
            }

            if (pressing) {
                return DrawMode.PRESSED;
            } else {
                return DrawMode.NORMAL;
            }
        }
    }
    is_hovered() {
        return this.status.hovering;
    }

    _pointer_over(e) {
        this.status.hovering = true;
    }
    _pointer_out(e) {
        this.status.hovering = false;
    }
    _pointer_down(e) {
        if (this.action_mode === ActionMode.BUTTON_PRESS) {
            this.emit('button_down');

            if (!this.toggle_mode) {
                this.status.press_attempt = true;
                this.status.pressing_inside = true;

                this._pressed();
                this.emit('pressed');
            } else {
                this.status.pressed = !this.status.pressed;

                this._pressed();
                this.emit('pressed');

                this._toggled(this.status.pressed);
                this.emit('toggled', this.status.pressed);
            }
        } else {
            this.status.press_attempt = true;
            this.status.pressing_inside = true;
            this.emit('button_down');
        }
    }
    _pointer_up(e) {
        if (this.action_mode === ActionMode.BUTTON_PRESS) {
            this.emit('button_up');
            this.status.press_attempt = false;
        } else {
            this.emit('button_up');

            if (this.status.press_attempt && this.status.pressing_inside) {
                if (!this.toggle_mode) {
                    this._pressed();
                    this.emit('pressed');
                } else {
                    this.status.pressed = !this.status.pressed;

                    this._pressed();
                    this.emit('pressed');

                    this._toggled(this.status.pressed);
                    this.emit('toggled', this.status.pressed);
                }
            }

            this.status.press_attempt = false;
        }
    }
    _pointer_up_outside(e) {
        this.status.press_attempt = false;
    }
}
