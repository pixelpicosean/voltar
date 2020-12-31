import { remove_item } from 'engine/dep/index';
import { VObject } from 'engine/core/v_object';
import { clamp } from 'engine/core/math/math_funcs';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Color, ColorLike } from 'engine/core/color';

import { flatten_key_url } from './flatten_key_url';
import { Easing } from './easing';

type Tweenable = string | number | boolean | Vector2Like | ColorLike;
type EasingKey = 'Linear.None' | 'Quadratic.In' | 'Quadratic.Out' | 'Quadratic.InOut' | 'Cubic.In' | 'Cubic.Out' | 'Cubic.InOut' | 'Quartic.In' | 'Quartic.Out' | 'Quartic.InOut' | 'Quintic.In' | 'Quintic.Out' | 'Quintic.InOut' | 'Sinusoidal.In' | 'Sinusoidal.Out' | 'Sinusoidal.InOut' | 'Exponential.In' | 'Exponential.Out' | 'Exponential.InOut' | 'Circular.In' | 'Circular.Out' | 'Circular.InOut' | 'Elastic.In' | 'Elastic.Out' | 'Elastic.InOut' | 'Back.In' | 'Back.Out' | 'Back.InOut' | 'Bounce.In' | 'Bounce.Out' | 'Bounce.InOut';


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
const COLOR = 4;

function get_property(obj: any, key: string[]): any {
    let idx = 0, res = obj;
    while (idx < key.length) {
        res = res[key[idx]];
        idx++;
    }
    return res;
}
function set_property(obj: any, key: string, value: any) {
    let idx = 0, res = obj;
    while (idx < key.length - 1) {
        res = res[key[idx]];
        idx++;
    }
    res[key[key.length - 1]] = value;
}
function set_vec_property(obj: any, key: string, value: Vector2Like) {
    let idx = 0, res = obj;
    while (idx < key.length - 1) {
        res = res[key[idx]];
        idx++;
    }
    res = res[key[key.length - 1]];
    res.x = value.x;
    res.y = value.y;
}
function set_color_property(obj: any, key: string, value: ColorLike) {
    let idx = 0, res = obj;
    while (idx < key.length - 1) {
        res = res[key[idx]];
        idx++;
    }
    res = res[key[key.length - 1]];
    res.r = value.r;
    res.g = value.g;
    res.b = value.b;
    res.a = value.a;
}

const _tmp_vec2 = new Vector2;

/**
 * @type {Array<Vector2>}
 */
const VECTOR_ARR: Array<Vector2> = [];
/**
 * @param {number} x
 * @param {number} y
 * @returns {Vector2}
 */
const create_vector = (x: number, y: number): Vector2 => {
    let vec = VECTOR_ARR.pop();
    if (!vec) vec = new Vector2(x, y);
    vec.set(x, y);
    return vec;
};

const _tmp_color = new Color;

/**
 * @type {Array<Color>}
 */
const COLOR_ARR: Array<Color> = [];
/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @returns {Color}
 */
const create_color = (r: number, g: number, b: number, a: number): Color => {
    let color = COLOR_ARR.pop();
    if (!color) color = new Color(r, g, b, a);
    color.set(r, g, b, a);
    return color;
};


class InterpolateData<T, K extends keyof T, S extends Tweenable> {
    active = false;
    finish = false;

    duration = 0.0;
    delay = 0.0;
    elapsed = 0.0;

    type = 0;
    val_type = NUMBER;
    easing = Easing.Linear.None;

    obj: T = null;
    key: K = undefined;
    flat_key: string[] = null;
    target_obj: T = null;
    target_key: S = undefined;
    flat_target_key: string[] = null;

    initial_val: S = undefined;
    delta_val: S = undefined;
    final_val: S = undefined;

    call_deferred = false;
    args: any[] = null;

