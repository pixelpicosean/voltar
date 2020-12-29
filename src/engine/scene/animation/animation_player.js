import { node_class_map } from 'engine/registry';
import { GDCLASS } from "engine/core/v_object";
import { MessageQueue } from 'engine/core/message_queue';

import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_READY,
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
    NOTIFICATION_EXIT_TREE,
} from "engine/scene/main/node";

import {
    Key,
    ValueTrack,
    MethodTrack,
    Animation,
    PROP_TYPE_NUMBER,
    PROP_TYPE_BOOLEAN,
    PROP_TYPE_STRING,
    PROP_TYPE_VECTOR,
    PROP_TYPE_COLOR,
    PROP_TYPE_TRANSFORM,
    PROP_TYPE_ANY,
    INTERPOLATION_NEAREST,
    INTERPOLATION_LINEAR,
    INTERPOLATION_CUBIC,
    TRACK_TYPE_BEZIER,
    TRACK_TYPE_ANIMATION,
    TRACK_TYPE_METHOD,
    TRACK_TYPE_VALUE,
    UPDATE_CONTINUOUS,
    UPDATE_CAPTURE,
    UPDATE_DISCRETE,
    BezierTrack,
    AnimationTrack,
} from './animation.js';
import { Transform } from 'engine/core/math/transform.js';
import { Vector3 } from 'engine/core/math/vector3.js';
import { Quat } from 'engine/core/math/basis.js';


class NodeCache {
    constructor() {
        /** @type {Node} */
        this.node = null;
        /** @type {{ [name: string]: number }} */
        this.bone_ids = {};
        this.animation_playing = false;
    }
}

export const ANIMATION_PROCESS_PHYSICS = 0;
export const ANIMATION_PROCESS_IDLE = 1;
export const ANIMATION_PROCESS_MANUAL = 2;

export const ANIMATION_METHOD_CALL_DEFERRED = 0;
export const ANIMATION_METHOD_CALL_IMMEDIATE = 1;

/**
 * @param {number} p_x
 * @param {number} p_y
 */
function posmod(p_x, p_y) {
    return (p_x >= 0) ? (p_x % p_y) : (p_y - (-p_x) % p_y);
}

/**
 * @param {number} x
 * @param {number} c
 */
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
 */
function equals(a, b) {
    return Math.abs(a - b) < CMP_EPSILON;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} c
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

    return Math.max(0, middle);
}
/**
 * @param {string} path
 */
function anim_path_without_prop(path) {
    return path.split(':')[0];
}
/**
 * @param {string} path
 */
function anim_prop(path) {
    return path.split(':')[1];
}
/**
 * @param {NodeCache} nc
 * @param {number} type
 * @param {string} key
 * @param {any} value
 */
function apply_immediate_value(nc, type, key, value) {
    const node = nc.node;

    switch (type) {
        case PROP_TYPE_NUMBER:
        case PROP_TYPE_BOOLEAN:
        case PROP_TYPE_STRING:
        case PROP_TYPE_ANY: {
            node[key] = value;
        } break;
        case PROP_TYPE_VECTOR: {
            node[key].x = value.x;
            node[key].y = value.y;
            node[key].z = value.z;
        } break;
        case PROP_TYPE_COLOR: {
            node[key].r = value.r;
            node[key].g = value.g;
            node[key].b = value.b;
            node[key].a = value.a;
        } break;
        case PROP_TYPE_TRANSFORM: {
            if (node.is_skeleton) {
                interp_xform.origin.copy(value.loc);
                interp_xform.basis.set_quat_scale(value.rot, value.scale);
                /** @type {import('engine/scene/3d/skeleton').Skeleton} */(node).set_bone_pose(nc.bone_ids[key], interp_xform);
            }
        } break;
    }
}

let interp_xform = new Transform;
let interp_loc = new Vector3;
let interp_rot = new Quat;
let interp_scale = new Vector3;

/**
 * @param {NodeCache} nc
 * @param {number} type
 * @param {Function} setter
 * @param {any} value
 */
