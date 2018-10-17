import { Point, deg2rad } from 'engine/math/index';
import { Signal } from 'engine/dep/index';
import MessageQueue from 'engine/MessageQueue';
import Node2D from "./Node2D";

const CMP_EPSILON = 0.00001;

function ease(p_x, p_c) {
    if (p_x < 0)
        p_x = 0;
    else if (p_x > 1)
        p_x = 1;
    if (p_c > 0) {
        if (p_c < 1) {
            return 1 - Math.pow(1 - p_x, 1 / p_c);
        } else {
            return Math.pow(p_x, p_c);
        }
    } else if (p_c < 0) {
        //inout ease
        if (p_x < 0.5) {
            return Math.pow(p_x * 2, -p_c) * 0.5;
        } else {
            return (1 - Math.pow(1 - (p_x - 0.5) * 2, -p_c)) * 0.5 + 0.5;
        }
    } else
        return 0; // no ease (raw)
}
function posmod(p_x, p_y) {
    return (p_x >= 0) ? (p_x % p_y) : (p_y - (-p_x) % p_y);
}

function linear_interpolate_vector2(out, p_a, p_b, p_c) {
    out.x = p_a.x + (p_c * (p_b.x - p_a.x));
    out.y = p_a.y + (p_c * (p_b.y - p_a.y));
}
function cubic_interpolate_vector2(out, p_a, p_b, p_c) {

}
function cubic_interpolate_number(p_a, p_b, p_c) {

}

const TrackType = {
    TYPE_VALUE: 0,
    TYPE_METHOD: 2,
};
const InterpolationType = {
    INTERPOLATION_NEAREST: 0,
    INTERPOLATION_LINEAR: 1,
    INTERPOLATION_CUBIC: 2,
};
const UpdateMode = {
    UPDATE_CONTINUOUS: 0,
    UPDATE_DISCRETE: 1,
    UPDATE_TRIGGER: 2,
};

class Track {
    constructor() {
        this.type = TrackType.TYPE_VALUE;
        this.interpolation = InterpolationType.INTERPOLATION_LINEAR;
        this.path = '';
        this.loop_wrap = true;
        this.enabled = true;
    }
}

class Key {
    constructor() {
        this.transition = 1;
        this.time = 0;
        this.value = undefined;
    }
}

class ValueTrack extends Track {
    constructor() {
        super();

        this.type = TrackType.TYPE_VALUE;
        this.values = [];
        this.update_mode = UpdateMode.UPDATE_CONTINUOUS;
        this.update_on_seek = false;
    }
}
class MethodTrack extends Track {
    constructor() {
        super();

        this.type = TrackType.TYPE_METHOD;
        this.methods = [];
    }
}

class Animation {
    constructor() {
        // @private
        /**
         * @type {Track[]} track list
         */
        this.tracks = [];

        /** @type {number} */
        this.length = 0;
        /** @type {boolean} */
        this.loop = false;
    }

    // @private
    /**
     * @param {Array} p_keys
     */
    _clear(p_keys) {
        p_keys.length = 0;
    }
    /**
     * @param {number} p_time
     * @param {Array} p_keys
     * @param {any} p_value
     */
    _insert(p_time, p_keys, p_value) {
        let idx = p_keys.length;

        while (true) {
            if (idx === 0 || p_keys[idx - 1].time < p_time) {
                p_keys.splice(idx, 0, p_value);
                return idx;
            } else if (p_keys[idx - 1].time === p_time) {
                p_keys[idx - 1] = p_value;
                return idx - 1;
            }

            idx--;
        }
    }
    /**
     * @param {Array} keys
     * @param {number} p_time
     */
    _find(keys, p_time) {
        let len = keys.length;
        if (len === 0) {
            return -2;
        }

        let low = 0;
        let high = len - 1;
        let middle = 0;

        while (low <= high) {
            middle = (low + high) / 2;

            if (p_time === keys[middle].time) {
                return middle;
            } else if (p_time < keys[middle].time) {
                high = middle - 1;
            } else {
                low = middle + 1;
            }
        }

        if (keys[middle].time > p_time) {
            middle--;
        }

        return middle;
    }

    /**
     * @param {Point} out
     * @param {Point} p_a
     * @param {Point} p_b
     * @param {number} p_c
     */
    _interpolate_vector2(out, p_a, p_b, p_c) {
        linear_interpolate_vector2(out, p_a, p_b, p_c);
    }
    /**
     * @param {number} p_a
     * @param {number} p_b
     * @param {number} p_c
     * @returns {number}
     */
    _interpolate_number(p_a, p_b, p_c) {
        return p_a * (1 - p_c) + p_b * p_c;
    }

