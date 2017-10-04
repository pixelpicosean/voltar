import remove_items from 'remove-array-items';
import Signal from 'engine/Signal';
import { Vector, clamp } from 'engine/core/math';
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
const VECTOR2 = 3;


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
function set_vec_property(obj, key, value) {
    let idx = 0, res = obj;
    while (idx < key.length - 1) {
        res = res[key[idx]];
        idx++;
    }
    res = res[key[key.length - 1]];
    res.x = value.x;
    res.y = value.y;
}

const _tmp_vec2 = new Vector();

const VECTOR_ARR = [];
const create_vector = (x, y) => {
    let vec = VECTOR_ARR.pop();
    if (!vec) vec = new Vector(x, y);
    vec.set(x, y);
    return vec;
};
window.VECTOR_ARR = VECTOR_ARR;


class InterpolateData {
    constructor() {
        this._init();
    }
    _init() {
        this.active = false;
        this.finish = false;

        this.duration = 0.0;
        this.delay = 0.0;
        this.elapsed = 0.0;

        this.type = 0;
        this.val_type = NUMBER;
        this.easing = Easing.Linear.None;

        this.obj = null;
        this.key = '';
        this.flat_key = null;
        this.target_obj = null;
        this.target_key = '';
        this.flat_target_key = null;

        this.initial_val = undefined;
        this.delta_val = undefined;
        this.final_val = undefined;

        this.call_deferred = false;
        this.args = null;

        return this;
    }
};

