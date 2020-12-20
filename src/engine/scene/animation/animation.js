import { res_class_map } from "engine/registry.js";
import { Vector2 } from "engine/core/math/vector2.js";
import { Vector3 } from "engine/core/math/vector3.js";
import { Transform } from "engine/core/math/transform.js";
import { Quat } from "engine/core/math/basis.js";
import { is_equal_approx, posmod } from "engine/core/math/math_funcs.js";
import { TYPE_TRANSFORM } from "engine/servers/visual/commands.js";


export const TRACK_TYPE_VALUE = 0;      // value
export const TRACK_TYPE_TRANSFORM = 1;  // transform a node or a bone
export const TRACK_TYPE_METHOD = 2;     // call any method on a specific node
export const TRACK_TYPE_BEZIER = 3;     // bezier curve
export const TRACK_TYPE_AUDIO = 4;
export const TRACK_TYPE_ANIMATION = 5;

export const INTERPOLATION_NEAREST = 0;
export const INTERPOLATION_LINEAR = 1;
export const INTERPOLATION_CUBIC = 2;

export const UPDATE_CONTINUOUS = 0;
export const UPDATE_DISCRETE = 1;
export const UPDATE_TRIGGER = 2;
export const UPDATE_CAPTURE = 3;

export const PROP_TYPE_NUMBER = 0;
export const PROP_TYPE_BOOLEAN = 1;
export const PROP_TYPE_STRING = 2;
export const PROP_TYPE_VECTOR = 3;
export const PROP_TYPE_COLOR = 4;
export const PROP_TYPE_TRANSFORM = 5;
export const PROP_TYPE_ANY = 6;

/**
 * Fetch property key from key path
 * @param {string} path
 * @returns {string}
 */
function prop_key_from_path(path) {
    return path.split(':')[1];
}

/**
 * @template T
 */
export class Key {
    constructor() {
        this.transition = 1;
        this.time = 0;
        /** @type {T} */
        this.value = undefined;
    }
}

export class Track {
    constructor() {
        this.type = TRACK_TYPE_VALUE;
        this.interp = INTERPOLATION_LINEAR;

        this.path = '';
        this.prop_key = '';
        this.prop_type = PROP_TYPE_ANY;

        this.loop_wrap = true;
        this.enabled = true;
    }
    load(data) {
        this.path = data.path;
        this.prop_key = prop_key_from_path(data.path);

        this.loop_wrap = !!data.loop_wrap;
        this.enabled = !!data.enabled;

        return this;
    }
}

export class ValueTrack extends Track {
    constructor() {
        super();

        this.type = TRACK_TYPE_VALUE;

        this.update_mode = UPDATE_CONTINUOUS;
        this.update_on_seek = false;

        /** @type {Key<any>[]} */
        this.values = [];
    }
    load(data) {
        super.load(data);

        this.update_mode = data.keys.update;

        this.values.length = 0;
        for (let i = 0; i < data.keys.times.length; i++) {
            let key = new Key();
            key.time = data.keys.times[i];
            key.transition = data.keys.transitions[i];
            key.value = data.keys.values[i];
            this.values.push(key);
        }

        let t = Transform.new();

        if (data.value_type === 'Transform') {
            this.prop_type = PROP_TYPE_TRANSFORM;
            if (!this.update_mode) this.update_mode = UPDATE_CONTINUOUS;

            for (let i = 0; i < this.values.length; i++) {
                let arr = this.values[i].value;
                t.set(
                    arr[0],
                    arr[1],
                    arr[2],
                    arr[3],
                    arr[4],
                    arr[5],
                    arr[6],
                    arr[7],
                    arr[8],
                    arr[9],
                    arr[10],
                    arr[11]
                );
                this.values[i].value = {
                    loc: t.origin.clone(),
                    rot: t.basis.get_quat(),
                    scale: t.basis.get_scale(),
                };
            }
        } else if (data.value_type === 'PackedTransform') {
            this.prop_type = PROP_TYPE_TRANSFORM;
            if (!this.update_mode) this.update_mode = UPDATE_CONTINUOUS;

            for (let i = 0; i < this.values.length; i++) {
                let arr = this.values[i].value;
                this.values[i].value = {
                    loc: new Vector3(arr[0], arr[1], arr[2]),
                    rot: new Quat().set(arr[3], arr[4], arr[5], arr[6]),
                    scale: new Vector3(arr[7], arr[8], arr[9]),
                };
            }
        } else {
            /* Guess value type of this track */

            let first_value = data.keys.values[0];
            switch (typeof first_value) {
                case 'number': {
                    this.prop_type = PROP_TYPE_NUMBER;
                } break;
                case 'boolean': {
                    this.prop_type = PROP_TYPE_BOOLEAN;
                } break;
                case 'string': {
                    this.prop_type = PROP_TYPE_STRING;
                } break;
                case 'object': {
                    if (first_value.class === 'ImageTexture') {
                        this.prop_type = PROP_TYPE_ANY;
                    } else if (first_value.x !== undefined && first_value.y !== undefined) {
                        this.prop_type = PROP_TYPE_VECTOR;
                    } else if (first_value.r !== undefined && first_value.g !== undefined && first_value.b !== undefined && first_value.a !== undefined) {
                        this.prop_type = PROP_TYPE_COLOR;
                    } else {
                        this.prop_type = PROP_TYPE_ANY;
                    }
                } break;
                default: {
                    this.prop_type = PROP_TYPE_ANY;
                } break;
            }
        }

        Transform.free(t);

        // Fix placeholder keys (Godot uses a placeholder key if it has same value of previous one)
        // Let's replace the placeholder key with same value of previous one, so it can be
        // easily animated without further more calculation and error check.
        let fixed = false;
        if (this.values.length > 0) {
            if (this.prop_type === PROP_TYPE_VECTOR) {
                for (let i = 1; i < this.values.length; i++) {
                    let value = this.values[i].value, previous = this.values[i - 1].value;
                    if (value === null) {
                        value = { x: 0, y: 0, z: 0 };
                    }

                    // Usually the placeholder key of vector will be `{ x: null }`
                    if (value.x === null) {
                        value.x = previous.x;
                        value.y = previous.y;
                        value.z = previous.z || 0;

                        fixed = true;
                    }
                }
            } else if (this.prop_type === PROP_TYPE_COLOR) {
                for (let i = 1; i < this.values.length; i++) {
                    let value = this.values[i].value, previous = this.values[i - 1].value;
                    if (value === null) {
                        value = { r: 0, g: 0, b: 0, a: 1 };
                    }

                    // Color is missing
                    if (value.r === null) {
                        value.r = previous.r;
                        value.g = previous.g;
                        value.b = previous.b;
                    }

                    // Alpha is missing
                    if (value.a === null) {
                        value.a = previous.a;
                    }
                }
            }
        }

        if (fixed) {
            console.log(`${this.prop_key}`, this.values)
        }

        return this;
    }
}