    _cubic_interpolate_vector2(out, p_pre_a, p_a, p_b, p_post_b, p_c) { }
    _cubic_interpolate_number(p_pre_a, p_a, p_b, p_post_b, p_c) { }

    /**
     * @param {Array} p_keys
     * @param {number} p_time
     * @param {number} p_interp
     * @param {boolean} p_loop_wrap
     */
    _interpolate_array(p_keys, p_time, p_interp, p_loop_wrap) {
        let len = this._find(p_keys, this.length) + 1; // try to find last key

        if (len <= 0) {
            return null;
        } else if (len === 1) {
            return p_keys[0].value;
        }

        let idx = this._find(p_keys, p_time);

        let result = true, next = 0, c = 0;

        if (this.loop && p_loop_wrap) {
            // loop
            if (idx >= 0) {
                if ((idx + 1) < len) {
                    next = idx + 1;
                    let delta = p_keys[next].time - p_keys[idx].time;
                    let from = p_time - p_keys[idx].time;

                    if (Math.abs(delta) > CMP_EPSILON) {
                        c = from / delta;
                    } else {
                        c = 0;
                    }
                } else {
                    next = 0;
                    let delta = (length - p_keys[idx].time) + p_keys[next].time;
                    let from = p_time - p_keys[idx].time;

                    if (Math.abs(delta) > CMP_EPSILON) {
                        c = from / delta;
                    } else {
                        c = 0;
                    }
                }
            } else {
                // on loop, behind first key
                idx = len - 1;
                next = 0;
                let endtime = (length - p_keys[idx].time);
                if (endtime < 0) // may be keys past the end
                    endtime = 0;
                let delta = endtime + p_keys[next].time;
                let from = endtime + p_time;

                if (Math.abs(delta) > CMP_EPSILON)
                    c = from / delta;
                else
                    c = 0;
            }
        } else { // no loop
            if (idx >= 0) {
                if ((idx + 1) < len) {
                    next = idx + 1;
                    let delta = p_keys[next].time - p_keys[idx].time;
                    let from = p_time - p_keys[idx].time;

                    if (Math.abs(delta) > CMP_EPSILON)
                        c = from / delta;
                    else
                        c = 0;
                } else {
                    next = idx;
                }
            } else if (idx < 0) {
                // only allow extending first key to anim start if looping
                if (this.loop)
                    idx = next = 0;
                else
                    result = false;
            }
        }

        if (!result) {
            return null;
        }

        let tr = p_keys[idx].transition;

        if (tr === 0 || idx === next) {
            // don't interpolate if not needed
            return p_keys[idx].value;
        }

        if (tr !== 1) {
            c = ease(c, tr);
        }

        switch (p_interp) {
            case InterpolationType.INTERPOLATION_NEAREST: {
                return p_keys[idx].value;
            } break;
            case InterpolationType.INTERPOLATION_LINEAR: {
                return _interpolate(p_keys[idx].value, p_keys[next].value, c);
            } break;
            case InterpolationType.INTERPOLATION_CUBIC: {
                let pre = idx - 1;
                if (pre < 0)
                    pre = 0;
                let post = next + 1;
                if (post >= len)
                    post = next;

                return _cubic_interpolate(p_keys[pre].value, p_keys[idx].value, p_keys[next].value, p_keys[post].value, c);
            } break;
            default: return p_keys[idx].value;
        }

        // do a barrel roll
    }

    _value_track_get_key_indices_in_range(vt, from_time, to_time, p_indices) {
        if (from_time !== length && to_time === length)
            to_time = length * 1.01; //include a little more if at the end
        let to = this._find(vt.values, to_time);

        // can't really send the events == time, will be sent in the next frame.
        // if event>=len then it will probably never be requested by the anim player.

        if (to >= 0 && vt.values[to].time >= to_time)
            to--;

        if (to < 0)
            return; // not bother

        let from = this._find(vt.values, from_time);

        // position in the right first event.+
        if (from < 0 || vt.values[from].time < from_time)
            from++;

        let max = vt.values.length;

        for (let i = from; i <= to; i++) {
            p_indices.push(i);
        }
    }
    _method_track_get_key_indices_in_range(mt, from_time, to_time, p_indices) {
        if (from_time !== length && to_time === length)
            to_time = length * 1.01; //include a little more if at the end

        let to = this._find(mt.methods, to_time);

        // can't really send the events == time, will be sent in the next frame.
        // if event>=len then it will probably never be requested by the anim player.

        if (to >= 0 && mt.methods[to].time >= to_time)
            to--;

        if (to < 0)
            return; // not bother

        let from = this._find(mt.methods, from_time);

        // position in the right first event.+
        if (from < 0 || mt.methods[from].time < from_time)
            from++;

        let max = mt.methods.length;

        for (let i = from; i <= to; i++) {
            p_indices.push(i);
        }
    }

