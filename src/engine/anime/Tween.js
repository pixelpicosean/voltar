import Signal from 'engine/Signal';
import { clamp } from 'engine/core/math';
import flatten_key_url from './flatten_key_url';
import { Easing } from './easing';


// InterpolateType
const INTER_PROPERTY = 0;
const INTER_METHOD = 1;
const FOLLOW_PROPERTY = 2;
const FOLLOW_METHOD = 3;
const TARGETING_PROPERTY = 4;
const TARGETING_METHOD = 5;
const INTER_CALLBACK = 6;


// ValueType
const NUMBER = 0;
const BOOL = 1;
const STRING = 2;


function get_property(obj, key) {
    let idx = 0, res = obj;
    while (idx < key.length) {
        res = res[key[idx]];
        idx++;
    }
    return res;
}
function set_property(obj, key, value) {
    let idx = 0, res = obj;
    while (idx < key.length - 1) {
        res = res[key[idx]];
        idx++;
    }
    res[key[key.length - 1]] = value;
}


class InterpolateData {
    constructor() {
        this.active = false;
        this.type = -1;
        this.finish = false;
        this.call_deferred = false;
        this.elapsed = 0.0;
        this.id = 0;
        this.key = '';
        this.initial_val = undefined;
        this.delta_val = undefined;
        this.final_val = undefined;
        this.target_id = 0;
        this.target_key = '';
        this.duration = 0.0;
        this.easing = Easing.Linear.None;
        this.delay = 0.0;
        this.val_type = NUMBER;
        this.args = null;
    }
};

// TODO: better easing support (https://github.com/rezoner/ease)

/**
 * @class Tween
 * @extends {EventEmitter}
 */
export default class Tween {
    /**
     * @constructor
     * @param {object} context Object to apply this tween to.
     */
    constructor() {
        this.tween_completed = new Signal();
        this.tween_started = new Signal();
        this.tween_step = new Signal();


        this.is_removed = false;

        this.autoplay = false;
        this.active = false;
        this.repeat = false;
        this.speed_scale = 1;
        this.pending_update = 0;

        this.interpolates = [];
        this.pending_commands = [];
    }

    start() {
        this.active = true;
        return true;
    }
    reset() {}
    reset_all() {}

    stop() {}
    stop_all() {}

    resume() {}
    resume_all() {}

    remove() {}
    remove_all() {}

    seek(p_time) {}

    tell() {}
    get_runtime() {}

    interpolate_property(obj, property, initial_val, final_val, duration, p_easing, delay = 0) {
        if (this.pending_update !== 0) {
            this._add_pending_command('interpolate_property', [
                obj, property, initial_val, final_val, duration, p_easing, delay,
            ]);
            return true;
        }

        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = new InterpolateData();
        data.active = true;
        data.type = INTER_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.id = obj;
        data.key = flatten_key_url(property);
        data.initial_val = initial_val;
        data.final_val = final_val;
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof(data.final_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return false;
        }

        this.interpolates.push(data);
        return true;
    }
    interpolate_callback(obj, duration, callback, args) {
        if (this.pending_update !== 0) {
            this._add_pending_command('interpolate_callback', [
                obj, duration, callback,
            ]);
            return true;
        }

        let data = new InterpolateData();
        data.active = true;
        data.type = INTER_CALLBACK;
        data.finish = false;
        data.call_deferred = false;
        data.elapsed = 0;

        data.id = obj;
        data.key = callback;
        data.duration = duration;
        data.delay = 0;

        data.args = args;

        this.pending_update++;
        this.interpolates.push(data);
        this.pending_update--;
        return true;
    }

