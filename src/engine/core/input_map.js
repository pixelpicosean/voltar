import { remove_items } from 'engine/dep/index.js';
import { ProjectSettings } from './project_settings.js';
import { res_class_map } from 'engine/registry.js';

/**
 * make some type alias
 * @typedef {import('engine/core/os/input_event').InputEvent} InputEvent
 * @typedef {import('engine/core/os/input_event').ActionStatusRet} ActionStatusRet
 */


const ALL_DEVICES = -1;

class Action {
    constructor() {
        this.id = 0;
        this.deadzone = 0;
        /** @type {InputEvent[]} */
        this.inputs = [];
    }
}

let last_id = 1;
const action_status = {
    pressed: false,
    strength: 0,
};

const has = Object.prototype.hasOwnProperty;

export class InputMap {
    static get_singleton() { return singleton }

    constructor() {
        if (!singleton) singleton = this;

        /** @type {Map<string, Action>} */
        this.input_map = new Map();
    }

    /**
     * @param {string} p_action
     */
    has_action(p_action) {
        return this.input_map.has(p_action);
    }
    /**
     * @param {string} p_action
     * @param {number} p_deadzone
     */
    add_action(p_action, p_deadzone = 0.5) {
        const action = new Action();
        this.input_map.set(p_action, action);
        action.id = last_id;
        action.deadzone = p_deadzone;
        last_id++;
    }
    /**
     * @param {string} p_action
     */
    erase_action(p_action) {
        this.input_map.delete(p_action);
    }

    /**
     * @param {string} p_action
     * @param {number} p_deadzone
     */
    action_set_deadzone(p_action, p_deadzone) {
        this.input_map.get(p_action).deadzone = p_deadzone;
    }
    /**
     * @param {string} p_action
     * @param {InputEvent | { type: string }} p_event
     */
    action_add_event(p_action, p_event) {
        /** @type {InputEvent} */
        let event = /** @type {InputEvent} */(p_event);
        // this event maybe a plain object
        if ('type' in p_event) {
            if (p_event.type in res_class_map) {
                event = /** @type {InputEvent} */(new (res_class_map[p_event.type]));
                event._load_data(p_event);
            } else {
                return;
            }
        }
        const action = this.input_map.get(p_action);
        if (this._find_event(action, event)) {
            return;
        }
        action.inputs.push(event);
    }
    /**
     * @param {string} p_action
     * @param {InputEvent} p_event
     */
    action_has_event(p_action, p_event) {
        return !!(this._find_event(this.input_map.get(p_action), p_event));
    }
    /**
     * @param {string} p_action
     * @param {InputEvent} p_event
     */
    action_erase_event(p_action, p_event) {
        const action = this.input_map.get(p_action);
        const E = this._find_event(action, p_event);
        if (E) {
            remove_items(action.inputs, action.inputs.indexOf(E), 1);
        }
    }
    /**
     * @param {string} p_action
     */
    action_erase_events(p_action) {
        this.input_map.get(p_action).inputs.length = 0;
    }

    /**
     * @param {string} p_action
     */
    get_action_list(p_action) { }
    /**
     * @param {InputEvent} p_event
     * @param {string} p_action
     */
    event_is_action(p_event, p_action) {
        return this.event_get_action_status(p_event, p_action, null);
    }

    load_from_globals() {
        this.input_map.clear();
        const inputs = ProjectSettings.get_singleton().input;
        for (const name in inputs) {
            const action = inputs[name];
            const events = action.events;

            this.add_action(name, action.deadzone !== undefined ? action.deadzone : 0.5);
            for (const e of events) {
                this.action_add_event(name, e);
            }
        }
    }

    /* private */

    /**
     * @param {InputEvent} p_event
     * @param {string} p_action
     * @param {ActionStatusRet} r_ret
     */
    event_get_action_status(p_event, p_action, r_ret) {
        const E = this.input_map.get(p_action);

        if (p_event.class === 'InputEventAction') {
        }

        const event = this._find_event(E, p_event, action_status);
        if (event) {
            if (r_ret) {
                r_ret.pressed = action_status.pressed;
                r_ret.strength = action_status.strength;
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * @param {Action} p_action
     * @param {InputEvent} p_event
     * @param {ActionStatusRet} [p_ret]
     */
    _find_event(p_action, p_event, p_ret) {
        let device = 0;
        for (const e of p_action.inputs) {
            device = e.device;
            if (device === ALL_DEVICES || device === p_event.device) {
                if (e.action_match(p_event, p_ret, p_action.deadzone)) {
                    return e;
                }
            }
        }
        return null;
    }
}

/** @type {InputMap} */
let singleton = null;
