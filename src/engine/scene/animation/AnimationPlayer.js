import Node2D from "../Node2D";

import { node_class_map } from 'engine/registry';

import Animation, { TrackType, UpdateMode, Key, ValueTrack, InterpolationType, PropType, MethodTrack } from './Animation';

function posmod(p_x, p_y) {
    return (p_x >= 0) ? (p_x % p_y) : (p_y - (-p_x) % p_y);
}

function ease(x, c) {
    if (x < 0)
        x = 0;
    else if (x > 1.0)
        x = 1.0;
    if (c > 0) {
        if (c < 1.0) {
            return 1.0 - Math.pow(1.0 - x, 1.0 / c);
        } else {
            return Math.pow(x, c);
        }
    } else if (c < 0) {
        //inout ease
        if (x < 0.5) {
            return Math.pow(x * 2.0, -c) * 0.5;
        } else {
            return (1.0 - Math.pow(1.0 - (x - 0.5) * 2.0, -c)) * 0.5 + 0.5;
        }
    } else
        return 0; // no ease (raw)
}

const CMP_EPSILON = 0.00001;

/**
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
function equals(a, b) {
    return Math.abs(a - b) < CMP_EPSILON;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @returns {number}
 */
function interpolate_number(a, b, c) {
    return a * (1.0 - c) + b * c;
}
/**
 * @param {number} pre_a
 * @param {number} a
 * @param {number} b
 * @param {number} post_b
 * @param {number} c
 * @returns {number}
 */
function cubic_interpolate_number(pre_a, a, b, post_b, c) {
    return interpolate_number(a, b, c);
}

/**
 * @template T
 * @param {Key<T>[]} keys
 * @param {number} time
 */
function find_track_key(keys, time) {
    let len = keys.length;
    if (len === 0) {
        return -2;
    }

    let low = 0, high = len - 1, middle = 0;

    while (low <= high) {
        middle = Math.floor((low + high) / 2);

        if (equals(time, keys[middle].time)) {
            return middle;
        } else if (time < keys[middle].time) {
            high = middle - 1;
        } else {
            low = middle + 1;
        }
    }

    if (keys[middle].time > time) {
        middle -= 1;
    }

    return middle;
}
function anim_path_without_prop(path) {
    return path.split(':')[0];
}
function anim_prop(path) {
    return path.split(':')[1];
}
/**
 * @param {Node2D} node
 * @param {PropType} type
 * @param {string} key
 * @param {any} value
 */
function apply_immediate_value(node, type, key, value) {
    switch (type) {
        case PropType.NUMBER:
        case PropType.BOOLEAN:
        case PropType.STRING: {
            node[key] = value;
        } break;
        case PropType.VECTOR: {
            node[key].x = value.x;
            node[key].y = value.y;
        } break;
        case PropType.COLOR: {
            node[key].r = value.r;
            node[key].g = value.g;
            node[key].b = value.b;
            node[key].a = value.a;
        } break;
        case PropType.ANY: {
            node._set_value(key, value);
        } break;
    }
}
/**
 * @param {Node2D} node
 * @param {PropType} type
 * @param {string} key
 * @param {any} value_a
 * @param {any} value_b
 * @param {number} c
 */
function apply_interpolate_value(node, type, key, value_a, value_b, c) {
    switch (type) {
        case PropType.NUMBER: {
            node[key] = interpolate_number(value_a, value_b, c);
        } break;
        case PropType.BOOLEAN: {
            node[key] = value_a;
        } break;
        case PropType.STRING: {
            // TODO: animating a text?
            node[key] = value_a;
        } break;
        case PropType.VECTOR: {
            node[key].x = interpolate_number(value_a.x, value_b.x, c);
            node[key].y = interpolate_number(value_a.y, value_b.y, c);
        } break;
        case PropType.COLOR: {
            node[key].r = interpolate_number(value_a.r, value_b.r, c);
            node[key].g = interpolate_number(value_a.g, value_b.g, c);
            node[key].b = interpolate_number(value_a.b, value_b.b, c);
            node[key].a = interpolate_number(value_a.a, value_b.a, c);
        } break;
        case PropType.ANY: {
            node._set_lerp_value(key, value_a, value_b, c);
        } break;
    }
}
/**
 * @param {Node2D} node
 * @param {Animation} anim
 * @param {ValueTrack} track
 * @param {number} time
 * @param {number} interp
 * @param {boolean} loop_wrap
 */
