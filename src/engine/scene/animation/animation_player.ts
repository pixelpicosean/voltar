import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { NoShrinkArray } from "engine/core/v_array";
import { MessageQueue } from "engine/core/message_queue";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import {
    deg2rad,
    lerp,
    posmod,
} from "engine/core/math/math_funcs";
import { Transform } from "engine/core/math/transform";
import { Vector3 } from "engine/core/math/vector3";
import { Quat } from "engine/core/math/basis";

import {
    Node,

    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_READY,
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
    NOTIFICATION_EXIT_TREE,
} from "engine/scene/main/node";

import {
    TKey,

    TransformTrack,
    ValueTrack,
    MethodTrack,

    Animation,

    Interpolation_NEAREST,
    Interpolation_LINEAR,
    Interpolation_CUBIC,

    TrackType_TRANSFORM,
    TrackType_VALUE,
    TrackType_METHOD,
    TrackType_BEZIER,
    TrackType_AUDIO,
    TrackType_ANIMATION,

    UpdateMode_CONTINUOUS,
    UpdateMode_DISCRETE,

    ValueType_Vector2,
    ValueType_Rect2,
    ValueType_Transform2D,
    ValueType_Vector3,
    ValueType_Quat,
    ValueType_AABB,
    ValueType_Basis,
    ValueType_Transform,
    ValueType_Color,
} from "./animation";

type Node2D = import("engine/scene/2d/node_2d").Node2D;

type Spatial = import("engine/scene/3d/spatial").Spatial;
type Skeleton = import("engine/scene/3d/skeleton").Skeleton;


const NODE_CACHE_UPDATE_MAX = 1024;
const BLEND_FROM_MAX = 3;

const SpecialProperty_NONE = 0;
const SpecialProperty_NODE2D_POS = 1;
const SpecialProperty_NODE2D_ROT = 2;
const SpecialProperty_NODE2D_SCALE = 3;

class PropertyAnim {
    owner: TrackNodeCache = null;
    special = SpecialProperty_NONE;
    subpath: string[] = [];
    object: any = null;
    value_accum: any = null;
    accum_pass = 0;
    capture: any = null;

    setter: (value: any) => void;
}

class BezierAnim {
    bezier_property: string[] = [];
    owner: TrackNodeCache = null;
    bezier_accum = 0;
    object: any = null;
    accum_pass = 0;

    setter: (value: any) => void;
}

class TrackNodeCache {
    path = "";
    id = 0;
    node: Node = null;
    node_3d: Spatial = null;
    skeleton: Skeleton = null;
    node_2d: Node2D = null;
    bone_idx = -1;

    loc_accum = new Vector3;
    rot_accum = new Quat;
    scale_accum = new Vector3;
    accum_pass = 0;

    audio_playing = false;
    audio_start = 0;
    audio_len = 0;

    animation_playing = false;

    property_anim: { [name: string]: PropertyAnim } = Object.create(null);
    bezier_anim: { [name: string]: BezierAnim } = Object.create(null);
}

class AnimationData {
    name: string = "";
    next: string = "";
    node_cache: TrackNodeCache[] = [];
    animation: Animation = null;
}

class PlaybackData {
    from: AnimationData = null;
    pos = 0;
    speed_scale = 1;
}

class Blend {
    data: PlaybackData = null;
    blend_time = 0;
    blend_left = 0;
}

class Playback {
    blend: Blend[] = [];
    current = new PlaybackData;
    assigned = "";
    seeked = false;
    started = false;
}

export const ANIMATION_PROCESS_PHYSICS = 0;
export const ANIMATION_PROCESS_IDLE = 1;
export const ANIMATION_PROCESS_MANUAL = 2;

export const ANIMATION_METHOD_CALL_DEFERRED = 0;
export const ANIMATION_METHOD_CALL_IMMEDIATE = 1;

export class AnimationPlayer extends Node {
    get class() { return "AnimationPlayer" }

    is_animation_player = true;