export class MethodTrack extends Track {
    constructor() {
        super();

        this.type = TRACK_TYPE_METHOD;

        /** @type Key<{method: string, args: Array<any>|undefined}>[] */
        this.methods = [];
    }
    load(data) {
        super.load(data);

        this.methods.length = 0;
        for (let i = 0; i < data.keys.times.length; i++) {
            /** @type {Key<{method: string, args: Array<any>|undefined}>} */
            let key = new Key();
            key.time = data.keys.times[i];
            key.value = data.keys.values[i];
            this.methods.push(key);
        }

        return this;
    }
}

export class BezierTrack extends Track {
    constructor() {
        super();

        this.type = TRACK_TYPE_BEZIER;

        /** @type Key<{in_handle: Vector2, out_handle: Vector2, value: number}>[] */
        this.values = [];
    }
}

export class AnimationTrack extends Track {
    constructor() {
        super();

        this.type = TRACK_TYPE_ANIMATION;

        /** @type Key<string>[] */
        this.values = [];
    }
    load(data) {
        super.load(data);

        this.values.length = 0;
        for (let i = 0; i < data.keys.times.length; i++) {
            /** @type {Key<string>} */
            let key = new Key;
            key.time = data.keys.times[i];
            key.value = data.keys.values[i];
            this.values.push(key);
        }

        return this;
    }
}

export class Animation {
    constructor() {
        this.name = '';

        this.length = 1;
        this.loop = false;
        this.step = 0.1;

        /** @type {Track[]} */
        this.tracks = null;
    }

    _load_data(data) {
        if (data.name !== undefined) {
            this.name = data.name;
        }
        if (data.length !== undefined) {
            this.length = data.length;
        }
        if (data.loop !== undefined) {
            this.loop = data.loop;
        }
        if (data.step !== undefined) {
            this.step = data.step;
        }

        this.tracks = data.tracks.map(track_data => {
            switch (track_data.type) {
                case 'value': return new ValueTrack().load(track_data);
                case 'transform': return new ValueTrack().load(track_data);
                case 'method': return new MethodTrack().load(track_data);
                case 'bezier': return new BezierTrack().load(track_data);
                case 'animation': return new AnimationTrack().load(track_data);
                default: return new Track();
            }
        });

        return this;
    }

    /**
     * Clear the animation (clear all tracks and reset all).
     */
    clear() {
        this.tracks.length = 0;
        this.loop = false;
        this.length = 1;
    }