    // @public
    add_track(p_type, p_at_pos = -1) {
        if (p_at_pos < 0 || p_at_pos >= this.tracks.length) {
            p_at_pos = this.tracks.length;
        }

        switch (p_type) {
            case TrackType.TYPE_VALUE: {
                this.tracks.splice(p_at_pos, 0, new ValueTrack());
            } break;
            case TrackType.TYPE_METHOD: {
                this.tracks.splice(p_at_pos, 0, new MethodTrack());
            } break;
            default: {
                console.log('Unknown track type');
            }
        }
        this.emit_changed();
        return p_at_pos;
    }
    remove_track(p_track) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                this._clear(t.values);
            } break;
            case TrackType.TYPE_METHOD: {
                this._clear(t.methods);
            } break;
        }

        this.tracks.splice(p_track, 1);
        this.emit_changed();
    }

    get_track_count() {
        return this.tracks.length;
    }
    track_get_type(p_track) {
        return this.tracks[p_track].type;
    }

    /**
     * @param {number} p_track
     * @param {string} p_path
     */
    track_set_path(p_track, p_path) {
        this.tracks[p_track].path = p_path;
        this.emit_changed();
    }
    /**
     * @param {number} p_track
     */
    track_get_path(p_track) {
        return this.tracks[p_track].path;
    }
    find_track(p_path) {
        for (let i = 0; i < this.tracks.length; i++) {
            if (this.tracks[i].path = p_path) {
                return i;
            }
        }
        return -1;
    }

    /**
     * @param {number} p_track
     */
    track_move_up(p_track) {
        let tmp;
        if (p_track >= 0 && p_track < (this.tracks.length - 1)) {
            tmp = this.tracks[p_track];
            this.tracks[p_track] = this.tracks[p_track + 1];
            this.tracks[p_track + 1] = tmp;
        }
        this.emit_changed();
    }
    /**
     * @param {number} p_track
     */
    track_move_down(p_track) {
        let tmp;
        if (p_track > 0 && p_track < this.tracks.length) {
            tmp = this.tracks[p_track];
            this.tracks[p_track] = this.tracks[p_track - 1];
            this.tracks[p_track + 1] = tmp;
        }
        this.emit_changed();
    }

    /**
     * @param {number} p_track
     * @param {boolean} p_enabled
     */
    track_set_enabled(p_track, p_enabled) {
        this.tracks[p_track].enabled = p_enabled;
        this.emit_changed();
    }
    /**
     * @param {number} p_track
     */
    track_is_enabled(p_track) {
        return this.tracks[p_track].enabled;
    }

    track_insert_key(p_track, p_time, p_key, p_transition = 1) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                let k = {
                    time: p_time,
                    transition: p_transition,
                    value: p_key,
                };
                this._insert(p_time, t.values, k);
            } break;
            case TrackType.TYPE_METHOD: {
                let k = {
                    time: p_time,
                    transition: p_transition,
                    method: p_key.method,
                    params: p_key.args,
                };
                this._insert(p_time, t.methods, k);
            } break;
        }

        this.emit_changed();
    }
    track_set_key_transition(p_track, p_key_idx, p_transition) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                t.values[p_key_idx].transition = p_transition;
            } break;
            case TrackType.TYPE_METHOD: {
                t.methods[p_key_idx].transition = p_transition;
            } break;
        }
    }
    track_set_key_value(p_track, p_key_idx, p_value) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                t.values[p_key_idx].value = p_value;
            } break;
            case TrackType.TYPE_METHOD: {
                if (p_value.hasOwnProperty('method')) t.methods[p_key_idx].method = p_value.method;
                if (p_value.hasOwnProperty('args')) t.methods[p_key_idx].params = p_value.args;
            } break;
        }
    }
    track_find_key(p_track, p_time, p_exact = false) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                let k = this._find(t.values, p_time);
                if (k < 0 || k >= t.values.length) {
                    return -1;
                }
                if (t.values[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            } break;
            case TrackType.TYPE_METHOD: {
                let k = this._find(t.methods, p_time);
                if (k < 0 || k >= t.methods.length) {
                    return -1;
                }
                if (t.methods[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            } break;
        }

        return -1;
    }
    track_remove_key(p_track, p_idx) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                t.values.splice(p_idx, 1);
            } break;
            case TrackType.TYPE_METHOD: {
                t.methods.splice(p_idx, 1);
            } break;
        }

        this.emit_changed();
    }
    track_remove_key_at_position(p_track, p_pos) {
        let idx = this.track_find_key(p_track, p_pos, true);
        if (idx < 0) {
            console.log('Index short than zero');
            return;
        }
        this.track_remove_key(p_track, idx);
    }
    track_get_key_count(p_track) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                return t.values.length;
            } break;
            case TrackType.TYPE_METHOD: {
                return t.methods.length;
            } break;
        }

        return -1;
    }
    track_get_key_value(p_track, p_key_idx) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                return t.values[p_key_idx].value;
            } break;
            case TrackType.TYPE_METHOD: {
                let k = t.methods[p_key_idx];
                return {
                    method: k.method,
                    args: k.params,
                };
            } break;
        }

        return null;
    }
    track_get_key_time(p_track, p_key_idx) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                return t.values[p_key_idx].time;
            } break;
            case TrackType.TYPE_METHOD: {
                return t.methods[p_key_idx].time;
            } break;
        }

        return -1;
    }
    track_get_key_transition(p_track, p_key_idx) {
        const t = this.tracks[p_track];

        switch (t.type) {
            case TrackType.TYPE_VALUE: {
                return t.values[p_key_idx].transition;
            } break;
            case TrackType.TYPE_METHOD: {
                return t.methods[p_key_idx].transition;
            } break;
        }

        return -1;
    }

    track_set_interpolation_type(p_track, p_interp) {
        this.tracks[p_track].interpolation = p_interp;
        this.emit_changed();
    }
    track_get_interpolation_type(p_track) {
        return this.tracks[p_track].interpolation;
    }

    track_set_interpolation_loop_wrap(p_track, p_enable) {
        this.tracks[p_track].loop_wrap = p_enable;
        this.emit_changed();
    }
    track_get_interpolation_loop_wrap(p_track) {
        return this.tracks[p_track].loop_wrap;
    }

    value_track_interpolate(p_track, p_time) {
        let vt = this.tracks[p_track];
        let ok = false;
        let res = this._interpolate_array(vt.values, p_time, vt.update_mode === UpdateMode.UPDATE_CONTINUOUS ? vt.interpolation : UpdateMode.INTERPOLATION_NEAREST, vt.loop_wrap);
        if (res !== null) {
            return res;
        }

        return null;
    }
    value_track_get_key_indices(p_track, p_time, p_delta, p_indices) {
        let vt = this.tracks[p_track];

        let from_time = p_time - p_delta;
        let to_time = p_time;

        if (from_time > to_time) {
            let tmp = from_time;
            from_time = to_time;
            to_time = tmp;
        }

        if (this.loop) {
            from_time = posmod(from_time, length);
            to_time = posmod(to_time, length);

            if (from_time > to_time) {
                // handle loop by splitting
                this._value_track_get_key_indices_in_range(vt, length - from_time, length, p_indices);
                this._value_track_get_key_indices_in_range(vt, 0, to_time, p_indices);
                return;
            }
        } else {
            if (from_time < 0)
                from_time = 0;
            if (from_time > length)
                from_time = length;

            if (to_time < 0)
                to_time = 0;
            if (to_time > length)
                to_time = length;
        }

        this._value_track_get_key_indices_in_range(vt, from_time, to_time, p_indices);
    }
    value_track_set_update_mode(p_track, p_mode) {
        let vt = this.tracks[p_track];
        vt.update_mode = p_mode;
    }
    value_track_get_update_mode(p_track) {
        return this.tracks[p_track].update_mode;
    }

    method_track_get_key_indices(p_track, p_time, p_delta, p_indices) {
        let mt = this.tracks[p_track];

        let from_time = p_time - p_delta;
        let to_time = p_time;

        if (from_time > to_time) {
            let tmp = from_time;
            from_time = to_time;
            to_time = tmp;
        }

        if (this.loop) {
            if (from_time > length || from_time < 0)
                from_time = posmod(from_time, length);

            if (to_time > length || to_time < 0)
                to_time = posmod(to_time, length);

            if (from_time > to_time) {
                // handle loop by splitting
                this._method_track_get_key_indices_in_range(mt, from_time, length, p_indices);
                this._method_track_get_key_indices_in_range(mt, 0, to_time, p_indices);
                return;
            }
        } else {
            if (from_time < 0)
                from_time = 0;
            if (from_time > length)
                from_time = length;

            if (to_time < 0)
                to_time = 0;
            if (to_time > length)
                to_time = length;
        }

        this._method_track_get_key_indices_in_range(mt, from_time, to_time, p_indices);
    }
    method_track_get_params(p_track, p_key_idx) {
        let pm = this.tracks[p_track];
        return pm.methods[p_key_idx].params;
    }
    method_track_get_name(p_track, p_key_idx) {
        let pm = this.tracks[p_track];
        return pm.methods[p_key_idx].method;
    }

    copy_track(p_track, p_to_animation) {
        let dst_track = p_to_animation.get_track_count();
        p_to_animation.add_track(this.track_get_type(src_track));

        p_to_animation.track_set_path(dst_track, this.track_get_path(src_track));
        p_to_animation.track_set_enabled(dst_track, this.track_is_enabled(src_track));
        p_to_animation.track_set_interpolation_type(dst_track, this.track_get_interpolation_type(src_track));
        p_to_animation.track_set_interpolation_loop_wrap(dst_track, this.track_get_interpolation_loop_wrap(src_track));
        for (let i = 0; i < this.track_get_key_count(src_track); i++) {
            p_to_animation.track_insert_key(dst_track, this.track_get_key_time(src_track, i), this.track_get_key_value(src_track, i), this.track_get_key_transition(src_track, i));
        }
    }

    set_length(p_length) {
        this.length = p_length;
        this.emit_changed();
    }
    get_length() {
        return this.length;
    }

    set_loop(p_enabled) {
        this.loop = p_enabled;
        this.emit_changed();
    }
    get_loop() {
        return this.loop;
    }

    clear() { }

    optimize(p_allowed_linear_err = 0.05, p_allowed_angular_err = 0.01, p_max_optimizable_angle = Math.PI * 0.125) { }

    emit_changed() { }
}
Animation.TrackType = TrackType;
Animation.InterpolationType = InterpolationType;
Animation.UpdateMode = UpdateMode;


