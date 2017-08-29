import remove_items from 'remove-array-items';
import keyboard from './keyboard';


/**
 * Input system which provides key bindings.
 * @class Input
 */
export default class Input {
    /**
     * @constructor
     */
    constructor() {
        this.bindings = {};
        this.key_list = [];
        this.actions = {};
        this.last_pressed = {};
        this.last_released = {};
    }
    _init() {
        // Keyboard
        keyboard._init(this);
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
     * @memberof Input#
     * @method bind
     * @param  {String} key    Key to bind
     * @param  {String} action Action name
     * @return {Input}   Self for chaining
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
     * @memberof Input#
     * @method unbind
     * @param  {String} key    Key to unbind
     * @param  {String} action Action to unbind
     * @return {Input}   Self for chaining
     */
    unbind(key, action) {
        if (Array.isArray(this.bindings[key])) {
            let idx = this.bindings[key].indexOf(action);
            if (idx >= 0) {
                remove_items(this.bindings[key], idx, 1);
            }

            delete this.last_pressed[action];
            delete this.last_released[action];
        }

        return this;
    }
    /**
     * Unbind all the actions.
     * @memberof Input#
     * @method unbindAll
     */
    unbind_all() {
        for (let k in this.bindings) {
            if (Array.isArray(this.bindings[k])) {
                this.bindings[k].length = 0;
            }
        }

        this.last_pressed = {};
        this.last_released = {};
    }

    /**
     * Whether an action is currently pressed.
     * @memberof Input#
     * @method state
     * @param  {String} action Action name
     * @return {Boolean}       Pressed or not
     */
    state(action) {
        return !!this.actions[action];
    }
    /**
     * Whether an action is just pressed.
     * @memberof Input#
     * @method pressed
     * @param  {String} action Action name
     * @return {Boolean}       Pressed or not
     */
    pressed(action) {
        return !!this.last_pressed[action];
    }
    /**
     * Whether an action is just released.
     * @memberof Input#
     * @method released
     * @param  {String} action Action name
     * @return {Boolean}       Released or not
     */
    released(action) {
        return !!this.last_released[action];
    }

    /**
     * Key down listener
     * @memberof Input#
     * @param {String} k Name of the key
     * @private
     */
    _keydown(k, shift, ctrl, alt) {
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
     * @memberof Input#
     * @param {String} k Name of the key
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