    /**
     * @param {number} p_track
     * @param {number} p_time
     * @param {boolean} [p_exact]
     */
    track_find_key(p_track, p_time, p_exact = false) {
        let t = this.tracks[p_track];
        switch (t.type) {
            case TRACK_TYPE_VALUE:
            case TRACK_TYPE_TRANSFORM:
            case TRACK_TYPE_ANIMATION: {
                let vt = /** @type {ValueTrack} */(t);
                let k = this._find(vt.values, p_time);
                if (k < 0 || k >= vt.values.length) {
                    return -1;
                }
                if (vt.values[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            };
            case TRACK_TYPE_METHOD: {
                let mt = /** @type {MethodTrack} */(t);
                let k = this._find(mt.methods, p_time);
                if (k < 0 || k >= mt.methods.length) {
                    return -1;
                }
                if (mt.methods[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            };
        }
        return -1;
    }

    /**
     * @param {number} p_track
     * @param {number} p_key_idx
     */
    track_get_key_time(p_track, p_key_idx) {
        let t = this.tracks[p_track];
        switch (t.type) {
            case TRACK_TYPE_VALUE:
            case TRACK_TYPE_TRANSFORM:
            case TRACK_TYPE_ANIMATION: {
                return /** @type {ValueTrack} */(t).values[p_key_idx].time;
            };
            case TRACK_TYPE_METHOD: {
                return /** @type {MethodTrack} */(t).methods[p_key_idx].time;
            };
        }
        return -1;
    }

    /**
     * @param {number} p_track
     * @param {number} p_key
     */
    animation_track_get_key_animation(p_track, p_key) {
        let at = /** @type {AnimationTrack} */(this.tracks[p_track]);
        if (at.type != TRACK_TYPE_ANIMATION) return "";

        return at.values[p_key].value;
    }

    /**
     * @param {number} p_track
     * @param {number} p_time
     * @param {number} p_delta
     * @param {number[]} p_indices
     */
    track_get_key_indices_in_range(p_track, p_time, p_delta, p_indices) {
        let t = this.tracks[p_track];

        let from_time = p_time - p_delta;
        let to_time = p_time;

        if (from_time > to_time) {
            let t = from_time;
            from_time = to_time;
            to_time = t;
        }

        if (this.loop) {
            if (from_time > this.length || from_time < 0) {
                from_time = posmod(from_time, this.length);
            }
            if (to_time > this.length || to_time < 0) {
                to_time = posmod(to_time, this.length);
            }

            if (from_time > to_time) {
                switch (t.type) {
                    case TRACK_TYPE_VALUE:
                    case TRACK_TYPE_TRANSFORM:
                    case TRACK_TYPE_ANIMATION: {
                        let vt = /** @type {ValueTrack} */(t);
                        this._track_get_key_indices_in_range(vt.values, from_time, this.length, p_indices);
                        this._track_get_key_indices_in_range(vt.values, 0, to_time, p_indices);
                    } break;
                    case TRACK_TYPE_METHOD: {
                        let mt = /** @type {MethodTrack} */(t);
                        this._track_get_key_indices_in_range(mt.methods, from_time, this.length, p_indices);
                        this._track_get_key_indices_in_range(mt.methods, 0, to_time, p_indices);
                    } break;
                }
                return;
            } else {
                if (from_time < 0) {
                    from_time = 0;
                }
                if (from_time > this.length) {
                    from_time = this.length;
                }

                if (to_time < 0) {
                    to_time = 0;
                }
                if (to_time > this.length) {
                    to_time = this.length;
                }
            }

            switch (t.type) {
                case TRACK_TYPE_VALUE:
                case TRACK_TYPE_TRANSFORM:
                case TRACK_TYPE_ANIMATION: {
                    let vt = /** @type {ValueTrack} */(t);
                    this._track_get_key_indices_in_range(vt.values, from_time, to_time, p_indices);
                } break;
                case TRACK_TYPE_METHOD: {
                    let mt = /** @type {MethodTrack} */(t);
                    this._track_get_key_indices_in_range(mt.methods, from_time, to_time, p_indices);
                } break;
            }
        }
    }

    /**
     * @template T
     * @param {Key<T>[]} p_array
     * @param {number} from_time
     * @param {number} to_time
     * @param {number[]} p_indices
     */
    _track_get_key_indices_in_range(p_array, from_time, to_time, p_indices) {
        if (from_time != this.length && to_time == this.length) {
            to_time = this.length * 1.01;
        }

        let to = this._find(p_array, to_time);
        if (to >= 0 && p_array[to].time >= to_time) {
            to--;
        }
        if (to < 0) return;

        let from = this._find(p_array, from_time);
        if (from < 0 || p_array[from].time < from_time) {
            from++;
        }

        for (let i = from; i <= to; i++) {
            p_indices.push(i);
        }
    }

    /**
     * @template T
     * @param {Key<T>[]} p_keys
     * @param {number} p_time
     */
    _find(p_keys, p_time) {
        let len = p_keys.length;
        if (len == 0) return -2;

        let low = 0;
        let high = len - 1;
        let middle = 0;

        while (low <= high) {
            middle = Math.floor((low + high) / 2);

            if (is_equal_approx(p_time, p_keys[middle].time)) {
                return middle;
            } else if (p_time < p_keys[middle].time) {
                high = middle - 1;
            } else {
                low = middle + 1;
            }
        }

        if (p_keys[middle].time > p_time) {
            middle--;
        }

        return middle;
    }
}
res_class_map['Animation'] = Animation