const NODE_CACHE_UPDATE_MAX = 1024;
const BLEND_FROM_MAX = 3;
const SpecialProperty = {
    SP_NONE: 0,
    SP_NODE2D_POS: 1,
    SP_NODE2D_ROT: 2,
    SP_NODE2D_SCALE: 3,
};
class PropertyAnim {
    constructor() {
        this.owner = null;
        this.special = null;
        /** @type {string[]} */
        this.subpath = [];
        this.object = null;
        this.value_accum = null;
        this.accum_pass = 0;
    }
}
class TrackNodeCache {
    constructor() {
        this.path = '';
        this.id = 0;
        this.resource = null;
        this.node = null;
        this.node_2d = null;
        this.bone_idx = -1;

        this.accum_pass = 0;

        /** @type {{[k:string]: PropertyAnim}} */
        this.property_anim = {};
    }
};
class TrackNodeCacheKey {
    constructor() {
        this.id = 0;
        this.bone_idx = 0;
    }
    /**
     * Whether this key is smaller than the other
     * @param {TrackNodeCacheKey} p_right
     */
    compare(p_right) {
        if (this.id < p_right.id) {
            return true;
        } if (this.id > p_right.id) {
            return false;
        } else {
            return this.bone_idx < p_right.bone_idx;
        }
    }
}
class AnimationData {
    constructor() {
        this.name = '';
        this.next = '';
        /** @type {TrackNodeCache[]} */
        this.node_cache = [];
        /** @type {Animation} */
        this.animation = null;
    }
}
class BlendKey {
    constructor() {
        this.from = '';
        this.to = '';
    }
    /**
     * @param {BlendKey} bk
     */
    compare(bk) {
        return (this.from === bk.from) ? this.to.length < bk.to.length : this.from.length < bk.from.length;
    }
}
class PlaybackData {
    constructor() {
        /** @type {AnimationData} */
        this.from = null;
        this.pos = 0;
        this.speed_scale = 1;
    }
}
class Blend {
    constructor() {
        /** @type {PlaybackData} */
        this.data = null;
        this.blend_time = 0;
        this.blend_left = 0;
    }
}
class Playback {
    constructor() {
        /** @type {Blend[]} */
        this.blend = [];
        /** @type {PlaybackData} */
        this.current = new PlaybackData();
        this.assigned = '';
    }
}