    /**
     * If playing the current animation, otherwise the last played one.
     */
    get assigned_animation() { return this.playback.assigned }
    set assigned_animation(p_anim: string) {
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
    get current_animation() { return (this.is_playing() ? this.playback.assigned : "") }
    set current_animation(p_anim: string) {
        if (p_anim === "[stop]" || p_anim.length === 0) {
            this.stop();
        } else if (!this.is_playing() || this.playback.assigned !== p_anim) {
            this.play(p_anim);
        } else {
            // Same animation, do not replay from start
        }
    }

    get current_animation_length() { return this.playback.current.from.animation.length }

    get current_animation_position() { return this.playback.current.pos }

    set_playback_process_mode(p_mode: number) {
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

    set_root_node(value: string) {
        this.root_node = value;
        this.clear_caches();
    }

    /**
     * If true, updates animations in response to process-related notifications.
     */
    set_playback_active(value: boolean) {
        if (this.playback_active === value) {
            return;
        }

        this.playback_active = value;
        this._set_process(this.processing, true);
    }

    node_cache_map: { [key: string]: TrackNodeCache } = Object.create(null);

    cache_update = new NoShrinkArray<TrackNodeCache>();
    cache_update_prop = new NoShrinkArray<PropertyAnim>();
    cache_update_bezier = new NoShrinkArray<BezierAnim>();
    playing_caches = new Set<TrackNodeCache>();

    accum_pass = 1;
    playback_speed = 1;
    playback_default_blend_time = 0;

    animation_set: { [name: string]: AnimationData } = Object.create(null);

    blend_times: { [from_to: string]: number } = Object.create(null);

    playback = new Playback;

    queued: string[] = [];

    end_reached = false;
    end_notify = false;

    autoplay = "";
    playback_process_mode = ANIMATION_PROCESS_IDLE;
    method_call_mode = ANIMATION_METHOD_CALL_IMMEDIATE;
    processing = false;
    playback_active = true;

    root_node = "..";

    playing = false;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.anims !== undefined) {
            for (let key in data.anims) {
                this.add_animation(key, data.anims[key]);
            }
        }
        // find animations saved as "anims/name"
        for (let k in data) {
            if (k.startsWith("anims/")) {
                let anim_name = k.replace(/^anims\//, "");
                if (!this.animation_set[anim_name]) {
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

    _notification(p_what: number) {
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

    add_animation(name: string, animation: Animation): boolean {
        if (name in this.animation_set) {
            this.animation_set[name].animation = animation;
            this.clear_caches();
        } else {
            const ad = new AnimationData;
            ad.animation = animation;
            ad.name = name;
            this.animation_set[name] = ad;
        }

        return true;
    }

    /**
     * Shifts position in the animation timeline. Delta is the time in seconds to shift.
     */
    advance(time: number) {
        this._animation_process(time);
    }

    /**
     * Returns the name of the next animation in the queue.
     */
    animation_get_next(animation: string): string {
        return this.animation_set[animation].next || "";
    }

    /**
     * Triggers the anim_to animation when the anim_from animation completes.
     */
    animation_set_next(animation: string, next: string) {
        if (animation in this.animation_set) {
            this.animation_set[animation].next = next;
        }
    }

    /**
     * AnimationPlayer caches animated nodes. It may not notice if a node disappears,
     * so clear_caches forces it to update the cache again.
     */
    clear_caches() {
        this._stop_playing_caches();

        this.node_cache_map = Object.create(null);

        for (let name in this.animation_set) {
            this.animation_set[name].node_cache.length = 0;
        }

        this.cache_update.clear();
        this.cache_update_prop.clear();
        this.cache_update_bezier.clear();
    }

    /**
     * Clears all queued, unplayed animations.
     */
    clear_queue() {
        this.queued.length = 0;
    }

    find_animation(animation: Animation): string {
        for (let n in this.animation_set) {
            if (this.animation_set[n].animation === animation) {
                return n;
            }
        }
    }

    get_animation(name: string): Animation {
        if (!(name in this.animation_set)) return null;
        return this.animation_set[name].animation;
    }

    /**
     * Returns the list of stored animation names.
     */
    get_animation_list(animations?: string[]): string[] {
        if (!animations) {
            return Object.keys(this.animation_set);
        }

        for (let k in this.animation_set) {
            animations.push(k);
        }
        return animations;
    }

    /**
     * Get the blend time (in seconds) between two animations, referenced by their names.
     */
    get_blend_time(animation1: string, animation2: string): number {
        return this.blend_times[`${animation1}->${animation2}`] || 0;
    }

    /**
     * Specify a blend time (in seconds) between two animations, referenced by their names.
     */
    set_blend_time(animation1: string, animation2: string, time: number) {
        if (time === 0) {
            delete this.blend_times[`${animation1}->${animation2}`];
        } else {
            this.blend_times[`${animation1}->${animation2}`] = time;
        }
    }

    has_animation(name: string) {
        return name in this.animation_set;
    }

    /**
     * Play the animation with key name. Custom speed and blend times can be set.
     */
    play(name: string = "", custom_blend: number = -1, custom_scale: number = 1.0, from_end: boolean = false): this {
        if (!name) {
            name = this.playback.assigned;
        }

        if (!(name in this.animation_set)) {
            console.log(`Animation not found: ${name}`);
            return;
        }

        const c: Playback = this.playback;

        if (c.current.from) {
            let blend_time = 0;
            let bk = `${c.current.from.name}->${name}`;

            if (custom_blend >= 0) {
                blend_time = custom_blend;
            } else if (bk in this.blend_times) {
                blend_time = this.blend_times[bk];
            } else {
                bk = `*->${name}`;
                if (bk in this.blend_times) {
                    blend_time = this.blend_times[bk];
                } else {
                    bk = `${c.current.from.name}->*`;

                    if (bk in this.blend_times) {
                        blend_time = this.blend_times[bk];
                    }
                }
            }

            if (custom_blend < 0 && blend_time === 0 && this.playback_default_blend_time) {
                blend_time = this.playback_default_blend_time;
            }
            if (blend_time > 0) {
                const b = new Blend;
                b.blend_time = b.blend_left = blend_time;
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

        this.emit_signal("animation_started", c.assigned);

        const next = this.animation_get_next(name);
        if (next && (next in this.animation_set)) {
            this.queue(next);
        }
    }

    /**
     * Play the animation with key name in reverse.
     */
    play_backwards(name: string = "", custom_blend: number = -1) {
        return this.play(name, custom_blend, -1, true);
    }
    /**
     * Queue an animation for playback once the current one is done.
     */
    queue(name: string) {
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
     */
    seek(time: number, update: boolean = false) {
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
     * Stop the currently playing animation. If reset is true, the anim position is reset to 0.
     */
    stop(reset: boolean = true) {
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

    get_playing_speed(): number {
        if (!this.playing) {
            return 0;
        }
        return this.playback_speed * this.playback.current.speed_scale;
    }

    /* private */

    /**
     * @param {boolean} p_process
     * @param {boolean} [p_force]
     */
    _set_process(p_process: boolean, p_force: boolean = false) {
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

    _stop_playing_caches() {
        for (let E of this.playing_caches) {
            if (E.node && E.audio_playing) {
                // @ts-ignore
                E.node.stop();
            }
            if (E.node && E.animation_playing) {
                const player = E.node.is_animation_player ? (E.node as AnimationPlayer) : null;
                if (!player) {
                    continue;
                }
                player.stop();
            }
        }

        this.playing_caches.clear();
    }

    _animation_update_transforms() {
        const t = interp_xform;
        for (let i = 0; i < this.cache_update.length; i++) {
            const nc = this.cache_update.buffer[i];

            t.origin.copy(nc.loc_accum);
            t.basis.set_quat_scale(nc.rot_accum, nc.scale_accum);
            if (nc.skeleton && nc.bone_idx >= 0) {
                nc.skeleton.set_bone_pose(nc.bone_idx, t);
            } else if (nc.node_3d) {
                nc.node_3d.set_transform(t);
            }
        }
        this.cache_update.clear();

        for (let i = 0; i < this.cache_update_prop.length; i++) {
            const pa = this.cache_update_prop.buffer[i];

            switch (pa.special) {
                case SpecialProperty_NONE: {
                    if (pa.setter) {
                        pa.setter.call(pa.object, pa.value_accum);
                    } else {
                        set_indexed(pa.object, pa.subpath, pa.value_accum);
                    }
                } break;
                case SpecialProperty_NODE2D_POS: {
                    (pa.object as Node2D).set_position(pa.value_accum);
                } break;
                case SpecialProperty_NODE2D_ROT: {
                    (pa.object as Node2D).set_rotation(deg2rad(pa.value_accum));
                } break;
                case SpecialProperty_NODE2D_SCALE: {
                    (pa.object as Node2D).set_scale(pa.value_accum);
                } break;
            }
        }
        this.cache_update_prop.clear();

        for (let i = 0; i < this.cache_update_bezier.length; i++) {
            const ba = this.cache_update_bezier.buffer[i];

            if (ba.setter) {
                ba.setter.call(ba.object, ba.bezier_accum);
            } else {
                set_indexed(ba.object, ba.bezier_property, ba.bezier_accum);
            }
        }
        this.cache_update_bezier.clear();
    }

    _animation_process(delta: number) {
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
                        this.emit_signal("animation_changed", old, new_name);
                    }
                } else {
                    this.playing = false;
                    this._set_process(false);
                    if (this.end_notify) {
                        this.emit_signal("animation_finished", this.playback.assigned);
                    }
                }
                this.end_reached = false;
            }
        } else {
            this._set_process(false);
        }
    }
    _animation_process2(delta: number, started: boolean) {
        const c = this.playback;

        this.accum_pass++;

        this._animation_process_data(c.current, delta, 1.0, c.seeked && delta !== 0, started);
        if (delta !== 0) {
            c.seeked = false;
        }

        for (let i = c.blend.length - 1; i >= 0; i--) {
            const b = c.blend[i];
            const blend = b.blend_left / b.blend_time;
            this._animation_process_data(b.data, delta, blend, false, false);

            b.blend_left -= Math.abs(this.playback_speed * delta);

            if (b.blend_left < 0) {
                c.blend.splice(i, 1);
            }
        }
    }
    _animation_process_data(cd: PlaybackData, delta: number, blend: number, seeked: boolean, started: boolean) {
        delta = delta * this.playback_speed * cd.speed_scale;
        let next_pos = cd.pos + delta;

        const len = cd.from.animation.length;
        const loop = cd.from.animation.loop;

        if (!loop) {
            if (next_pos < 0) {
                next_pos = 0;
            } else if (next_pos > len) {
                next_pos = len;
            }

            const backwards = Math.sign((delta !== 0) ? delta : (1 / delta)) < 0;
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
    _animation_process_animation(p_anim: AnimationData, p_time: number, p_delta: number, p_interp: number, is_current: boolean, p_seeked: boolean, p_started: boolean) {
        this._ensure_node_caches(p_anim);

        const a = p_anim.animation;
        const can_call = this.is_inside_tree();

        for (let i = 0; i < a.tracks.length; i++) {
            if (p_anim.node_cache.length !== p_anim.animation.tracks.length) {
                this._ensure_node_caches(p_anim);
            }

            const track = a.tracks[i];
            const nc = p_anim.node_cache[i];

            if (!nc || !track.enabled) continue;

            if (track.get_key_count() === 0) {
                continue;
            }

            switch (track.type) {
                case TrackType_TRANSFORM: {
                    if (!nc.node_3d) {
                        continue;
                    }

                    a.transform_track_interpolate(i, p_time, interp_loc, interp_rot, interp_scale);

                    if (nc.accum_pass !== this.accum_pass) {
                        this.cache_update.push(nc);

                        nc.accum_pass = this.accum_pass;
                        nc.loc_accum.copy(interp_loc);
                        nc.rot_accum.copy(interp_rot);
                        nc.scale_accum.copy(interp_scale);
                    } else {
                        interp_loc2.copy(nc.loc_accum)
                            .linear_interpolate(interp_loc, track.interpolation, nc.loc_accum);
                        interp_rot2.copy(nc.rot_accum)
                            .slerp(interp_rot, track.interpolation, nc.rot_accum);
                        interp_scale2.copy(nc.scale_accum)
                            .linear_interpolate(interp_scale, track.interpolation, nc.scale_accum);
                    }
                } break;
                case TrackType_VALUE: {
                    if (!nc.node) {
                        continue;
                    }

                    const vt = track as ValueTrack;

                    const pa = nc.property_anim[track.path];

                    const update_mode = vt.update_mode;

                    if (update_mode === UpdateMode_CONTINUOUS || (p_delta === 0 && update_mode === UpdateMode_DISCRETE)) {
                        const value = a.value_track_interpolate(i, p_time);

                        if (value === null) {
                            continue;
                        }

                        if (pa.accum_pass !== this.accum_pass) {
                            this.cache_update_prop.push(pa);
                            if (pa.value_accum && pa.value_accum.copy) {
                                pa.value_accum.copy(value);
                            } else {
                                pa.value_accum = value;
                            }
                            pa.accum_pass = this.accum_pass;
                        } else {
                            // @Incomplete: Var.interpolate(pa.value_accum, value, p_interp, pa.value_accum);
                        }
                    } else if (is_current && p_delta !== 0) {
                        indices.clear();
                        a.value_track_get_key_indices(i, p_time, p_delta, indices);

                        for (let F of indices.buffer) {
                            const value = vt.values[F].value;
                            switch (pa.special) {
                                case SpecialProperty_NONE: {
                                    if (pa.setter) {
                                        pa.setter.call(pa.object, value);
                                    } else {
                                        set_indexed(pa.object, pa.subpath, value);
                                    }
                                } break;
                                case SpecialProperty_NODE2D_POS: {
                                    (pa.object as Node2D).set_position(value);
                                } break;
                                case SpecialProperty_NODE2D_ROT: {
                                    (pa.object as Node2D).set_rotation(deg2rad(value));
                                } break;
                                case SpecialProperty_NODE2D_SCALE: {
                                    (pa.object as Node2D).set_scale(value);
                                } break;
                            }
                        }
                    }
                } break;
                case TrackType_METHOD: {
                    if (!nc.node) {
                        continue;
                    }
                    if (p_delta === 0) {
                        continue;
                    }
                    if (!is_current) {
                        break;
                    }

                    indices.clear();
                    a.method_track_get_key_indices(i, p_time, p_delta, indices);

                    const mt = track as MethodTrack;
                    for (let E of indices.buffer) {
                        const k = mt.methods[i];

                        if (can_call) {
                            if (this.method_call_mode === ANIMATION_METHOD_CALL_DEFERRED) {
                                MessageQueue.get_singleton().push_call(nc.node, k.method, ...k.params);
                            } else {
                                (nc.node as any)[k.method].apply(nc.node, k.params);
                            }
                        }
                    }
                } break;
                case TrackType_BEZIER: {
                    if (!nc.node) {
                        continue;
                    }

                    const ba = nc.bezier_anim[track.path];

                    const bezier = a.bezier_track_interpolate(i, p_time);
                    if (ba.accum_pass !== this.accum_pass) {
                        this.cache_update_bezier.push(ba);
                        ba.bezier_accum = bezier;
                        ba.accum_pass = this.accum_pass;
                    } else {
                        ba.bezier_accum = lerp(ba.bezier_accum, bezier, p_interp);
                    }
                } break;
                case TrackType_AUDIO: {
                    // @Incomplete: audio support
                } break;
                case TrackType_ANIMATION: {
                    const player = nc.node as AnimationPlayer;
                    if (!player.is_animation_player) {
                        continue;
                    }

                    if (p_delta === 0 || p_seeked) {
                        // seek
                        let idx = a.track_find_key(i, p_time);
                        if (idx < 0) {
                            continue;
                        }

                        const pos = a.track_get_key_time(i, idx);

                        const anim_name = a.animation_track_get_key_animation(i, idx);
                        if (anim_name === "[stop]" || !player.has_animation(anim_name)) {
                            continue;
                        }

                        const anim = player.get_animation(anim_name);

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
                            player.assigned_animation = anim_name;
                            player.seek(at_anim_pos, true);
                        }
                    } else {
                        indices.clear();
                        a.track_get_key_indices_in_range(i, p_time, p_delta, indices);
                        if (indices.length) {
                            const idx = indices.buffer[indices.length - 1];

                            const anim_name = a.animation_track_get_key_animation(i, idx);
                            if (anim_name === "[stop]" || !player.has_animation(anim_name)) {
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

    _ensure_node_caches(p_anim: AnimationData, p_root_override: Node = null) {
        if (p_anim.node_cache.length === p_anim.animation.tracks.length) {
            return;
        }

        const parent = p_root_override || this.get_node(this.root_node);

        const a = p_anim.animation;
        const tracks = a.tracks;

        p_anim.node_cache.length = tracks.length;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            // @Incomplete: support path containing multiple resources
            //              something like `node:shape:extent`
            const paths = get_subpaths(track.path);

            const child = parent.get_node(paths[0]);
            const prop_path = paths[1];
            const id = child.instance_id;
            let bone_idx = -1;

            if (paths.length === 2 && child.is_skeleton) {
                const sk = child as Skeleton;
                bone_idx = sk.find_bone(prop_path);
                if (bone_idx === -1) {
                    continue;
                }
            }

            const key = `${id}.${bone_idx}`;

            if (!(key in this.node_cache_map)) {
                this.node_cache_map[key] = new TrackNodeCache;
            }

            const cache = p_anim.node_cache[i] = this.node_cache_map[key];
            cache.path = prop_path;
            cache.node = child;
            if (child.is_node_2d) {
                cache.node_2d = child as Node2D;
            }

            if (track.type === TrackType_TRANSFORM) {
                // cache spatial
                if (child.is_spatial) {
                    cache.node_3d = child as Spatial;
                }
                // cache skeleton
                if (child.is_skeleton) {
                    cache.skeleton = child as Skeleton;

                    if (paths.length === 2) {
                        cache.bone_idx = bone_idx;
                    } else {
                        cache.skeleton = null;
                    }
                }
            }

            if (track.type === TrackType_VALUE) {
                if (!p_anim.node_cache[i].property_anim[track.path]) {
                    const pa = p_anim.node_cache[i].property_anim[track.path] = new PropertyAnim;
                    pa.subpath = paths;
                    pa.object = get_subpath_target(child, paths);
                    pa.owner = p_anim.node_cache[i];

                    const vt = track as ValueTrack;
                    switch (vt.value_type) {
                        case ValueType_Vector2:
                        case ValueType_Rect2:
                        case ValueType_Transform2D:
                        case ValueType_Vector3:
                        case ValueType_Quat:
                        case ValueType_AABB:
                        case ValueType_Basis:
                        case ValueType_Transform:
                        case ValueType_Color: {
                            pa.value_accum = vt.values[0].value.clone();
                        } break;
                    }

                    // paths = [object = node, property], so we can try to cache `setter`
                    if (paths.length === 2) {
                        const setter = pa.object[`set_${paths[paths.length - 1]}`];
                        if (typeof setter === "function") {
                            pa.setter = setter;
                        }
                    }
                }
            }

            if (track.type === TrackType_BEZIER) {
                if (!p_anim.node_cache[i].bezier_anim[track.path]) {
                    const pa = p_anim.node_cache[i].bezier_anim[track.path] = new BezierAnim;
                    pa.bezier_property = paths;
                    pa.object = get_subpath_target(child, paths);
                    pa.owner = p_anim.node_cache[i];

                    // paths = [object = node, property], so we can try to cache `setter`
                    if (paths.length === 2) {
                        const setter = pa.object[`set_${paths[paths.length - 1]}`];
                        if (typeof setter === "function") {
                            pa.setter = setter;
                        }
                    }
                }
            }
        }
    }
}
node_class_map["AnimationPlayer"] = GDCLASS(AnimationPlayer, Node)

const interp_loc = new Vector3;
const interp_rot = new Quat;
const interp_scale = new Vector3;
const interp_xform = new Transform;

const interp_loc2 = new Vector3;
const interp_rot2 = new Quat;
const interp_scale2 = new Vector3;

const indices = new NoShrinkArray<number>();

function get_subpaths(path: string): string[] {
    return path.split(":");
}

function get_subpath_target(obj: any, paths: string[]): any {
    let i = 0;
    let target = obj;
    while ((i < paths.length - 1) && target) {
        if (paths[i] === ".") {
            i++;
            continue;
        } else {
            target = target[paths[i++]];
        }
    }
    return target;
}

function set_indexed(obj: any, paths: string[], value: any) {
    const target = (paths.length === 2) ? obj : get_subpath_target(obj, paths);
    if (target) {
        target[paths[paths.length - 1]] = value;
    }
}
