import { remove_items } from 'engine/dep/index';
import { Vector2 } from 'engine/core/math/vector2';

import { Keyboard } from './keyboard';


/** @typedef {'BUTTON_LEFT' | 'BUTTON_MIDDLE' | 'BUTTON_RIGHT' | 'BACKSPACE' | 'TAB' | 'ENTER' | 'SHIFT' | 'CTRL' | 'ALT' | 'PAUSE' | 'CAPS_LOCK' | 'ESC' | 'SPACE' | 'PAGE_UP' | 'PAGE_DOWN' | 'END' | 'HOME' | 'LEFT' | 'UP' | 'RIGHT' | 'DOWN' | 'PRINT_SCREEN' | 'INSERT' | 'DELETE' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z' | 'NUM_0' | 'NUM_1' | 'NUM_2' | 'NUM_3' | 'NUM_4' | 'NUM_5' | 'NUM_6' | 'NUM_7' | 'NUM_8' | 'NUM_9' | 'NUM_MULTIPLY' | 'NUM_PLUS' | 'NUM_MINUS' | 'NUM_PERIOD' | 'NUM_DIVISION' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12' | 'SEMICOLON' | 'PLUS' | 'MINUS' | 'GRAVE_ACCENT' | 'SINGLE_QUOTE'} KeyName */

/**
 * Input system which provides key bindings.
 */
export class Input {
    constructor() {
        /** @type {{ [key: string]: string[] }} */
        this.bindings = {};
        /** @type {string[]} */
        this.key_list = [];
        /** @type {{ [key: string]: boolean }} */
        this.actions = {};
        /** @type {{ [key: string]: boolean }} */
        this.last_pressed = {};
        /** @type {{ [key: string]: boolean }} */
        this.last_released = {};

        this.mouse = new Vector2(0, 0);
    }
    _init() {
        Keyboard._init(this);
    }
    /**
     * @param {number} delta
     */
    _process(delta) {
        Keyboard._process(delta);

        // Mark press/release action as false
        for (const k in this.last_pressed) {
            this.last_pressed[k] = false;
        }
        for (const k in this.last_released) {
            this.last_released[k] = false;
        }
    }

    /**
     * Bind a key to a specific action.
     *
     * @param  {KeyName} key    Key to bind
     * @param  {string} action Action name
     */
    bind(key, action) {
        if (Array.isArray(this.bindings[key])) {
            this.bindings[key].push(action);
        } else {
            this.bindings[key] = [action];
        }

        if (this.key_list.indexOf(key) < 0) {
            this.key_list.push(key);
        }

        this.last_pressed[action] = false;
        this.last_released[action] = false;

        return this;
    }
    /**
     * Unbind an action from a key.
     *
     * @param  {KeyName} key    Key to unbind
     * @param  {string} action Action to unbind
     */
    unbind(key, action) {
        if (Array.isArray(this.bindings[key])) {
            let idx = this.bindings[key].indexOf(action);
            if (idx >= 0) {
                remove_items(this.bindings[key], idx, 1);
            }

            this.actions[action] = false;

            delete this.last_pressed[action];
            delete this.last_released[action];
        }

        return this;
    }
    /**
     * Unbind all the actions.
     */
    unbind_all() {
        for (let k in this.bindings) {
            if (Array.isArray(this.bindings[k])) {
                this.bindings[k].length = 0;
            }
        }

        this.actions = {};
        this.last_pressed = {};
        this.last_released = {};
    }

    /**
     * Whether an action is currently pressed.
     *
     * @param  {string} action Action name
     * @return {boolean}       Pressed or not
     */
    is_action_pressed(action) {
        return !!this.actions[action];
    }
    /**
     * Whether an action is just pressed.
     *
     * @param  {string} action Action name
     * @return {boolean}       Pressed or not
     */
    is_action_just_pressed(action) {
        return !!this.last_pressed[action];
    }
    /**
     * Whether an action is just released.
     *
     * @param  {string} action Action name
     * @return {boolean}       Released or not
     */
    is_action_just_released(action) {
        return !!this.last_released[action];
    }
    /**
     * @param {string} action
     */
    action_press(action) {
        this.actions[action] = true;
        this.last_pressed[action] = true;
    }
    /**
     * @param {string} action
     */
    action_release(action) {
        this.actions[action] = false;
        this.last_released[action] = true;
    }

    /**
     * @param {string} action
     */
    get_action_strength(action) {
        // TODO: add gamepad strength support
        return (!!this.actions[action]) ? 1 : 0;
    }

    /**
     * Key down listener
     *
     * @param {KeyName} k Name of the key
     * @private
     */
    _keydown(k) {
        if (this.key_list.indexOf(k) !== -1) {
            let i, list = this.bindings[k];
            for (i = 0; i < list.length; i++) {
                this.actions[list[i]] = true;
                this.last_pressed[list[i]] = true;
            }
        }
    }
    /**
     * Key up listener
     *
     * @param {KeyName} k Name of the key
     * @private
     */
    _keyup(k) {
        if (this.key_list.indexOf(k) !== -1) {
            let i, list = this.bindings[k];
            for (i = 0; i < list.length; i++) {
                this.actions[list[i]] = false;
                this.last_released[list[i]] = true;
            }
        }
    }
}