export default class AnimationPlayer extends Node2D {
    get root_node() {
        return this._root_node;
    }
    set root_node(path) {
        this._root_node = this.get_node(path);
    }

    constructor() {
        super();

        this.animation_changed = new Signal();

        /** @type {Map<TrackNodeCacheKey, TrackNodeCache>} */
        this.node_cache_map = new Map();

        /** @type {TrackNodeCache[]} */
        this.cache_update = new Array(NODE_CACHE_UPDATE_MAX);
        this.cache_update_size = 0;
        /** @type {PropertyAnim[]} */
        this.cache_update_prop = new Array(NODE_CACHE_UPDATE_MAX);
        this.cache_update_prop_size = 0;
        /** @type {Map<Animation, number>} */
        this.used_anims = new Map();

        this.accum_pass = 0;
        this.speed_scale = 1;
        this.default_blend_time = 0;

        /** @type {{[k:string]: AnimationData}} */
        this.animation_set = {};
        /** @type {Map<BlendKey, number>} */
        this.blend_times = new Map();

        this.playback = new Playback();

        /** @type {string[]} */
        this.queued = [];

        this.end_reached = false;
        this.end_notify = false;

        this.autoplay = '';
        this.processing = false;
        this.active = false;

        this.root = '';

        this.playing = false;
    }
    _load_data(data) {
        for (let k in data) {
            switch (k) {
                case 'name':
                case 'root_node': {
                    this[k] = data[k];
                } break;
            }
        }
    }

