import { remove_items } from 'engine/dep/index';
import { ProjectSettings } from './project_settings';
import { res_class_map } from 'engine/registry';

type InputEvent = import('engine/core/os/input_event').InputEvent;
type ActionStatusRet = import('engine/core/os/input_event').ActionStatusRet;


const ALL_DEVICES = -1;

class Action {
    id = 0;
    deadzone = 0;
    inputs: InputEvent[] = [];
}

let last_id = 1;
const action_status = {
    pressed: false,
    strength: 0,
};

const has = Object.prototype.hasOwnProperty;

export class InputMap {
    static get_singleton() { return singleton }

    input_map: Map<string, Action> = new Map;

    constructor() {
        if (!singleton) singleton = this;
    }

    has_action(p_action: string): boolean {
        return this.input_map.has(p_action);
    }
    add_action(p_action: string, p_deadzone: number = 0.5) {
        let action = new Action();
        this.input_map.set(p_action, action);
        action.id = last_id;
        action.deadzone = p_deadzone;
        last_id++;
    }
    erase_action(p_action: string) {
        this.input_map.delete(p_action);
    }

    action_set_deadzone(p_action: string, p_deadzone: number) {
        this.input_map.get(p_action).deadzone = p_deadzone;
    }
    action_add_event(p_action: string, p_event: InputEvent | { type: string }) {
        let event = p_event as InputEvent;
        // this event maybe a plain object
        if ('type' in p_event) {
            if (p_event.type in res_class_map) {
                event = (new (res_class_map[p_event.type])) as InputEvent;
                event._load_data(p_event);
            } else {
                return;
            }
        }
        let action = this.input_map.get(p_action);
        if (this._find_event(action, event)) {
            return;
        }
        action.inputs.push(event);
    }
    action_has_event(p_action: string, p_event: InputEvent): boolean {
        return !!(this._find_event(this.input_map.get(p_action), p_event));
    }
    action_erase_event(p_action: string, p_event: InputEvent) {
        let action = this.input_map.get(p_action);
        let E = this._find_event(action, p_event);
        if (E) {
            remove_items(action.inputs, action.inputs.indexOf(E), 1);
        }
    }
    action_erase_events(p_action: string) {
        this.input_map.get(p_action).inputs.length = 0;
    }

    get_action_list(p_action: string) { }
    event_is_action(p_event: InputEvent, p_action: string): boolean {
        return this.event_get_action_status(p_event, p_action, null);
    }

    load_from_globals() {
        this.input_map.clear();
        let inputs = ProjectSettings.get_singleton().input;
        for (let name in inputs) {
            let action = inputs[name];
            let events = action.events;

            this.add_action(name, action.deadzone !== undefined ? action.deadzone : 0.5);
            for (let e of events) {
                this.action_add_event(name, e);
            }
        }
    }

    /* private */

    event_get_action_status(p_event: InputEvent, p_action: string, r_ret?: ActionStatusRet): boolean {
        let E = this.input_map.get(p_action);

        if (p_event.class === 'InputEventAction') {
        }

        let event = this._find_event(E, p_event, action_status);
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

    _find_event(p_action: Action, p_event: InputEvent, p_ret?: ActionStatusRet): InputEvent {
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

let singleton: InputMap = null;