function apply_immediate_value_with_setter(nc, type, setter, value) {
    if (type === PROP_TYPE_TRANSFORM) {
        interp_xform.origin.copy(value.loc);
        interp_xform.basis.set_quat_scale(value.rot, value.scale);
        setter.call(nc.node, interp_xform);
    } else {
        setter.call(nc.node, value);
    }
}
/**
 * @param {NodeCache} nc
 * @param {number} type
 * @param {string} key
 * @param {any} value_a
 * @param {any} value_b
 * @param {number} c
 */
function apply_interpolate_value(nc, type, key, value_a, value_b, c) {
    const node = nc.node;
    switch (type) {
        case PROP_TYPE_BOOLEAN:
        case PROP_TYPE_STRING:
        case PROP_TYPE_ANY: {
            node[key] = value_a;
        } break;
        case PROP_TYPE_NUMBER: {
            node[key] = interpolate_number(value_a, value_b, c);
        } break;
        case PROP_TYPE_VECTOR: {
            node[key].x = interpolate_number(value_a.x, value_b.x, c);
            node[key].y = interpolate_number(value_a.y, value_b.y, c);
            node[key].z = interpolate_number(value_a.z, value_b.z, c);
        } break;
        case PROP_TYPE_COLOR: {
            node[key].r = interpolate_number(value_a.r, value_b.r, c);
            node[key].g = interpolate_number(value_a.g, value_b.g, c);
            node[key].b = interpolate_number(value_a.b, value_b.b, c);
            node[key].a = interpolate_number(value_a.a, value_b.a, c);
        } break;
        case PROP_TYPE_TRANSFORM: {
            if (node.is_skeleton) {
                interp_loc.x = interpolate_number(value_a.loc.x, value_b.loc.x, c);
                interp_loc.y = interpolate_number(value_a.loc.y, value_b.loc.y, c);
                interp_loc.z = interpolate_number(value_a.loc.z, value_b.loc.z, c);

                value_a.rot.slerp(value_b.rot, c, interp_rot);

                interp_scale.x = interpolate_number(value_a.scale.x, value_b.scale.x, c);
                interp_scale.y = interpolate_number(value_a.scale.y, value_b.scale.y, c);
                interp_scale.z = interpolate_number(value_a.scale.z, value_b.scale.z, c);

                interp_xform.origin.copy(interp_loc);
                interp_xform.basis.set_quat_scale(interp_rot, interp_scale);
                /** @type {import('engine/scene/3d/skeleton').Skeleton} */(node).set_bone_pose(nc.bone_ids[key], interp_xform);
            }
        } break;
    }
}

const interp_vec = { x: 0, y: 0, z: 0 };
const interp_color = { r: 0, g: 0, b: 0, a: 0 };
/**
 * @param {NodeCache} nc
 * @param {number} type
 * @param {Function} setter
 * @param {any} value_a
 * @param {any} value_b
 * @param {number} c
 */
function apply_interpolate_value_with_setter(nc, type, setter, value_a, value_b, c) {
    switch (type) {
        case PROP_TYPE_NUMBER: {
            setter.call(nc.node, interpolate_number(value_a, value_b, c));
        } break;
        case PROP_TYPE_BOOLEAN:
        case PROP_TYPE_STRING:
        case PROP_TYPE_ANY: {
            setter.call(nc.node, value_a);
        } break;
        case PROP_TYPE_VECTOR: {
            interp_vec.x = interpolate_number(value_a.x, value_b.x, c);
            interp_vec.y = interpolate_number(value_a.y, value_b.y, c);
            interp_vec.z = interpolate_number(value_a.z, value_b.z, c);
            setter.call(nc.node, interp_vec);
        } break;
        case PROP_TYPE_COLOR: {
            interp_color.r = interpolate_number(value_a.r, value_b.r, c);
            interp_color.g = interpolate_number(value_a.g, value_b.g, c);
            interp_color.b = interpolate_number(value_a.b, value_b.b, c);
            interp_color.a = interpolate_number(value_a.a, value_b.a, c);
            setter.call(nc.node, interp_color);
        } break;
        case PROP_TYPE_TRANSFORM: {
            interp_loc.x = interpolate_number(value_a.loc.x, value_b.loc.x, c);
            interp_loc.y = interpolate_number(value_a.loc.y, value_b.loc.y, c);
            interp_loc.z = interpolate_number(value_a.loc.z, value_b.loc.z, c);

            value_a.rot.slerp(value_b.rot, c, interp_rot);

            interp_scale.x = interpolate_number(value_a.scale.x, value_b.scale.x, c);
            interp_scale.y = interpolate_number(value_a.scale.y, value_b.scale.y, c);
            interp_scale.z = interpolate_number(value_a.scale.z, value_b.scale.z, c);

            interp_xform.origin.copy(interp_loc);
            interp_xform.basis.set_quat_scale(interp_rot, interp_scale);
            setter.call(nc.node, interp_xform);
        } break;
    }
}
/**
 * @param {NodeCache} nc
 * @param {Animation} anim
 * @param {ValueTrack} track
 * @param {number} time
 * @param {number} interp
 * @param {boolean} loop_wrap
 * @param {Object<string, Function>} setter_cache
 */