    /**
     * @param {Animation} p_animation
     * @returns {string}
     */
    find_animation(p_animation) { }

    /**
     * @param {string} p_name
     * @param {Animation} p_animation
     * @returns {boolean}
     */
    add_animation(p_name, p_animation) { }
    /**
     * @param {string} p_name
     */
    remove_animation(p_name) { }
    /**
     * @param {string} p_name
     * @param {string} p_new_name
     */
    rename_animation(p_name, p_new_name) { }
    /**
     * @param {string} p_name
     */
    has_animation(p_name) { }
    /**
     * @param {string} p_name
     * @returns {Animation}
     */
    get_animation(p_name) { }
    /**
     * @param {string[]} p_animations
     */
    get_animation_list(p_animations) { }

    /**
     * @param {string} p_animation1
     * @param {string} p_animation2
     * @param {number} p_time
     */
    set_blend_time(p_animation1, p_animation2, p_time) { }
    /**
     * @param {string} p_animation1
     * @param {string} p_animation2
     * @returns {number}
     */
    get_blend_time(p_animation1, p_animation2) { }

    /**
     * @param {string} p_animation
     * @param {string} p_next
     */
    animation_set_next(p_animation, p_next) { }
    /**
     * @param {string} p_animation
     * @returns {string}
     */
    animation_get_next(p_animation) { }

    /**
     * @param {number} p_default
     */
    set_default_blend_time(p_default) { }
    /**
     * @returns {number}
     */
    get_default_blend_time() { }

    /**
     * @param {string} [p_name]
     * @param {number} [p_custom_blend]
     * @param {number} [p_custom_scale]
     * @param {boolean} [p_from_end]
     */
    play(p_name = '', p_custom_blend = -1, p_custom_scale = 1.0, p_from_end = false) { }
    /**
     * @param {string} p_name
     * @param {number} p_custom_blend
     */
    play_backwards(p_name = '', p_custom_blend = -1) { }
    /**
     * @param {string} p_name
     */
    queue(p_name) { }
    clear_queue() { }
    /**
     * @param {boolean} [p_reset]
     */
    stop(p_reset = true) { }
    /**
     * @returns {boolean}
     */
    is_playing() { }
    /**
     * @returns {string}
     */
    get_current_animation() { }
    /**
     * @param {string} p_anim
     */
    set_current_animation(p_anim) { }
    /**
     * @returns {string}
     */
    get_assigned_animation() { }
    /**
     * @param {string} p_anim
     */
    set_assigned_animation(p_anim) { }
    stop_all() { }
    /**
     * @param {boolean} p_active
     */
    set_active(p_active) { }
    /**
     * @returns {boolean}
     */
    is_active() { }
    /**
     * @returns {boolean}
     */
    is_valid() { }

