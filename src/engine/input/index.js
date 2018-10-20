import remove_items from 'remove-array-items';
import { Vector } from '../math/index';
import keyboard from './keyboard';


/**
 * Input system which provides key bindings.
 */
export default class Input {
    constructor() {
        this.bindings = {};
        this.key_list = [];
        this.actions = {};
        this.last_pressed = {};
        this.last_released = {};

        this.mouse = new Vector(0, 0);
    }
    _init(viewport) {
        // Keyboard
        keyboard._init(this);

        // Mouse
        viewport.interactive = true;
        viewport.contains_point = () => true;
        viewport.on('pointerdown', (e) => {
            this.mouse.copy(e.data.global);
            this._keydown('MOUSE');
        });
        viewport.on('pointermove', (e) => {
            this.mouse.copy(e.data.global);
        });
        viewport.on('pointerup', (e) => {
            this.mouse.copy(e.data.global);
            this._keyup('MOUSE');
        });
        viewport.on('pointerupoutside', (e) => {
            this.mouse.copy(e.data.global);
            this._keyup('MOUSE');
        });
    }
    _process(delta) {
        keyboard._process(delta);

        // Mark press/release action as false
        let k;
        for (k in this.last_pressed) {
            this.last_pressed[k] = false;
        }
        for (k in this.last_released) {
            this.last_released[k] = false;
        }
    }

    /**
     * Bind a key to a specific action.
     *
     * @param  {string} key    Key to bind
     * @param  {string} action Action name
     * @return {Input} Self for chaining
     */
    bind(key, action) {
        if (Array.isArray(this.bindings[key])) {
            this.bindings[key].push(action);
        }
        else {
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
     * @param  {string} key    Key to unbind
     * @param  {string} action Action to unbind
     * @return {Input}   Self for chaining
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
    action_press(action) {
        this.actions[action] = true;
        this.last_pressed[action] = true;
    }
    action_release(action) {
        this.actions[action] = false;
        this.last_released[action] = true;
    }

    /**
     * Key down listener
     *
     * @param {string} k Name of the key
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
     * @param {string} k Name of the key
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