    _init(): InterpolateData<T, K, S> {
        this.active = false;
        this.finish = false;

        this.duration = 0.0;
        this.delay = 0.0;
        this.elapsed = 0.0;

        this.type = 0;
        this.val_type = NUMBER;
        this.easing = Easing.Linear.None;

        this.obj = null;
        this.key = undefined;
        this.flat_key = null;
        this.target_obj = null;
        this.target_key = undefined;
        this.flat_target_key = null;

        this.initial_val = undefined;
        this.delta_val = undefined;
        this.final_val = undefined;

        this.call_deferred = false;
        this.args = null;

        return this;
    }
}

const Interpolate_Pool: InterpolateData<any, any, any>[] = [];
const Interpolate_create = <T, K extends keyof T, S extends Tweenable>(): InterpolateData<T, K, S> => {
    let data = Interpolate_Pool.pop();
    if (!data) data = new InterpolateData;
    return data._init();
};

const pool_Tween: Tween[] = [];

export default class Tween extends VObject {
    static create() {
        const t = pool_Tween.pop();
        if (!t) {
            return new Tween;
        } else {
            return t;
        }
    }
    static free(t: Tween) {
        if (t) {
            t.is_removed = false;
            t.autoplay = false;
            t.active = false;
            t.repeat = false;
            t.speed_scale = 1;
            for (const i of t.interpolates) {
                Interpolate_Pool.push(i);
            }
            t.interpolates.length = 0;
            t.setter_cache = Object.create(null);
        }
        return Tween;
    }

    is_removed = false;

    autoplay = false;
    active = false;
    repeat = false;
    speed_scale = 1;

    interpolates: InterpolateData<any, any, any>[] = [];
    setter_cache: { [prop: string]: (value: any) => void } = Object.create(null);

    set_active(active: boolean) {
        this.active = active;
        return this;
    }
    set_speed_scale(scale: number) {
        this.speed_scale = scale;
        return this;
    }