    /**
     * @param {number} p_speed
     */
    set_speed_scale(p_speed) { }
    /**
     * @returns {string}
     */
    get_speed_scale() { }

    /**
     * @param {string} p_name
     */
    set_autoplay(p_name) { }
    /**
     * @returns {string}
     */
    get_autoplay() { }

    /**
     * @param {number} p_time
     * @param {boolean} [p_update]
     */
    seek(p_time, p_update = false) { }
    /**
     * @param {number} p_time
     * @param {number} p_delta
     */
    seek_delta(p_time, p_delta) { }
    /**
     * @returns {number}
     */
    get_current_animation_position() { }
    /**
     * @returns {number}
     */
    get_current_animation_length() { }

    /**
     * @param {number} p_time
     */
    advance(p_time) {
        this._animation_process(p_time);
    }

    /**
     * @param {string} p_root
     */
    set_root(p_root) { }
    /**
     * @returns {string}
     */
    get_root() { }

    /**
     * Must be called by hand if an animation was modified after added
     */
    clear_caches() { }

    /**
     * @param {string} p_function
     * @param {number} p_idx
     * @param {string[]} r_options
     */
    get_argument_options(p_function, p_idx, r_options) { }

    /**
     * @param {AnimationData} p_anim
     * @param {number} p_time
     * @param {number} p_delta
     * @param {number} p_interp
     * @param {boolean} [p_allow_discrete]
     */
    _animation_process_animation(p_anim, p_time, p_delta, p_interp, p_allow_discrete = true) {
        this._ensure_node_caches(p_anim);

        let a = p_anim.animation;
        let can_call = this.is_inside_tree;

        for (let i = 0; i < a.get_track_count(); i++) {
            let nc = p_anim.node_cache[i];

            if (!a.track_is_enabled(i)) {
                continue; // do nothing if the track is disabled
            }

            if (a.track_get_key_count(i) === 0) {
                continue; // do nothing if the track is empty
            }

            switch (a.track_get_type(i)) {
                case TrackType.TYPE_VALUE: {
                    if (!nc.node) {
                        continue;
                    }

                    // TODO: fix the anim searching
                    let pa = nc.property_anim[a.track_get_path(i)];

                    if (a.value_track_get_update_mode(i) === UpdateMode.UPDATE_CONTINUOUS || (p_delta === 0 && a.value_track_get_update_mode(i) === UpdateMode.UPDATE_DISCRETE)) {
                        let value = a.value_track_interpolate(i, p_time);

                        if (value === null) {
                            continue;
                        }

                        if (pa.accum_pass !== this.accum_pass) {
                            this.cache_update_prop[this.cache_update_prop_size++] = pa;
                            pa.value_accum = value;
                            pa.accum_pass = this.accum_pass;
                        } else {
                            // TODO: interpolate the value
                        }
                    } else if (p_allow_discrete && p_delta !== 0) {
                        let indices = [];
                        a.value_track_get_key_indices(i, p_time, p_delta, indices);

                        for (let f of indices) {
                            let value = a.track_get_key_value(i, f);
                            switch (pa.special) {
                                case SpecialProperty.SP_NONE: {
                                    // TODO: not special
                                } break;
                                case SpecialProperty.SP_NODE2D_POS: {
                                    pa.object.position.copy(value);
                                } break;
                                case SpecialProperty.SP_NODE2D_ROT: {
                                    pa.object.rotation = deg2rad(value);
                                } break;
                                case SpecialProperty.SP_NODE2D_SCALE: {
                                    pa.object.scale.copy(value);
                                } break;
                            }
                        }
                    }
                }
                case TrackType.TYPE_METHOD: {
                    if (!nc.node) {
                        continue;
                    }
                    if (p_delta === 0) {
                        continue;
                    }
                    if (!p_allow_discrete) {
                        break;
                    }

                    let indices = [];

                    a.method_track_get_key_indices(i, p_time, p_delta, indices);

                    for (let e of indices) {
                        let method = a.method_track_get_name(i, e);
                        let params = a.method_track_get_params(i, e);

                        let s = params.length;
                        if (can_call) {
                            MessageQueue.get_singleton().push_call(nc.node, method, params);
                        }
                    }
                } break;
            }
        }
    }

