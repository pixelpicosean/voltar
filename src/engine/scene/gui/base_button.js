import Control from "./control";
import InteractiveEvent from 'engine/scene/gui/engine/interaction/InteractionEvent';

/**
 * @enum {number}
 */
export const ActionMode = {
    BUTTON_PRESS: 0,
    BUTTON_RELEASE: 1,
}

/**
 * @enum {number}
 */
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
        this.connect('pointerover', this._pointer_over, this);
        this.connect('pointerout', this._pointer_out, this);
        this.connect('pointerdown', this._pointer_down, this);
        this.connect('pointerup', this._pointer_up, this);
        this.connect('pointerupoutside', this._pointer_up_outside, this);
    }
    _load_data(data) {
        super._load_data(data);

        if (data.action_mode !== undefined) {
            this.action_mode = data.action_mode;
        }
        if (data.disabled !== undefined) {
            this.disabled = data.disabled;
        }
        if (data.pressed !== undefined) {
            this.pressed = data.pressed;
        }
        if (data.toggle_mode !== undefined) {
            this.toggle_mode = data.toggle_mode;
        }

        return this;
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

    /**
     * @param {boolean} pressed
     */
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
    is_pressed() {
        return this.toggle_mode ? this.status.pressed : this.status.press_attempt;
    }
    is_hovered() {
        return this.status.hovering;
    }

    /**
    * @param {InteractiveEvent} e
    */
    _pointer_over(e) {
        this.status.hovering = true;
    }
    /**
     * @param {InteractiveEvent} e
     */
    _pointer_out(e) {
        this.status.hovering = false;
    }
    /**
     * @param {InteractiveEvent} e
     */
    _pointer_down(e) {
        e.stop_propagation();

        if (this.action_mode === ActionMode.BUTTON_PRESS) {
            this.emit_signal('button_down');

            if (!this.toggle_mode) {
                this.status.press_attempt = true;
                this.status.pressing_inside = true;

                this._pressed();
                this.emit_signal('pressed');
            } else {
                this.status.pressed = !this.status.pressed;

                this._pressed();
                this.emit_signal('pressed');

                this._toggled(this.status.pressed);
                this.emit_signal('toggled', this.status.pressed);
            }
        } else {
            this.status.press_attempt = true;
            this.status.pressing_inside = true;
            this.emit_signal('button_down');
        }
    }
    /**
     * @param {InteractiveEvent} e
     */
    _pointer_up(e) {
        e.stop_propagation();

        if (this.action_mode === ActionMode.BUTTON_PRESS) {
            this.emit_signal('button_up');
            this.status.press_attempt = false;
        } else {
            this.emit_signal('button_up');

            if (this.status.press_attempt && this.status.pressing_inside) {
                if (!this.toggle_mode) {
                    this._pressed();
                    this.emit_signal('pressed');
                } else {
                    this.status.pressed = !this.status.pressed;

                    this._pressed();
                    this.emit_signal('pressed');

                    this._toggled(this.status.pressed);
                    this.emit_signal('toggled', this.status.pressed);
                }
            }

            this.status.press_attempt = false;
        }
    }
    /**
     * @param {InteractiveEvent} e
     */
    _pointer_up_outside(e) {
        this.status.press_attempt = false;
    }
}