    _init() {
        this.is_removed = false;

        this.active = false;
        this.repeat = false;
        this.speed_scale = 1;
        this.pending_update = 0;

        return this;
    }
    _propagate_process(p_delta) {
        this._process_pending_commands();

        if (this.speed_scale === 0) {
            return;
        }
        let delta = p_delta * this.speed_scale;

        this.pending_update++;

        let i = 0, data;
        if (this.repeat) {
            let all_finished = true;

            for (i = 0; i < this.interpolates.length; i++) {
                if (!this.interpolates[i].finish) {
                    all_finished = false;
                    break;
                }
            }

            if (all_finished) {
                this.reset_all();
            }
        }

        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (!data.active || data.finish) {
                continue;
            }

            let prev_delaying = data.elapsed < data.delay;
            data.elapsed += delta;
            if (data.elapsed < data.delay) {
                continue;
            }
            else if (prev_delaying) {
                this.tween_started.dispatch(data.key);
                this._apply_tween_value(data, data.initial_val);
            }

            if (data.elapsed > (data.delay + data.duration)) {
                data.elapsed = data.delay + data.duration;
                data.finish = true;
            }

            switch (data.type) {
                case INTER_PROPERTY:
                case INTER_METHOD: {
                    let result = this._run_equation(data);
                    this.tween_step.dispatch(data.key, data.elapsed, result);
                    this._apply_tween_value(data, result);
                    if (data.finish) {
                        this._apply_tween_value(data, data.final_val);
                    }
                } break;

                case INTER_CALLBACK:
                    if (data.finish) {
                        if (data.call_deferred) {
                            // TODO: call deferred
                        }
                        else {
                            data.id[data.key](data.args);
                        }
                    }
                    break;
            }

            if (data.finish) {
                this.tween_completed.dispatch(data.key);
                if (!this.repeat) {
                    this.remove(data.key);
                }
            }
        }
        this.pending_update--;
    }

    _add_pending_command(key, args) {
        this.pending_commands.push({ key, args });
    }
    _process_pending_commands() {
        let i = 0, cmd;
        for (i = 0; i < this.pending_commands.length; i++) {
            cmd = this.pending_commands[i];
            this[cmd.key].apply(this, cmd.args);
        }
        this.pending_commands.length = 0;
    }
    _get_initial_val(p_data) {
        switch (p_data.type) {
            case INTER_PROPERTY:
            case INTER_METHOD:
            case FOLLOW_PROPERTY:
            case FOLLOW_METHOD:
                return p_data.initial_val;

            case TARGETING_PROPERTY:
            case TARGETING_METHOD: {
                let obj = p_data.target_id;
                let initial_val = undefined;
                if (p_data.type === TARGETING_PROPERTY) {
                    // Flatten and cache the key
                    p_data.target_key = flatten_key_url(p_data.target_key);
                    initial_val = get_property(obj, p_data.target_key);
                }
                else {
                    initial_val = get_property(obj, p_data.target_key)();
                }
                return initial_val;
            } break;
        }

        return p_data.delta_val;
    }
    _get_delta_val(p_data) {
        switch (p_data.type) {
            case INTER_PROPERTY:
            case INTER_METHOD:
                return p_data.delta_val;

            case FOLLOW_PROPERTY:
            case FOLLOW_METHOD: {
                let obj = p_data.target_id;
                let final_val = undefined;
                if (p_data.type === FOLLOW_PROPERTY) {
                    let valid = false;
                    final_val = get_property(obj, p_data.target_key);
                }
                else {
                    final_val = get_property(obj, p_data.target_key)();
                }
            } break;

            case TARGETING_PROPERTY:
            case TARGETING_METHOD: {
                // TODO: optimize by marking data as processed
                let initial_val = this._get_initial_val(p_data);
                this._calc_delta_val(initial_val, p_data.final_val, p_data);
                return p_data.delta_val;
            } break;
        }

        return p_data.initial_val;
    }
    _calc_delta_val(initial_val, final_val, data) {
        switch (data.val_type) {
            case BOOL:
                data.delta_val = Math.floor(final_val) - Math.floor(initial_val);
                break;
            case NUMBER:
                data.delta_val = final_val - initial_val;
                break;
            case STRING:
                data.delta_val = final_val.length;
                break;
        }
        return true;
    }

    _run_equation(data) {
        let initial_val = this._get_initial_val(data);
        let delta_val = this._get_delta_val(data);
        let result = undefined;

        let mod = data.easing(clamp((data.elapsed - data.delay) / data.duration, 0, 1));

        switch (data.val_type) {
            case BOOL:
                result = mod > 0.5;
                break;
            case NUMBER:
                result = initial_val + delta_val * mod;
                break;
            case STRING:
                result = data.final_val.slice(0, Math.floor(delta_val * mod));
                break;
        }

        return result;
    }
    _apply_tween_value(data, value) {
        let obj = data.id;

        switch (data.type) {
            case INTER_PROPERTY:
            case FOLLOW_PROPERTY:
            case TARGETING_PROPERTY:
                set_property(obj, data.key, value);
                break;

            case INTER_METHOD:
            case FOLLOW_METHOD:
            case TARGETING_METHOD:
                get_property(obj, data.key)(value);
                break;

            case INTER_CALLBACK:
                break;
        }
        return true;
    }

    clear_events() {
        this.tween_completed.detach_all();
        this.tween_started.detach_all();
        this.tween_step.detach_all();
    }
}