const pool = [];
const create_interpolate = () => {
    let data = pool.pop();
    if (!data) data = new InterpolateData();
    return data._init();
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

        this.interpolates = [];
    }

    set_active(active) {
        this.active = active;
    }
    set_speed_scale(scale) {
        this.speed_scale = scale;
    }

    start() {
        this.active = true;
    }
    reset(obj, key) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || key.length === 0)) {
                data.elapsed = 0;
                data.finish = false;
                if (data.delay === 0) {
                    this._apply_tween_value(data, data.initial_val);
                }
            }
        }
        return this;
    }
    reset_all() {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            data.elapsed = 0;
            data.finish = false;
            if (data.delay === 0) {
                this._apply_tween_value(data, data.initial_val);
            }
        }
        return this;
    }

    stop(obj, key) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || key.length === 0)) {
                data.active = false;
            }
        }
        return this;
    }
    stop_all() {
        this.active = false;

        let i = 0;
        for (i = 0; i < this.interpolates.length; i++) {
            this.interpolates[i].active = false;
        }
        return this;
    }

    resume(obj, key) {
        this.active = true;

        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || key.length === 0)) {
                data.active = true;
            }
        }
        return this;
    }
    resume_all() {
        this.active = true;

        let i = 0;
        for (i = 0; i < this.interpolates.length; i++) {
            this.interpolates[i].active = true;
        }
        return this;
    }

    remove(obj, key, first_only = true) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || key.length === 0)) {
                remove_items(this.interpolates, i--, 1);
                pool.push(data);
                if (first_only) {
                    break;
                }
            }
        }
        return this;
    }
    remove_all() {
        this.active = false;

        for (let i = 0; i < this.interpolates.length; i++) {
            pool.push(this.interpolates[i]);
        }
        this.interpolates.length = 0;

        return this;
    }

    seek(p_time) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];

            data.elapsed = p_time;
            if (data.elapsed < data.delay) {
                data.finish = false;
                continue;
            }
            else if (data.elapsed >= (data.delay + data.duration)) {
                data.finish = true;
                data.elapsed = data.delay + data.duration;
            }
            else {
                data.finish = false;
            }

            switch (data.type) {
                case INTER_PROPERTY:
                case INTER_METHOD:
                    break;
                case INTER_CALLBACK:
                    continue;
            }

            this._apply_tween_value(data, this._run_equation(data));
        }
        return this;
    }

    tell() {
        let pos = 0, data;
        for (let i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            pos = (data.elapsed > pos) ? data.elapsed : pos;
        }
        return pos;
    }
    get_runtime() {
        let runtime = 0, t = 0, data;
        for (let i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            t = data.delay + data.duration;
            runtime = (t > runtime) ? t : runtime;
        }
        return runtime;
    }

    interpolate_property(obj, property, initial_val, final_val, duration, p_easing, delay = 0) {
        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = create_interpolate();
        data.active = true;
        data.type = INTER_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = property;
        data.flat_key = flatten_key_url(property);
        data.initial_val = initial_val;
        data.final_val = final_val;
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof(initial_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
            case 'object':
                if (('x' in initial_val) && ('y' in initial_val)) {
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    data.final_val = create_vector(final_val.x, final_val.y);
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                }
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return false;
        }

        this.interpolates.push(data);
        return true;
    }
    interpolate_method(obj, method, initial_val, final_val, duration, p_easing, delay = 0) {
        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = create_interpolate();
        data.active = true;
        data.type = INTER_METHOD;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = method;
        data.flat_key = [method];
        data.initial_val = initial_val;
        data.final_val = final_val;
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof(initial_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
            case 'object':
                if (('x' in initial_val) && ('y' in initial_val)) {
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    data.final_val = create_vector(final_val.x, final_val.y);
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                }
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return false;
        }

        this.interpolates.push(data);
        return true;
    }
    interpolate_callback(obj, duration, callback, args) {
        let data = create_interpolate();
        data.active = true;
        data.type = INTER_CALLBACK;
        data.finish = false;
        data.call_deferred = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = callback;
        data.duration = duration;
        data.delay = 0;

        data.args = args;

        this.interpolates.push(data);
        return this;
    }
    interpolate_deferred_callback(obj, duration, callback, args) {
        let data = create_interpolate();
        data.active = true;
        data.type = INTER_CALLBACK;
        data.finish = false;
        data.call_deferred = true;
        data.elapsed = 0;

        data.obj = obj;
        data.key = callback;
        data.duration = duration;
        data.delay = 0;

        data.args = args;

        this.interpolates.push(data);
        return this;
    }
    follow_property(obj, property, initial_val, target, target_property, duration, p_easing, delay = 0) {
        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = create_interpolate();
        data.active = true;
        data.type = FOLLOW_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = property;
        data.flat_key = flatten_key_url(property);
        data.initial_val = initial_val;
        data.target_obj = target;
        data.target_key = target_property;
        data.flat_target_key = flatten_key_url(target_property);
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof(initial_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
            case 'object':
                if (('x' in initial_val) && ('y' in initial_val)) {
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    data.final_val = create_vector(0, 0);
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                }
                break;
        }

        this.interpolates.push(data);
        return true;
    }
    follow_method(obj, method, initial_val, target, target_method, duration, p_easing, delay = 0) {
        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = create_interpolate();
        data.active = true;
        data.type = FOLLOW_METHOD;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = method;
        data.flat_key = [method];
        data.initial_val = initial_val;
        data.target_obj = target;
        data.target_key = target_method;
        data.flat_target_key = [target_method];
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof(initial_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
            case 'object':
                if (('x' in initial_val) && ('y' in initial_val)) {
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    data.final_val = create_vector(0, 0);
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                }
                break;
        }

        this.interpolates.push(data);
        return true;
    }
    targeting_property(obj, property, initial, initial_property, final_val, duration, p_easing, delay = 0) {
        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = create_interpolate();
        data.active = true;
        data.type = TARGETING_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = property;
        data.flat_key = flatten_key_url(property);
        data.final_val = final_val;
        data.target_obj = initial;
        data.target_key = initial_property;
        data.flat_target_key = flatten_key_url(initial_property);
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        let initial_val = get_property(initial, data.flat_target_key);
        switch (typeof(final_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
            case 'object':
                if (('x' in initial_val) && ('y' in initial_val)) {
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    data.final_val = create_vector(final_val.x, final_val.y);
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                }
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return false;
        }

        this.interpolates.push(data);
        return true;
    }
    targeting_method(obj, method, initial, initial_method, final_val, duration, p_easing, delay = 0) {
        let easing = p_easing.split('.');
        let easing_func = Easing[easing[0]][easing[1]];

        let data = create_interpolate();
        data.active = true;
        data.type = TARGETING_METHOD;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = method;
        data.flat_key = [method]
        data.final_val = final_val;
        data.target_obj = initial;
        data.target_key = initial_method;
        data.flat_target_key = [initial_method];
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        let initial_val = initial[initial_method]();
        switch (typeof(final_val)) {
            case 'number':
                data.val_type = NUMBER;
                break;
            case 'boolean':
                data.val_type = BOOL;
                break;
            case 'string':
                data.val_type = STRING;
                break;
            case 'object':
                if (('x' in initial_val) && ('y' in initial_val)) {
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    data.final_val = create_vector(final_val.x, final_val.y);
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                }
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return false;
        }

        this.interpolates.push(data);
        return true;
    }

    clear_events() {
        this.tween_completed.detach_all();
        this.tween_started.detach_all();
        this.tween_step.detach_all();
    }

    _init() {
        this.is_removed = false;

        this.active = false;
        this.repeat = false;
        this.speed_scale = 1;

        if (this.val_type === VECTOR2) {
            VECTOR_ARR.push(this.initial_val);
            VECTOR_ARR.push(this.delta_val);
            VECTOR_ARR.push(this.final_val);
        }
        this.initial_val = undefined;
        this.delta_val = undefined;
        this.final_val = undefined;

        return this;
    }
    _propagate_process(p_delta) {
        if (this.speed_scale === 0) {
            return;
        }
        let delta = p_delta * this.speed_scale;

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
                this.tween_started.dispatch(data.flat_key);
                this._apply_tween_value(data, data.initial_val);
            }

            if (data.elapsed > (data.delay + data.duration)) {
                data.elapsed = data.delay + data.duration;
                data.finish = true;
            }

            switch (data.type) {
                case INTER_PROPERTY:
                case INTER_METHOD:
                case FOLLOW_PROPERTY:
                case FOLLOW_METHOD:
                case TARGETING_PROPERTY:
                case TARGETING_METHOD: {
                    let result = this._run_equation(data);
                    this.tween_step.dispatch(data.key, data.elapsed, result);
                    this._apply_tween_value(data, result);
                    if (data.finish) {
                        this._apply_tween_value(data, data.final_val);
                    }
                } break;

                case INTER_CALLBACK: {
                    if (data.finish) {
                        if (data.call_deferred) {
                            data.obj.call_deferred(data.key, data.args);
                        }
                        else {
                            data.obj[data.key](data.args);
                        }
                    }
                } break;
            }

            if (data.finish) {
                this.tween_completed.dispatch(data.key);
                if (!this.repeat) {
                    this.remove(data.obj, data.key, true);
                }
            }
        }
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
                let obj = p_data.target_obj;
                let initial_val = undefined;
                if (p_data.type === TARGETING_PROPERTY) {
                    initial_val = get_property(obj, p_data.flat_target_key);
                }
                else {
                    initial_val = obj[p_data.target_key]();
                }
                if (p_data.val_type === VECTOR2) {
                    p_data.initial_val.copy(initial_val);
                }
                else {
                    p_data.initial_val = initial_val;
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
                let obj = p_data.target_obj;
                let final_val = undefined;
                if (p_data.type === FOLLOW_PROPERTY) {
                    final_val = get_property(obj, p_data.flat_target_key);
                }
                else {
                    final_val = obj[p_data.flat_target_key]();
                }
                if (p_data.val_type === VECTOR2) {
                    p_data.final_val.copy(final_val);
                }
                else {
                    p_data.final_val = final_val;
                }
                this._calc_delta_val(p_data.initial_val, p_data.final_val, p_data);
                return p_data.delta_val;
            } break;

            case TARGETING_PROPERTY:
            case TARGETING_METHOD: {
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
            case VECTOR2:
                data.delta_val.x = final_val.x - initial_val.x;
                data.delta_val.y = final_val.y - initial_val.y;
                break;
        }
        return true;
    }

    _run_equation(data) {
        let initial_val = this._get_initial_val(data);
        let delta_val = this._get_delta_val(data);

        let mod = data.easing(clamp((data.elapsed - data.delay) / data.duration, 0, 1));

        switch (data.val_type) {
            case BOOL:
                return mod > 0.5;
            case NUMBER:
                return initial_val + delta_val * mod;
            case STRING:
                return data.final_val.slice(0, Math.floor(delta_val * mod));
            case VECTOR2:
                _tmp_vec2.copy(initial_val);
                _tmp_vec2.x += delta_val.x * mod;
                _tmp_vec2.y += delta_val.y * mod;
                return _tmp_vec2;
            default:
                return undefined;
        }
    }
    _apply_tween_value(data, value) {
        switch (data.type) {
            case INTER_PROPERTY:
            case FOLLOW_PROPERTY:
            case TARGETING_PROPERTY:
                if (data.val_type === VECTOR2) {
                    set_vec_property(data.obj, data.flat_key, value);
                }
                else {
                    set_property(data.obj, data.flat_key, value);
                }
                break;

            case INTER_METHOD:
            case FOLLOW_METHOD:
            case TARGETING_METHOD:
                data.obj[data.key](value);
                break;

            case INTER_CALLBACK:
                break;
        }
        return true;
    }
}