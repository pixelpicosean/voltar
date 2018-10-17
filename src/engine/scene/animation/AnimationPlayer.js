import { Point, deg2rad } from 'engine/math/index';
import { Signal } from 'engine/dep/index';
import MessageQueue from 'engine/MessageQueue';
import Node2D from "../Node2D";

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
class BezierAnim {
    constructor() {
        /** @type {string[]} */
        this.bezier_property = [];
        this.owner = null;
        this.bezier_accum = 0;
        this.object = null;
        this.accum_pass = 0;
    }
}
class TrackNodeCache {
    constructor() {
        this.skeleton = null;
        this.node = null;
        this.accum_pass = 0;
        this.bone_idx = -1;
        this.node_2d = null;
        this.audio_playing = false;
        this.animation_playing = false;
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

        /**
         * AnimationPlayer does not have transforms
         */
        this.has_transform = false;

        this.animation_changed = new Signal();

        /** @type {Map<string, PropertyAnim>} */
        this.property_anim = new Map();

        /** @type {Map<string, BezierAnim>} */
        this.bezier_anim = new Map();

        /** @type {Map<TrackNodeCacheKey, TrackNodeCache>} */
        this.node_cache_map = new Map();

        /** @type {TrackNodeCache[]} */
        this.cache_update = new Array(NODE_CACHE_UPDATE_MAX);
        this.cache_update_size = 0;
        /** @type {PropertyAnim[]} */
        this.cache_update_prop = new Array(NODE_CACHE_UPDATE_MAX);
        this.cache_update_prop_size = 0;
        /** @type {BezierAnim[]} */
        this.cache_update_bezier = new Array(NODE_CACHE_UPDATE_MAX);
        this.cache_update_bezier_size = 0;
        /** @type {Set<TrackNodeCache>} */
        this.playing_caches = new Set();

        /** @type {Map<Animation, number>} */
        this.used_anims = new Map();

        this.accum_pass = 0;
        this.speed_scale = 1;
        this.default_blend_time = 0;

        /** @type {Map<string, AnimationData>} */
        this.animation_set = new Map();
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
     * @property {number}
     */
    get playback_default_blend_time() {
        return this.default_blend_time;
    }
    set playback_default_blend_time(p_default) {
        this.default_blend_time = p_default;
    }

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
     * The name of current animation.
     * @type {string}
     */
    get current_animation() {
        return (this.is_playing() ? this.playback.assigned : '');
    }
    set current_animation(p_anim) {
        if (p_anim === '[stop]' || p_anim.length === 0) {
            this.stop();
        } else if (this.is_playing() || this.playback.assigned !== p_anim) {
            // Same animation, do not replay from start
        }
    }
    /**
     * If playing the current animation, otherwise the last played one.
     * @type {string}
     */
    get assigned_animation() {
        return this.playback.assigned;
    }
    set assigned_animation(p_anim) {
        if (this.is_playing()) {
            this.play(p_anim);
        } else {
            this.playback.current.pos = 0;
            this.playback.current.from = this.animation_set.get(p_anim);
            this.playback.assigned = p_anim;
        }
    }
    get playback_active() {
        return this.is_active();
    }
    set playback_active(p_active) {
        this.set_active(p_active);
    }
    stop_all() { }
    /**
     * If true, updates animations in response to process-related notifications.
     * @param {boolean} p_active
     */
    set_active(p_active) {
        if (this.active === p_active) {
            return;
        }
        this.active = p_active;
        this._set_process(this.processing, true);
    }
    /**
     * If true, updates animations in response to process-related notifications.
     * @returns {boolean}
     */
    is_active() {
        return this.active;
    }
    /**
     * @returns {boolean}
     */
    is_valid() { }

    /**
     * The speed scaling ratio.
     * @type {number}
     */
    get playback_speed() {
        return this.speed_scale;
    }
    set playback_speed(p_speed) {
        this.speed_scale = p_speed;
    }

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
     * @type {number}
     */
    get current_animation_position() {
        return this.playback.current.pos;
    }
    /**
     * @type {number}
     */
    get current_animation_length() {
        return this.playback.current.from.animation.get_length();
    }

    /**
     * @param {number} p_time
     */
    advance(p_time) {
        this._animation_process(p_time);
    }

    /**
     * @type {string}
     */
    set root(p_root) {
        this.root = p_root;
        this.clear_caches();
    }

    /**
     * Must be called by hand if an animation was modified after added
     */
    clear_caches() {
        this._stop_playing_caches();

        this.node_cache_map.clear();

        this.animation_set.forEach(data => {
            data.node_cache.length = 0;
        });

        this.cache_update_size = 0;
        this.cache_update_prop_size = 0;
        this.cache_update_bezier_size = 0;
    }

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