function interpolate_track_on_node(node, anim, track, time, interp, loop_wrap) {
    let keys = track.values;
    let len = find_track_key(keys, anim.length) + 1;

    if (len <= 0) {
        return;
    } else if (len === 1) {
        apply_immediate_value(node, track.prop_type, track.prop_key, keys[0].value);
    }

    let idx = find_track_key(keys, time);

    if (idx === -2) {
        return;
    }

    let result = true;
    let next = 0;
    let c = 0;

    if (anim.loop && loop_wrap) {
        // loop
        if (idx >= 0) {
            if ((idx + 1) < len) {
                next = idx + 1;
                let delta = keys[next].time - keys[idx].time;
                let from = time - keys[idx].time;

                if (Math.abs(delta) > CMP_EPSILON) {
                    c = from / delta;
                } else {
                    c = 0;
                }
            } else {
                next = 0;
                let delta = (anim.length - keys[idx].time) + keys[next].time;
                let from = time - keys[idx].time;

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
            let endtime = (anim.length - keys[idx].time);
            if (endtime < 0) {
                endtime = 0;
            }
            let delta = endtime + keys[next].time;
            let from = endtime + time;

            if (Math.abs(delta) > CMP_EPSILON) {
                c = from / delta;
            } else {
                c = 0;
            }
        }
    } else { // no loop
        if (idx >= 0) {
            if ((idx + 1) < len) {
                next = idx + 1;
                let delta = keys[next].time - keys[idx].time;
                let from = time - keys[idx].time;

                if (Math.abs(delta) > CMP_EPSILON) {
                    c = from / delta;
                } else {
                    c = 0;
                }
            } else {
                next = idx;
            }
        } else if (idx < 0) {
            // only allow extending first key to anim start if looping
            if (anim.loop) {
                idx = next = 0;
            } else {
                result = false;
            }
        }
    }

    if (!result) {
        return;
    }

    let tr = keys[idx].transition;

    if (tr === 0 || idx === next) {
        // don't interpolate if not needed
        apply_immediate_value(node, track.prop_type, track.prop_key, keys[idx].value);
    }

    if (!equals(tr, 1)) {
        c = ease(c, tr);
    }

    switch (interp) {
        case InterpolationType.INTERPOLATION_NEAREST: {
            apply_immediate_value(node, track.prop_type, track.prop_key, keys[idx].value);
        }
        case InterpolationType.INTERPOLATION_LINEAR: {
            // console.log(`key<${track.prop_key}>[${idx} -> ${next}]: factor=${c}`)
            apply_interpolate_value(node, track.prop_type, track.prop_key, keys[idx].value, keys[next].value, c);
        }
        case InterpolationType.INTERPOLATION_CUBIC: {
            // let pre = idx - 1;
            // if (pre < 0) {
            //     pre = 0;
            // }
            // let post = next + 1;
            // if (post >= len) {
            //     post = next;
            // }
            // cubic_interpolate_number(keys[pre].value, keys[idx].value, keys[next].value, keys[post].value, c);
            apply_interpolate_value(node, track.prop_type, track.prop_key, keys[idx].value, keys[next].value, c);
        }
        default: {
            return keys[idx].value;
        }
    }
}
/**
 * @param {Node2D} node
 * @param {Animation} anim
 * @param {ValueTrack} track
 * @param {number} time
 * @param {boolean} loop_wrap
 */
function immediate_track_on_node(node, anim, track, time, loop_wrap) {
    let keys = track.values;
    let idx = find_track_key(keys, time);

    if (idx === -2) {
        return;
    }

    apply_immediate_value(node, track.prop_type, track.prop_key, keys[idx].value);
}

class AnimationData {
    constructor() {
        this.name = '';
        this.next = '';

        /** @type {Object<string, Node2D>} */
        this.node_cache = {};
        this.node_cache_size = 0; // Remember to update size with `node_cache`

        /** @type {Animation} */
        this.animation = null;
    }
}
class PlaybackData {
    constructor() {
        /** @type {AnimationData} */
        this.from = null;
        this.pos = 0;
        this.speed_scale = 1.0;
    }
}
class Blend {
    constructor(time = 0, left = 0) {
        this.data = new PlaybackData();
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
        this.seeked = false;
        this.started = false;
    }
}

export default class AnimationPlayer extends Node2D {
    /**
     * If playing the current animation, otherwise the last played one.
     * @property {string}
     */
    get assigned_animation() {
        return '';
    }
    set assigned_animation(anim) {
    }

    /**
     * The name of current animation.
     * @property {string}
     */
    get current_animation() {
        return (this.is_playing ? '' : '');
    }
    set current_animation(anim) {
        if (anim === '[stop]' || anim.length === 0) {
            this.stop();
        } else if (this.is_playing/*  || this.playback.assigned !== anim */) {
            // Same animation, do not replay from start
        }
    }

    /**
     * @property {number}
     */
    get current_animation_length() {
        return 0;
    }

    /**
     * @property {number}
     */
    get current_animation_position() {
        return 0;
    }

    /**
     * The default time in which to blend animations.
     * @property {number}
     */
    get playback_default_blend_time() {
        return this.default_blend_time;
    }
    set playback_default_blend_time(time) {
        this.default_blend_time = time;
    }

    constructor() {
        super();

        /**
         * AnimationPlayer does not have transforms
         */
        this.has_transform = false;

        this.autoplay = '';
        this.playback_speed = 1;
        this.root_node = '..';

        /** @type {string[]} */
        this.queued = [];

        this.is_playing = false;
        this.end_reached = false;
        this.end_notify = false;

        /**
         * If true, updates animations in response to process-related notifications.
         * @type {boolean}
         */
        this.playback_active = true;

        /**
         * @type {Object<string, Animation>}
         */
        this.anims = {};
        /**
         * @type {Object<string, AnimationData>}
         */
        this.animation_set = {};
        /**
         * @type {Object<string, number>}
         */
        this.blend_times = {};

        this.playback = new Playback();
    }
    _load_data(data) {
        super._load_data(data);

        if (data.anims !== undefined) {
            for (let key in data.anims) {
                this.add_animation(key, new Animation().load(data.anims[key]));
            }
        }

        if (data.root_node !== undefined) {
            this.root_node = data.root_node;
        }
        if (data.playback_speed !== undefined) {
            this.playback_speed = data.playback_speed;
        }
        if (data.autoplay !== undefined) {
            this.autoplay = data.autoplay;
        }

        return this;
    }

    _propagate_ready() {
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_ready();
        }

        this._is_ready = true;

        this._ready();

        this.play(this.autoplay);
        this._animation_process(0);
    }

    /**
     * Updates the object transform for rendering.
     *
     * @private
     * @param {number} delta - Time since last tick.
     */
    _propagate_process(delta) {
        if (this.idle_process && this.playback_active) {
            this._animation_process(delta);
        }

        super._propagate_process(delta);
    }

    /**
     * Update animation
     * @param {number} delta Delta time since last frame
     */
    _animation_process(delta) {
        if (this.playback.current.from) {
            this.end_reached = false;
            this.end_notify = false;
            this._animation_process2(delta, this.playback.started);

            if (this.playback.started) {
                this.playback.started = false;
            }

            if (this.end_reached) {
                if (this.queued.length > 0) {
                    const old = this.playback.assigned;
                    const new_name = this.queued.shift();
                    this.play(new_name);
                    if (this.end_notify) {
                        this.emit_signal('animation_changed', old, new_name);
                    }
                } else {
                    this.is_playing = false;
                    this.playback.current.pos = 0;
                    this.set_process(false);
                    if (this.end_notify) {
                        this.emit_signal('animation_finished');
                    }
                }
                this.end_reached = false;
            }
        } else {
            this.set_process(false);
        }
    }
    /**
     * Update animation
     *
     * @param {number} delta Delta time since last frame
     * @param {boolean} started
     */
    _animation_process2(delta, started) {
        const c = this.playback;

        this._animation_process_data(c.current, delta, 1.0, c.seeked && !equals(delta, 0), started);
        if (!equals(delta, 0)) {
            c.seeked = false;
        }

        for (let i = c.blend.length - 1; i >= 0; i--) {
            let b = c.blend[i];
            let blend = b.blend_left / b.blend_time;
            this._animation_process_data(b.data, delta, blend, false, false);

            b.blend_left -= Math.abs(this.playback_speed * delta);

            if (b.blend_left < 0) {
                c.blend.splice(i, 1);
            }
        }
    }
    /**
     * @param {PlaybackData} cd
     * @param {number} delta
     * @param {number} blend
     * @param {boolean} seeked
     * @param {boolean} started
     */
    _animation_process_data(cd, delta, blend, seeked, started) {
        delta = delta * this.playback_speed * cd.speed_scale;
        let next_pos = cd.pos + delta;

        let len = cd.from.animation.length;
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
                let backwards = delta < 0;

                if (!backwards && cd.pos <= len && next_pos === len) {
                    // playback finished
                    this.end_reached = true;
                    this.end_notify = cd.pos < len; // Notify only if not already at the end
                }

                if (backwards && cd.pos >= 0 && next_pos === 0) {
                    // playback finished
                    this.end_reached = true;
                    this.end_notify = cd.pos > 0;  // Notify only if not already at the end
                }
            }
        } else {
            let looped_next_pos = posmod(next_pos, len);
            if (looped_next_pos === 0 && next_pos !== 0) {
                // Loop multiples of the length to it, rather than 0
                // so state at time=length is previewable in the editor
                next_pos = len;
            } else {
                next_pos = looped_next_pos;
            }
        }

        cd.pos = next_pos;

        this._animation_process_animation(cd.from, cd.pos, delta, blend, cd === this.playback.current, seeked, started);
    }
    /**
     * @param {AnimationData} anim
     * @param {number} time
     * @param {number} delta
     * @param {number} interp
     * @param {boolean} is_current
     * @param {boolean} seeked
     * @param {boolean} started
     */
    _animation_process_animation(anim, time, delta, interp, is_current, seeked, started) {
        this._ensure_node_caches(anim);

        let a = anim.animation;
        let can_call = this.is_inside_tree;

        for (let i = 0; i < a.tracks.length; i++) {
            let track = a.tracks[i];
            let node = anim.node_cache[anim_path_without_prop(track.path)];

            switch (track.type) {
                case TrackType.TYPE_VALUE: {
                    let t = /** @type {ValueTrack} */(track);
                    let update_mode = t.update_mode;

                    if (update_mode === UpdateMode.UPDATE_CONTINUOUS || update_mode === UpdateMode.UPDATE_CAPTURE || (equals(delta, 0) && update_mode === UpdateMode.UPDATE_DISCRETE)) { // delta == 0 means seek
                        interpolate_track_on_node(node, a, t, time, update_mode === UpdateMode.UPDATE_CONTINUOUS ? t.interp : InterpolationType.INTERPOLATION_NEAREST, t.loop_wrap);
                    } else if (is_current && !equals(delta, CMP_EPSILON)) {
                        immediate_track_on_node(node, a, t, time, t.loop_wrap);
                    }
                } break;
                case TrackType.TYPE_METHOD: {
                    let t = /** @type {MethodTrack} */(track);
                } break;
            }
        }
    }

    /**
     * @param {AnimationData} anim
     */
    _ensure_node_caches(anim) {
        // Already cached?
        if (anim.node_cache_size === anim.animation.tracks.length) {
            return;
        }

        /** @type {Node2D} */
        let parent = this.get_node(this.root_node);

        if (!parent) {
            return;
        }

        let a = anim.animation;

        for (let i = 0; i < a.tracks.length; i++) {
            let track = a.tracks[i];
            let child = parent.get_node(anim_path_without_prop(track.path));
            if (!child) {
                console.log(`On Animation: '${anim.name}', couldn't resolve track : '${track.path}'`)
                continue;
            }

            anim.node_cache[anim_path_without_prop(track.path)] = child;
            anim.node_cache_size += 1;
        }
    }

    /**
     * @param {string} name
     * @param {Animation} animation
     * @returns {boolean}
     */
    add_animation(name, animation) {
        let ad = new AnimationData();
        ad.animation = animation;
        ad.name = name;
        this.animation_set[name] = ad;

        this.anims[name] = animation;

        return true;
    }

    /**
     * Shifts position in the animation timeline. Delta is the time in seconds to shift.
     *
     * @param {number} time
     */
    advance(time) {
        this._animation_process(time);
    }

    /**
     * Returns the name of the next animation in the queue.
     *
     * @param {string} animation
     * @returns {string}
     */
    animation_get_next(animation) {
        return this.animation_set[animation].next || '';
    }

    /**
     * Triggers the anim_to animation when the anim_from animation completes.
     *
     * @param {string} animation
     * @param {string} next
     */
    animation_set_next(animation, next) {
        let anim = this.animation_set[animation];
        if (anim) {
            anim.next = next;
        }
    }

    /**
     * AnimationPlayer caches animated nodes. It may not notice if a node disappears,
     * so clear_caches forces it to update the cache again.
     */
    clear_caches() {
        for (let k in this.animation_set) {
            this.animation_set[k].node_cache = {};
        }
    }

    /**
     * Clears all queued, unplayed animations.
     */
    clear_queue() {
        this.queued.length = 0;
    }

    /**
     * @param {Animation} animation
     * @returns {string}
     */
    find_animation(animation) {
        return animation.name;
    }

    /**
     * @param {string} name
     * @returns {Animation}
     */
    get_animation(name) {
        return this.anims[name];
    }
    /**
     * Returns the list of stored animation names.
     *
     * @param {string[]} [animations] output array
     * @returns {string[]}
     */
    get_animation_list(animations) {
        if (animations === undefined) {
            return Object.keys(this.animation_set);
        }

        for (let k in this.animation_set) {
            animations.push(k);
        }
        return animations;
    }

    /**
     * Get the blend time (in seconds) between two animations, referenced by their names.
     *
     * @param {string} animation1
     * @param {string} animation2
     * @returns {number}
     */
    get_blend_time(animation1, animation2) {
        return this.blend_times[`${animation1}->${animation2}`] || 0;
    }

    /**
     * @param {string} name
     */
    has_animation(name) {
        return !!this.animation_set[name];
    }

    /**
     * Play the animation with key name. Custom speed and blend times can be set.
     *
     * @param {string} [name]
     * @param {number} [custom_blend]
     * @param {number} [custom_scale]
     * @param {boolean} [from_end]
     * @returns {this}
     */
    play(name = '', custom_blend = -1, custom_scale = 1.0, from_end = false) {
        if (name.length === 0) {
            name = this.playback.assigned;
        }
        if (name.length === 0) {
            return this;
        }

        if (!this.animation_set[name]) {
            console.log(`Animation not found: ${name}`);
            return this;
        }

        const c = this.playback;

        if (c.current.from) {
            let blend_time = 0;
            let bk = `${c.current.from.name}->${name}`;

            if (custom_blend >= 0) {
                blend_time = custom_blend;
            } else if (Number.isFinite(this.blend_times[bk])) {
                blend_time = this.blend_times[bk];
            } else {
                bk = `*->${name}`;
                if (Number.isFinite(this.blend_times[bk])) {
                    blend_time = this.blend_times[bk];
                } else {
                    bk = `${c.current.from.name}->*`;

                    if (Number.isFinite(this.blend_times[bk])) {
                        blend_time = this.blend_times[bk];
                    }
                }
            }

            if (custom_blend < 0 && equals(blend_time, 0) && this.default_blend_time) {
                blend_time = this.default_blend_time;
            }
            if (blend_time > 0) {
                let b = new Blend(blend_time, blend_time);
                b.data = c.current;
                c.blend.push(b);
            }
        }

        c.current.from = this.animation_set[name];

        if (c.assigned !== name) { // reset
            c.current.pos = from_end ? c.current.from.animation.length : 0;
        } else if (from_end && c.current.pos === 0) {
            // Animation reset BUT played backwards, set position to the end
            c.current.pos = c.current.from.animation.length;
        }

        c.current.speed_scale = custom_scale;
        c.assigned = name;
        c.seeked = false;
        c.started = true;

        if (!this.end_reached) {
            this.queued.length = 0;
        }
        this.set_process(true);
        this.is_playing = true;

        this.emit_signal('animation_started', c.assigned);

        let next = this.animation_get_next(name);
        if (next && this.animation_set[next]) {
            this.queue(next);
        }

        return this;
    }

    /**
     * Play the animation with key name in reverse.
     *
     * @param {string} name
     * @param {number} custom_blend
     */
    play_backwards(name = '', custom_blend = -1) {
        return this.play(name, custom_blend, -1, true);
    }
    /**
     * Queue an animation for playback once the current one is done.
     *
     * @param {string} name
     */
    queue(name) {
        if (!this.is_playing) {
            this.play(name);
        } else {
            this.queued.push(name);
        }
        return this;
    }

    /**
     * Seek the animation to the seconds point in time (in seconds).
     * If update is true, the animation updates too,
     * otherwise it updates at process time.
     *
     * @param {number} time
     * @param {boolean} [update]
     */
    seek(time, update = false) {
        if (!this.playback.current.from) {
            if (this.playback.assigned) {
                this.playback.current.from = this.animation_set[this.playback.assigned];
            }
        }

        this.playback.current.pos = time;
        this.playback.seeked = true;
        if (update) {
            this._animation_process(0);
        }
        return this;
    }

    /**
     * Specify a blend time (in seconds) between two animations, referenced by their names.
     *
     * @param {string} animation1
     * @param {string} animation2
     * @param {number} time
     */
    set_blend_time(animation1, animation2, time) {
        if (equals(time, 0)) {
            delete this.blend_times[`${animation1}->${animation2}`];
        } else {
            this.blend_times[`${animation1}->${animation2}`] = time;
        }
        return this;
    }

    /**
     * Stop the currently playing animation. If reset is true, the anim position is reset to 0.
     *
     * @param {boolean} [reset]
     */
    stop(reset = true) {
        const c = this.playback;

        c.blend.length = 0;
        if (reset) {
            c.current.from = null;
            c.current.speed_scale = 1;
            c.current.pos = 0;
        }
        this.set_process(false);
        this.queued.length = 0;
        this.is_playing = false;

        return this;
    }
}

node_class_map['AnimationPlayer'] = AnimationPlayer;
