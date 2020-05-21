import { Vector2 } from "engine/core/math/vector2";
import { res_class_map } from "engine/registry";


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
export const PROP_TYPE_ANY = 5;

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

        // Guess value type of this track
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

    // We don't provide more methods since they are not useful,
    // so we can save some bytes here.
}
res_class_map['Animation'] = Animation
