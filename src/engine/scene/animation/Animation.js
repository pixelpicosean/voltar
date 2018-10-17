/**
 * @enum {number}
 */
const TrackType = {
    TYPE_VALUE: 0,      // value
    TYPE_TRANSFORM: 1,  // transform a node or a bone
    TYPE_METHOD: 2,     // call any method on a specific node
    TYPE_BEZIER: 3,     // bezier curve
    TYPE_AUDIO: 4,
    TYPE_ANIMATION: 5,
};
/**
 * @enum {number}
 */
const InterpolationType = {
    INTERPOLATION_NEAREST: 0,
    INTERPOLATION_LINEAR: 1,
    INTERPOLATION_CUBIC: 2,
};
/**
 * @enum {number}
 */
const UpdateMode = {
    UPDATE_CONTINUOUS: 0,
    UPDATE_DISCRETE: 1,
    UPDATE_TRIGGER: 2,
    UPDATE_CAPTURE: 3,
};

class Track {
    constructor() {
        this.type = TrackType.TYPE_VALUE;
        this.interpolation = InterpolationType.INTERPOLATION_LINEAR;
        this.loop_wrap = true;
        this.path = '';
        this.imported = false;
        this.enabled = true;
    }
}

class Key {
    constructor() {
        this.transition = 1;
        this.time = 0;
        /**
         * @type {any}
         */
        this.value = undefined;
    }
}

class TransformKey extends Key {
    constructor() {
        super();

        this.loc = new Point();
        this.rot = 0;
        this.scale = new Point();
    }
}

class TransformTrack extends Track {
    constructor() {
        super();

        /** @type {TransformKey[]} */
        this.transforms = [];

        this.type = TrackType.TYPE_TRANSFORM;
    }
}
class ValueTrack extends Track {
    constructor() {
        super();

        this.type = TrackType.TYPE_VALUE;

        this.update_mode = UpdateMode.UPDATE_CONTINUOUS;
        this.update_on_seek = false;
        /** @type {Key[]} */
        this.values = [];
    }
}
class MethodTrack extends Track {
    constructor() {
        super();

        this.type = TrackType.TYPE_METHOD;
        /**
         * @type {Array<{method: string, params: Array}>}
         */
        this.methods = [];
    }
}

class BezierKey extends Key {
    constructor() {
        super();

        this.in_handle = new Point();
        this.out_handle = new Point();
        this.value = 0;
    }
}

class BezierTrack extends Track {
    constructor() {
        super();

        /** @type {Array<BezierKey>} */
        this.values = [];
    }
}

class AnimationTrack extends Track {
    constructor() {
        super();

        this.type = TrackType.TYPE_ANIMATION;

        /** @type {string[]} */
        this.values = [];
    }
}

class Animation {
    constructor() {
        // @private
        /**
         * @type {Track[]} track list
         */
        this.tracks = [];

        /**
         * Total length of this animation in seconds.
         * @type {number}
         */
        this.length = 0;
        /** @type {boolean} */
        this.loop = false;
        /**
         * Animation step value
         * @type {number}
         */
        this.step = 0;
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
            case TrackType.TYPE_TRANSFORM: {
                this.tracks.splice(p_at_pos, 0, new TransformTrack());
            } break;
            case TrackType.TYPE_VALUE: {
                this.tracks.splice(p_at_pos, 0, new ValueTrack());
            } break;
            case TrackType.TYPE_METHOD: {
                this.tracks.splice(p_at_pos, 0, new MethodTrack());
            } break;
            case TrackType.TYPE_BEZIER: {
                this.tracks.splice(p_at_pos, 0, new BezierTrack());
            } break;
            case TrackType.TYPE_ANIMATION: {
                this.tracks.splice(p_at_pos, 0, new AnimationTrack());
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

    clear() {
        this.tracks.length = 0;
        this.loop = false;
        this.length = 1;
    }

    optimize(p_allowed_linear_err = 0.05, p_allowed_angular_err = 0.01, p_max_optimizable_angle = Math.PI * 0.125) { }

    emit_changed() { }
}
Animation.TrackType = TrackType;
Animation.InterpolationType = InterpolationType;
Animation.UpdateMode = UpdateMode;