function interpolate_track_on_node(nc, anim, track, time, interp, loop_wrap, setter_cache) {
    let keys = track.values;
    let len = find_track_key(keys, anim.length) + 1;

    if (len <= 0) {
        return;
    } else if (len === 1) {
        apply_immediate_value(nc, track.prop_type, track.prop_key, keys[0].value);
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

    const setter = setter_cache[track.path];

    let tr = keys[idx].transition;

    if (tr === 0 || idx === next) {
        // don't interpolate if not needed
        if (setter) {
            apply_immediate_value_with_setter(nc, track.prop_type, setter, keys[idx].value);
        } else {
            apply_immediate_value(nc, track.prop_type, track.prop_key, keys[idx].value);
        }
    }

    if (!equals(tr, 1)) {
        c = ease(c, tr);
    }

    switch (interp) {
        case INTERPOLATION_NEAREST: {
            if (setter) {
                apply_immediate_value_with_setter(nc, track.prop_type, setter, keys[idx].value);
            } else {
                apply_immediate_value(nc, track.prop_type, track.prop_key, keys[idx].value);
            }
        } break;
        case INTERPOLATION_LINEAR: {
            if (setter) {
                apply_interpolate_value_with_setter(nc, track.prop_type, setter, keys[idx].value, keys[next].value, c);
            } else {
                apply_interpolate_value(nc, track.prop_type, track.prop_key, keys[idx].value, keys[next].value, c);
            }
        } break;
        case INTERPOLATION_CUBIC: {
            let pre = idx - 1;
            if (pre < 0) {
                pre = 0;
            }
            let post = next + 1;
            if (post >= len) {
                post = next;
            }
            cubic_interpolate_number(keys[pre].value, keys[idx].value, keys[next].value, keys[post].value, c);
        } break;
        default: {
            return keys[idx].value;
        };
    }
}
/**
 * @param {NodeCache} nc
 * @param {Animation} anim
 * @param {ValueTrack} track
 * @param {number} time
 * @param {boolean} loop_wrap
 */
function immediate_track_on_node(nc, anim, track, time, loop_wrap) {
    let keys = track.values;
    let idx = find_track_key(keys, time);

    if (idx === -2) {
        return;
    }

    apply_immediate_value(nc, track.prop_type, track.prop_key, keys[idx].value);
}

class AnimationData {
    constructor() {
        this.name = '';
        this.next = '';

        /** @type {{ [path: string]: NodeCache }} */
        this.node_cache = {};
        /** @type {Object<string, Function>} */
        this.setter_cache = {};
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

class BezierAnim {
    constructor() {
        /** @type {string[]} */
        this.bezier_property = [];
        this.bezier_accum = 0;
        this.object = null;
        this.accum_pass = 0;
    }
}

/** @type {number[]} */
let indices = [];

export class AnimationPlayer extends Node {
    get class() { return 'AnimationPlayer' }

    /**
     * If playing the current animation, otherwise the last played one.
     */
    get assigned_animation() { return this.playback.assigned }
    /**
     * @param {string} p_anim
     */
    set_assigned_animation(p_anim) {
        if (this.is_playing()) {
            this.play(p_anim);
        } else {
            this.playback.current.pos = 0;
            this.playback.current.from = this.animation_set[p_anim];
            this.playback.assigned = p_anim;
        }
    }

    /**
     * The name of current animation.
     */
    get current_animation() { return (this.is_playing() ? this.playback.assigned : '') }
    /**
     * @param {string} p_anim
     */
    set_current_animation(p_anim) {
        if (p_anim === '[stop]' || p_anim.length === 0) {
            this.stop();
        } else if (!this.is_playing() || this.playback.assigned !== p_anim) {
            this.play(p_anim);
        } else {
            // Same animation, do not replay from start
        }
    }

    get current_animation_length() { return this.playback.current.from.animation.length }

    get current_animation_position() { return this.playback.current.pos }

    /**
     * @param {string} p_anim
     */
    set_playback_process_mode(p_mode) {
        if (this.playback_process_mode === p_mode) {
            return;
        }
        const pr = this.processing;
        if (pr) {
            this._set_process(false);
        }
        this.playback_process_mode = p_mode;
        if (pr) {
            this._set_process(true);
        }
    }

    /**
     * @param {string} value
     */
    set_root_node(value) {
        this.root_node = value;
        this.clear_caches();
    }

    /**
     * If true, updates animations in response to process-related notifications.
     * @param {boolean} value
     */
    set_playback_active(value) {
        if (this.playback_active === value) {
            return;
        }
        this.playback_active = value;
        this._set_process(this.processing, true);
    }

    constructor() {
        super();

        this.accum_pass = 1;
        /**
         * The default time in which to blend animations.
         */
        this.playback_default_blend_time = 0;

        this.autoplay = '';
        this.playback_speed = 1;
        this.root_node = '..';

        /** @type {string[]} */
        this.queued = [];

        this.playing = false;
        this.end_reached = false;
        this.end_notify = false;

        this.processing = false;
        this.playback_active = true;

        this.playback_process_mode = ANIMATION_PROCESS_IDLE;
        this.method_call_mode = ANIMATION_METHOD_CALL_IMMEDIATE;

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

        /** @type {Map<string, BezierAnim>} */
        this.bezier_anim = null;

        /** @type {Set<NodeCache>} */
        this.playing_caches = new Set;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.anims !== undefined) {
            for (let key in data.anims) {
                this.add_animation(key, data.anims[key]);
            }
        }
        // find animations saved as 'anims/name'
        for (let k in data) {
            if (k.startsWith('anims/')) {
                let anim_name = k.replace(/^anims\//, '');
                if (!this.anims[anim_name]) {
                    this.add_animation(anim_name, data[k]);
                }
            }
        }

        if (data.root_node !== undefined) {
            this.set_root_node(data.root_node);
        }
        if (data.playback_speed !== undefined) {
            this.playback_speed = data.playback_speed;
        }
        if (data.autoplay !== undefined) {
            this.autoplay = data.autoplay;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (!this.processing) {
                    this.set_physics_process_internal(false);
                    this.set_process_internal(false);
                }
                this.clear_caches();
            } break;
            case NOTIFICATION_READY: {
                if (this.animation_set[this.autoplay]) {
                    this.play(this.autoplay);
                    this._animation_process(0);
                }
            } break;
            case NOTIFICATION_INTERNAL_PROCESS: {
                if (this.playback_process_mode === ANIMATION_PROCESS_PHYSICS) {
                    break;
                }

                if (this.processing) {
                    this._animation_process(this.get_process_delta_time());
                }
            } break;
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: {
                if (this.playback_process_mode === ANIMATION_PROCESS_IDLE) {
                    break;
                }

                if (this.processing) {
                    this._animation_process(this.get_physics_process_delta_time());
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.clear_caches();
            } break;
        }
    }

    /* public */

    is_playing() {
        return this.playing;
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
            return;
        }

        if (!this.animation_set[name]) {
            console.log(`Animation not found: ${name}`);
            return;
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

            if (custom_blend < 0 && equals(blend_time, 0) && this.playback_default_blend_time) {
                blend_time = this.playback_default_blend_time;
            }
            if (blend_time > 0) {
                let b = new Blend(blend_time, blend_time);
                b.data = c.current;
                c.blend.push(b);
            }
        }

        if (this.current_animation !== name) {
            this._stop_playing_caches();
        }

        c.current.from = this.animation_set[name];

        if (c.assigned !== name) { // reset
            c.current.pos = from_end ? c.current.from.animation.length : 0;
        } else {
            if (from_end && c.current.pos === 0) {
                // Animation reset BUT played backwards, set position to the end
                c.current.pos = c.current.from.animation.length;
            } else if (!from_end && c.current.pos === c.current.from.animation.length) {
                c.current.pos = 0;
            }
        }

        c.current.speed_scale = custom_scale;
        c.assigned = name;
        c.seeked = false;
        c.started = true;

        if (!this.end_reached) {
            this.queued.length = 0;
        }
        this._set_process(true);
        this.playing = true;

        this.emit_signal('animation_started', c.assigned);

        let next = this.animation_get_next(name);
        if (next && this.animation_set[next]) {
            this.queue(next);
        }
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
        if (!this.is_playing()) {
            this.play(name);
        } else {
            this.queued.push(name);
        }
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
    }

    /**
     * Stop the currently playing animation. If reset is true, the anim position is reset to 0.
     *
     * @param {boolean} [reset]
     */
    stop(reset = true) {
        this._stop_playing_caches();

        const c = this.playback;
        c.blend.length = 0;
        if (reset) {
            c.current.from = null;
            c.current.speed_scale = 1;
            c.current.pos = 0;
        }
        this._set_process(false);
        this.queued.length = 0;
        this.playing = false;
    }

    /* private */

    /**
     * @param {boolean} p_process
     * @param {boolean} [p_force]
     */
    _set_process(p_process, p_force = false) {
        if (this.processing === p_process && !p_force) {
            return;
        }

        switch (this.playback_process_mode) {
            case ANIMATION_PROCESS_PHYSICS: {
                this.set_physics_process_internal(p_process && this.playback_active);
            } break;
            case ANIMATION_PROCESS_IDLE: {
                this.set_process_internal(p_process && this.playback_active);
            } break;
            case ANIMATION_PROCESS_MANUAL: {
            } break;
        }

        this.processing = p_process;
    }

    _stop_playing_caches() { }

    _animation_update_transforms() { }

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

            this._animation_update_transforms();
            if (this.end_reached) {
                if (this.queued.length > 0) {
                    const old = this.playback.assigned;
                    const new_name = this.queued.shift();
                    this.play(new_name);
                    if (this.end_notify) {
                        this.emit_signal('animation_changed', old, new_name);
                    }
                } else {
                    this.playing = false;
                    this._set_process(false);
                    if (this.end_notify) {
                        this.emit_signal('animation_finished', this.playback.assigned);
                    }
                }
                this.end_reached = false;
            }
        } else {
            this._set_process(false);
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
     * @param {AnimationData} p_anim
     * @param {number} p_time
     * @param {number} p_delta
     * @param {number} p_interp
     * @param {boolean} is_current
     * @param {boolean} p_seeked
     * @param {boolean} p_started
     */
    _animation_process_animation(p_anim, p_time, p_delta, p_interp, is_current, p_seeked, p_started) {
        this._ensure_node_caches(p_anim);

        const a = p_anim.animation;
        const can_call = this.is_inside_tree();

        for (let i = 0; i < a.tracks.length; i++) {
            if (p_anim.node_cache_size === p_anim.animation.tracks.length) {
                this._ensure_node_caches(p_anim);
            }

            const track = a.tracks[i];
            const nc = p_anim.node_cache[anim_path_without_prop(track.path)];

            if (!nc || !track.enabled) continue;

            const node = nc.node;
            if (!node) continue;

            switch (track.type) {
                case TRACK_TYPE_VALUE: {
                    const t = /** @type {ValueTrack} */(track);
                    const update_mode = t.update_mode;

                    if (update_mode === UPDATE_CONTINUOUS || update_mode === UPDATE_CAPTURE || (equals(p_delta, 0) && update_mode === UPDATE_DISCRETE)) { // delta == 0 means seek
                        interpolate_track_on_node(nc, a, t, p_time, update_mode === UPDATE_CONTINUOUS ? t.interp : INTERPOLATION_NEAREST, t.loop_wrap, p_anim.setter_cache);
                    } else if (is_current && !equals(p_delta, CMP_EPSILON)) {
                        immediate_track_on_node(nc, a, t, p_time, t.loop_wrap);
                    }
                } break;
                case TRACK_TYPE_METHOD: {
                    if (p_delta == 0) continue;
                    if (!is_current) break;

                    indices.length = 0;
                    a.track_get_key_indices_in_range(i, p_time, p_delta, indices);

                    const t = /** @type {MethodTrack} */(track);
                    for (let i of indices) {
                        let k = t.methods[i];

                        if (can_call) {
                            if (this.method_call_mode === ANIMATION_METHOD_CALL_DEFERRED) {
                                MessageQueue.get_singleton().push_call(node, k.value.method, ...k.value.args);
                            } else {
                                node[k.value.method].apply(node, k.value.args);
                            }
                        }
                    }
                } break;
                case TRACK_TYPE_BEZIER: {
                    // TODO: bezier track support
                } break;
                case TRACK_TYPE_ANIMATION: {
                    let player = /** @type {AnimationPlayer} */(node);
                    if (player.class != 'AnimationPlayer') {
                        continue;
                    }

                    if (p_delta === 0 || p_seeked) {
                        // seek
                        let idx = a.track_find_key(i, p_time);
                        if (idx < 0) continue;

                        let pos = a.track_get_key_time(i, idx);

                        let anim_name = a.animation_track_get_key_animation(i, idx);
                        if (anim_name == "[stop]" || !player.has_animation(anim_name)) continue;

                        let anim = player.get_animation(anim_name);

                        let at_anim_pos = 0;

                        if (anim.loop) {
                            at_anim_pos = posmod(p_time - pos, anim.length);
                        } else {
                            at_anim_pos = Math.max(anim.length, p_time - pos);
                        }

                        if (player.is_playing() || p_seeked) {
                            player.play(anim_name);
                            player.seek(at_anim_pos);
                            nc.animation_playing = true;
                            this.playing_caches.add(nc);
                        } else {
                            player.current_animation = anim_name;
                            player.seek(at_anim_pos, true);
                        }
                    } else {
                        indices.length = 0;
                        a.track_get_key_indices_in_range(i, p_time, p_delta, indices);
                        if (indices.length) {
                            let idx = indices[indices.length - 1];

                            let anim_name = a.animation_track_get_key_animation(i, idx);
                            if (anim_name == "[stop]" || !player.has_animation(anim_name)) {
                                if (this.playing_caches.has(nc)) {
                                    this.playing_caches.delete(nc);
                                    player.stop();
                                    nc.animation_playing = false;
                                }
                            } else {
                                player.play(anim_name);
                                nc.animation_playing = true;
                                this.playing_caches.add(nc);
                            }
                        }
                    }
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

        /** @type {Node} */
        let parent = this.get_node(this.root_node);

        if (!parent) {
            return;
        }

        let a = anim.animation;

        for (let i = 0; i < a.tracks.length; i++) {
            let track = a.tracks[i];
            let child = parent.get_node_or_null(anim_path_without_prop(track.path));
            if (!child) {
                console.log(`On Animation: '${anim.name}', couldn't resolve track : '${track.path}'`)
                continue;
            }

            let prop_name = anim_prop(track.path);
            let target_path = anim_path_without_prop(track.path);
            let nc = anim.node_cache[target_path];
            if (!nc) {
                nc = anim.node_cache[target_path] = new NodeCache;
                nc.node = child;
            }
            if (child.is_skeleton) {
                nc.bone_ids[prop_name] = /** @type {import('engine/scene/3d/skeleton').Skeleton} */(child).find_bone(prop_name);
            } else {
                let prop_setter = child[`set_${prop_name}`];
                if (typeof (prop_setter) === 'function') {
                    anim.setter_cache[track.path] = prop_setter;
                }
            }

            anim.node_cache_size += 1;
        }
    }
}
node_class_map['AnimationPlayer'] = GDCLASS(AnimationPlayer, Node)