    /**
     * Start the tween
     */
    start() {
        this.active = true;
        return this;
    }
    reset<T, K extends keyof T>(obj: T, key: K) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || (key as string).length === 0)) {
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

    stop<T, K extends keyof T>(obj: T, key: K) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || (key as string).length === 0)) {
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
    resume<T, K extends keyof T>(obj: T, key: K) {
        this.active = true;

        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || (key as string).length === 0)) {
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

    remove<T, K extends keyof T>(obj: T, key: K, first_only: boolean = true) {
        let i = 0, data;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (data.obj === obj && (data.key === key || (key as string).length === 0)) {
                remove_item(this.interpolates, i--);
                Interpolate_Pool.push(data);
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
            Interpolate_Pool.push(this.interpolates[i]);
        }
        this.interpolates.length = 0;

        return this;
    }

    seek(p_time: number) {
        let i = 0, data: InterpolateData<any, any, any> = null;
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];

            data.elapsed = p_time;
            if (data.elapsed < data.delay) {
                data.finish = false;
                continue;
            } else if (data.elapsed >= (data.delay + data.duration)) {
                data.finish = true;
                data.elapsed = data.delay + data.duration;
            } else {
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

    /**
     * Animate a property of an object
     * @param obj Target
     * @param property Property to be animated
     * @param initial_val Initial value
     * @param final_val Initial value
     * @param duration Duration of this animation
     * @param p_easing Easing function
     * @param [delay] Time before start
     */
    interpolate_property<T, K extends keyof T, S extends Tweenable>(obj: T, property: K, initial_val: S, final_val: S, duration: number, p_easing: EasingKey, delay: number = 0) {
        let easing = p_easing.split('.');
        // @ts-ignore
        let easing_func: (k: number) => number = Easing[easing[0]][easing[1]];

        let data = Interpolate_create<T, K, S>();
        data.active = true;
        data.type = INTER_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = property;
        data.flat_key = flatten_key_url(property as string);
        data.initial_val = initial_val;
        data.final_val = final_val;
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof (initial_val)) {
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
                    // @ts-ignore
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    // @ts-ignore
                    data.final_val = create_vector(final_val.x, final_val.y);
                    // @ts-ignore
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                } else if (('r' in initial_val) && ('g' in initial_val) && ('b' in initial_val) && ('a' in initial_val)) {
                    // @ts-ignore
                    data.initial_val = create_color(initial_val.r, initial_val.g, initial_val.b, initial_val.a);
                    // @ts-ignore
                    data.final_val = create_color(final_val.r, final_val.g, final_val.b, final_val.a);
                    // @ts-ignore
                    data.delta_val = create_color(1, 1, 1, 1);
                    data.val_type = COLOR;
                }
                break;
        }
        // @ts-ignore
        const setter = obj[`set_${property}`];
        if (typeof setter === 'function') {
            // @ts-ignore
            this.setter_cache[property] = setter;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return this;
        }

        this.interpolates.push(data);

        return this;
    }
    /**
     * Animate a method of an object
     * @param obj Target
     * @param method Method to be animated
     * @param initial_val Initial value
     * @param final_val Initial value
     * @param duration Duration of this animation
     * @param p_easing Easing function
     * @param [delay] Time before start
     */
    interpolate_method<T, K extends keyof T, S extends Tweenable>(obj: T, method: K, initial_val: S, final_val: S, duration: number, p_easing: EasingKey, delay: number = 0) {
        let easing = p_easing.split('.');
        // @ts-ignore
        let easing_func: (k: number) => number = Easing[easing[0]][easing[1]];

        let data = Interpolate_create<T, K, S>();
        data.active = true;
        data.type = INTER_METHOD;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = method;
        data.flat_key = [method as string];
        data.initial_val = initial_val;
        data.final_val = final_val;
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof (initial_val)) {
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
                    // @ts-ignore
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    // @ts-ignore
                    data.final_val = create_vector(final_val.x, final_val.y);
                    // @ts-ignore
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                } else if (('r' in initial_val) && ('g' in initial_val) && ('b' in initial_val) && ('a' in initial_val)) {
                    // @ts-ignore
                    data.initial_val = create_color(initial_val.r, initial_val.g, initial_val.b, initial_val.a);
                    // @ts-ignore
                    data.final_val = create_color(final_val.r, final_val.g, final_val.b, final_val.a);
                    // @ts-ignore
                    data.delta_val = create_color(1, 1, 1, 1);
                    data.val_type = COLOR;
                }
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return this;
        }

        this.interpolates.push(data);
        return this;
    }
    /**
     * Invoke a method after duration
     * @param obj Target
     * @param duration Duration of this animation
     * @param callback Function to call after the duration
     * @param [args] Arguments to be passed to the callback
     */
    interpolate_callback<T, K extends keyof T>(obj: T, duration: number, callback: K, args: any) {
        let data = Interpolate_create<T, K, any>();
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
    /**
     * Invoke a method after duration, but from the deferred queue
     * @param obj Target
     * @param duration Duration of this animation
     * @param callback Function to call after the duration
     * @param [args] Arguments to be passed to the callback
     */
    interpolate_deferred_callback<T, K extends keyof T>(obj: T, duration: number, callback: K, args: any) {
        let data = Interpolate_create<T, K, any>();
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
    /**
     * Follow a property of another object
     * @param obj Target
     * @param property Property to be animated
     * @param initial_val Initial value
     * @param target Object to follow
     * @param property Property of the followed object
     * @param duration Duration of this animation
     * @param p_easing Easing function
     * @param [delay] Time before start
     */
    follow_property<T, K extends keyof T, S extends Tweenable>(obj: T, property: K, initial_val: S, target: T, target_property: K, duration: number, p_easing: EasingKey, delay: number = 0) {
        let easing = p_easing.split('.');
        // @ts-ignore
        let easing_func: (k: number) => number = Easing[easing[0]][easing[1]];

        let data = Interpolate_create<T, K, S>();
        data.active = true;
        data.type = FOLLOW_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = property;
        data.flat_key = flatten_key_url(property as string);
        data.initial_val = initial_val;
        data.target_obj = target;
        // @ts-ignore
        data.target_key = target_property;
        data.flat_target_key = flatten_key_url(target_property as string);
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof (initial_val)) {
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
                    // @ts-ignore
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    // @ts-ignore
                    data.final_val = create_vector(0, 0);
                    // @ts-ignore
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                } else if (('r' in initial_val) && ('g' in initial_val) && ('b' in initial_val) && ('a' in initial_val)) {
                    // @ts-ignore
                    data.initial_val = create_color(initial_val.r, initial_val.g, initial_val.b, initial_val.a);
                    // @ts-ignore
                    data.final_val = create_color(final_val.r, final_val.g, final_val.b, final_val.a);
                    // @ts-ignore
                    data.delta_val = create_color(1, 1, 1, 1);
                    data.val_type = COLOR;
                }
                break;
        }
        // @ts-ignore
        const setter = obj[`set_${property}`];
        if (typeof setter === 'function') {
            // @ts-ignore
            this.setter_cache[property] = setter;
        }

        this.interpolates.push(data);
        return this;
    }
    /**
     * Follow a method return value of another object
     * @param obj Target
     * @param method Method to be called
     * @param initial_val Initial value
     * @param target Object to follow
     * @param target_method Method of the followed object
     * @param duration Duration of this animation
     * @param p_easing Easing function
     * @param [delay] Time before start
     */
    follow_method<T, K extends keyof T, S extends Tweenable>(obj: T, method: K, initial_val: S, target: T, target_method: K, duration: number, p_easing: EasingKey, delay: number = 0) {
        let easing = p_easing.split('.');
        // @ts-ignore
        let easing_func: (k: number) => number = Easing[easing[0]][easing[1]];

        let data = Interpolate_create<T, K, S>();
        data.active = true;
        data.type = FOLLOW_METHOD;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = method;
        data.flat_key = [method as string];
        data.initial_val = initial_val;
        data.target_obj = target;
        // @ts-ignore
        data.target_key = target_method;
        data.flat_target_key = [target_method as string];
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        switch (typeof (initial_val)) {
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
                    // @ts-ignore
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    // @ts-ignore
                    data.final_val = create_vector(0, 0);
                    // @ts-ignore
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                } else if (('r' in initial_val) && ('g' in initial_val) && ('b' in initial_val) && ('a' in initial_val)) {
                    // @ts-ignore
                    data.initial_val = create_color(initial_val.r, initial_val.g, initial_val.b, initial_val.a);
                    // @ts-ignore
                    data.final_val = create_color(final_val.r, final_val.g, final_val.b, final_val.a);
                    // @ts-ignore
                    data.delta_val = create_color(1, 1, 1, 1);
                    data.val_type = COLOR;
                }
                break;
        }

        this.interpolates.push(data);
        return this;
    }
    /**
     * Animate a property from value of another object to a final value
     * @param obj Target
     * @param property Property to be animated
     * @param initial Object to fetch initial value from
     * @param initial_property Property of the initial object
     * @param final_val Initial value
     * @param duration Duration of this animation
     * @param p_easing Easing function
     * @param [delay] Time before start
     */
    targeting_property<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, property: K, initial: T2, initial_property: K2, final_val: S, duration: number, p_easing: EasingKey, delay: number = 0) {
        let easing = p_easing.split('.');
        // @ts-ignore
        let easing_func: (k: number) => number = Easing[easing[0]][easing[1]];

        let data = Interpolate_create<T, K, S>();
        data.active = true;
        data.type = TARGETING_PROPERTY;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = property;
        data.flat_key = flatten_key_url(property as string);
        data.final_val = final_val;
        // @ts-ignore
        data.target_obj = initial;
        // @ts-ignore
        data.target_key = initial_property;
        data.flat_target_key = flatten_key_url(initial_property as string);
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        let initial_val = get_property(initial, data.flat_target_key);
        switch (typeof (final_val)) {
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
                    // @ts-ignore
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    // @ts-ignore
                    data.final_val = create_vector(final_val.x, final_val.y);
                    // @ts-ignore
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                } else if (('r' in initial_val) && ('g' in initial_val) && ('b' in initial_val) && ('a' in initial_val)) {
                    // @ts-ignore
                    data.initial_val = create_color(initial_val.r, initial_val.g, initial_val.b, initial_val.a);
                    // @ts-ignore
                    data.final_val = create_color(final_val.r, final_val.g, final_val.b, final_val.a);
                    // @ts-ignore
                    data.delta_val = create_color(1, 1, 1, 1);
                    data.val_type = COLOR;
                }
                break;
        }
        // @ts-ignore
        const setter = obj[`set_${property}`];
        if (typeof setter === 'function') {
            // @ts-ignore
            this.setter_cache[property] = setter;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return this;
        }

        this.interpolates.push(data);
        return this;
    }
    /**
     * Animate a method from return of another object's method to a final value
     * @param obj Target
     * @param method Method to be animated
     * @param initial Object to fetch initial value from
     * @param initial_method Method of the initial object
     * @param final_val Initial value
     * @param duration Duration of this animation
     * @param p_easing Easing function
     * @param [delay] Time before start
     */
    targeting_method<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, method: K, initial: T2, initial_method: K2, final_val: S, duration: number, p_easing: EasingKey, delay: number = 0) {
        let easing = p_easing.split('.');
        // @ts-ignore
        let easing_func: (k: number) => number = Easing[easing[0]][easing[1]];

        let data = Interpolate_create<T, K, S>();
        data.active = true;
        data.type = TARGETING_METHOD;
        data.finish = false;
        data.elapsed = 0;

        data.obj = obj;
        data.key = method;
        data.flat_key = [method as string]
        data.final_val = final_val;
        // @ts-ignore
        data.target_obj = initial;
        // @ts-ignore
        data.target_key = initial_method;
        data.flat_target_key = [initial_method as string];
        data.duration = duration;
        data.easing = easing_func;
        data.delay = delay;
        // @ts-ignore
        let initial_val = initial[initial_method as string]();
        switch (typeof (final_val)) {
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
                    // @ts-ignore
                    data.initial_val = create_vector(initial_val.x, initial_val.y);
                    // @ts-ignore
                    data.final_val = create_vector(final_val.x, final_val.y);
                    // @ts-ignore
                    data.delta_val = create_vector(0, 0);
                    data.val_type = VECTOR2;
                } else if (('r' in initial_val) && ('g' in initial_val) && ('b' in initial_val) && ('a' in initial_val)) {
                    // @ts-ignore
                    data.initial_val = create_color(initial_val.r, initial_val.g, initial_val.b, initial_val.a);
                    // @ts-ignore
                    data.final_val = create_color(final_val.r, final_val.g, final_val.b, final_val.a);
                    // @ts-ignore
                    data.delta_val = create_color(1, 1, 1, 1);
                    data.val_type = COLOR;
                }
                break;
        }

        if (!this._calc_delta_val(data.initial_val, data.final_val, data)) {
            return this;
        }

        this.interpolates.push(data);
        return this;
    }

    clear_events() {
        this.disconnect_all('tween_completed');
        this.disconnect_all('tween_started');
        this.disconnect_all('tween_step');

        return this;
    }

    _init() {
        this.is_removed = false;

        this.active = false;
        this.repeat = false;
        this.speed_scale = 1;

        return this;
    }
    /**
     * @param {number} p_delta
     */
    _propagate_process(p_delta: number) {
        if (this.speed_scale === 0 || this.interpolates.length === 0) {
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
        } else {
            // Remove finished channels
            for (i = 0; i < this.interpolates.length; i++) {
                data = this.interpolates[i];
                if (data.finish) {
                    remove_item(this.interpolates, i--);
                    Interpolate_Pool.push(data);
                }
            }

            if (this.interpolates.length === 0) {
                this.emit_signal('tween_all_completed');
            }
        }

        // Update still running channels
        for (i = 0; i < this.interpolates.length; i++) {
            data = this.interpolates[i];
            if (!data.active || data.finish) {
                continue;
            }

            let prev_delaying = data.elapsed < data.delay;
            data.elapsed += delta;
            if (data.elapsed < data.delay) {
                continue;
            } else if (prev_delaying) {
                this.emit_signal('tween_started', data.flat_key);
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
                    this.emit_signal('tween_step', data.key, data.elapsed, result);
                    this._apply_tween_value(data, result);
                    if (data.finish) {
                        this._apply_tween_value(data, data.final_val);
                    }
                } break;

                case INTER_CALLBACK: {
                    if (data.finish) {
                        if (data.call_deferred) {
                            data.obj.call_deferred(data.key, data.args);
                        } else {
                            data.obj[data.key](data.args);
                        }
                    }
                } break;
            }

            if (data.finish) {
                this.emit_signal('tween_completed', data.key);
            }
        }
    }

    _get_initial_val<T, K extends keyof T>(p_data: InterpolateData<T, K, any>) {
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
                } else {
                    // @ts-ignore
                    initial_val = obj[p_data.target_key]();
                }
                if (p_data.val_type === VECTOR2 || p_data.val_type === COLOR) {
                    p_data.initial_val.copy(initial_val);
                } else {
                    p_data.initial_val = initial_val;
                }
                return initial_val;
            }
        }

        return p_data.delta_val;
    }
    _get_delta_val(p_data: InterpolateData<any, any, any>) {
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
                } else {
                    final_val = obj[p_data.flat_target_key[0]]();
                }
                if (p_data.val_type === VECTOR2 || p_data.val_type === COLOR) {
                    p_data.final_val.copy(final_val);
                } else {
                    p_data.final_val = final_val;
                }
                this._calc_delta_val(p_data.initial_val, p_data.final_val, p_data);
                return p_data.delta_val;
            }

            case TARGETING_PROPERTY:
            case TARGETING_METHOD: {
                let initial_val = this._get_initial_val(p_data);
                this._calc_delta_val(initial_val, p_data.final_val, p_data);
                return p_data.delta_val;
            }
        }

        return p_data.initial_val;
    }
    _calc_delta_val<T extends Tweenable>(initial_val: T, final_val: T, data: InterpolateData<any, any, T>) {
        switch (data.val_type) {
            case BOOL:
                // @ts-ignore
                data.delta_val = Math.floor(final_val) - Math.floor(initial_val);
                break;
            case NUMBER:
                // @ts-ignore
                data.delta_val = final_val - initial_val;
                break;
            case STRING:
                // @ts-ignore
                data.delta_val = final_val.length;
                break;
            case VECTOR2:
                // @ts-ignore
                data.delta_val.x = final_val.x - initial_val.x;
                // @ts-ignore
                data.delta_val.y = final_val.y - initial_val.y;
                break;
            case COLOR: {
                // @ts-ignore
                data.delta_val.r = final_val.r - initial_val.r;
                // @ts-ignore
                data.delta_val.g = final_val.g - initial_val.g;
                // @ts-ignore
                data.delta_val.b = final_val.b - initial_val.b;
                // @ts-ignore
                data.delta_val.a = final_val.a - initial_val.a;
            } break;
        }
        return true;
    }

    _run_equation(data: InterpolateData<any, any, any>) {
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
            case COLOR:
                _tmp_color.copy(initial_val);
                _tmp_color.r += delta_val.r * mod;
                _tmp_color.g += delta_val.g * mod;
                _tmp_color.b += delta_val.b * mod;
                _tmp_color.a += delta_val.a * mod;
                return _tmp_color;
            default:
                return undefined;
        }
    }
    _apply_tween_value<T extends Tweenable>(data: InterpolateData<any, any, T>, value: T) {
        switch (data.type) {
            case INTER_PROPERTY:
            case FOLLOW_PROPERTY:
            case TARGETING_PROPERTY: {
                const setter = this.setter_cache[data.flat_key[0]];
                if (setter) {
                    setter.call(data.obj, value);
                } else if (data.val_type === VECTOR2) {
                    set_vec_property(data.obj, data.flat_key[0], value as Vector2Like);
                } else if (data.val_type === COLOR) {
                    set_color_property(data.obj, data.flat_key[0], value as ColorLike);
                } else {
                    set_property(data.obj, data.flat_key[0], value);
                }
            } break;

            case INTER_METHOD:
            case FOLLOW_METHOD:
            case TARGETING_METHOD: {
                data.obj[data.key](value);
            } break;

            case INTER_CALLBACK: {
            } break;
        }
        return true;
    }
}