    /**
     * @param {AnimationData} p_anim
     */
    _ensure_node_caches(p_anim) {
        // Already cached?
        if (p_anim.node_cache.length === p_anim.animation.get_track_count()) {
            return;
        }

        let parent = this.get_node(this.root);

        let a = p_anim.animation;

        p_anim.node_cache.length = a.get_track_count();

        for (let i = 0; i < a.get_track_count(); i++) {
            // Cache related nodes
        }
    }
    /**
     * @param {PlaybackData} cd
     * @param {number} p_delta
     * @param {number} p_blend
     */
    _animation_process_data(cd, p_delta, p_blend) {
        let delta = p_delta * this.speed_scale * cd.speed_scale;
        let backwards = delta < 0;
        let next_pos = cd.pos + delta;

        let len = cd.from.animation.get_length();
        let loop = cd.from.animation.loop;

        if (!loop) {
            if (next_pos < 0) {
                next_pos = 0;
            } else if (next_pos > len) {
                next_pos = len;
            }

            // fix delta
            delta = next_pos - cd.pos;

            if (cd === this.playback.current) {
                if (!backwards && cd.pos <= len && next_pos === len) {
                    // playback finished
                    this.end_reached = true;
                    this.end_notify = cd.pos < len; // Notify only if not already at the end
                }

                if (backwards && cd.pos >= 0 && next_pos === 0) {
                    // playback finished
                    this.end_reached = true;
                    this.end_notify = cd.pos > 0; // Notify only if not already at the beginning
                }
            }
        } else {
            let looped_next_pos = posmod(next_pos, len);
            if (looped_next_pos === 0 && next_pos !== 0) {
                next_pos = len;
            } else {
                next_pos = looped_next_pos;
            }
        }

        cd.pos = next_pos;

        this._animation_process_animation(cd.from, cd.pos, delta, p_blend, cd === this.playback.current);
    }
    /**
     * @param {number} p_delta
     */
    _animation_process2(p_delta) {
        let c = this.playback;

        this.accum_pass++;

        this._animation_process_data(c.current, p_delta, 1);

        let prev = null;
        for (let i = c.blend.length - 1; i >= 0; i--) {
            let b = c.blend[i];
            let blend = b.blend_left / b.blend_time;
            this._animation_process_data(b.data, p_delta, blend);

            b.blend_left -= Math.abs(this.speed_scale * p_delta);

            if (b.blend_left < 0) {
                c.blend.splice(i, 1);
            }
        }
    }
    _animation_update_transforms() {
        for (let i = 0; i < this.cache_update_prop_size; i++) {
            let pa = this.cache_update_prop[i];

            switch (pa.special) {
                case SpecialProperty.SP_NONE: {
                    // TODO:
                } break;
                case SpecialProperty.SP_NODE2D_POS: {
                    pa.object.position.copy(pa.value_accum);
                } break;
                case SpecialProperty.SP_NODE2D_ROT: {
                    pa.object.rotation = deg2rad(pa.value_accum);
                } break;
                case SpecialProperty.SP_NODE2D_SCALE: {
                    pa.object.scale.copy(pa.value_accum);
                } break;
            }
        }
        this.cache_update_prop_size = 0;
    }
    /**
     * @param {number} p_delta
     */
    _animation_process(p_delta) {
        if (this.playback.current.from) {
            this.end_reached = false;
            this.end_notify = false;
            this._animation_process2(p_delta);
            this._animation_update_transforms();
            if (this.end_reached) {
                if (this.queued.length > 0) {
                    let old = this.playback.assigned;
                    this.play(this.queued.shift());
                    let new_name = this.playback.assigned;
                    if (this.end_notify) {
                        this.animation_changed.dispatch(old, new_name);
                    }
                } else {
                    this.playing = false;
                    this._set_process(false);
                    if (this.end_notify) {
                        this.animation_changed.dispatch(this.playback.assigned);
                    }
                }
                this.end_reached = false;
            }
        } else {
            this._set_process(false);
        }
    }

    /**
     * @param {Node2D} p_node
     */
    _node_removed(p_node) { }

    _animation_changed() { }
    /**
     * @param {Animation} p_anim
     */
    _ref_anim(p_anim) { }
    /**
     * @param {Animation} p_anim
     */
    _unref_anim(p_anim) { }

    /**
     * @param {boolean} p_process
     * @param {boolean} [p_force]
     */
    _set_process(p_process, p_force = false) { }
}
