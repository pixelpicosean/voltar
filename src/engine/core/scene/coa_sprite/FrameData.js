import { Ref, Obj, Key, MainlineKey, Timeline, Model, CurveType, ObjectType, Animation, Spatial, ObjectInfo } from './Model';
import { closer_angle_linear, linear, bezier2, bezier3, bezier4, bezier5, bezier2d } from './math';
import { object_provider } from './Provider';

/**
 * @param {Array<Key>} keys
 * @param {Key} first
 * @param {boolean} looping
 * @returns {Key}
 */
function get_next_key(keys, first, looping) {
    if (keys.length === 1) {
        return null;
    }
    let key_id = first.id + 1;
    if (key_id >= keys.length) {
        if (!looping) {
            return null;
        }
        key_id = 0;
    }
    return keys[key_id];
}

/**
 * @param {Array<Key>} keys
 * @param {number} target_time
 * @returns {Key}
 */
function get_last_key(keys, target_time) {
    let current = null, key;
    for (let i = 0; i < keys.length; i++) {
        key = keys[i];
        if (key.time > target_time) break;
        current = key;
    }
    return current;
}

/**
 * Calculate the interpolation factor of the given value
 * @param {number} a
 * @param {number} b
 * @param {number} v
 * @returns {number}
 */
function get_num_factor(a, b, v) {
    return (v - a) / (b - a);
}

/**
 * Adjust the factor based on curve type of the key
 * @param {number} factor
 * @param {Key} key
 * @returns {number}
 */
function adjust_factor(factor, key) {
    switch (key.curve_type) {
        case CurveType.instant:
            factor = 0;
            break;
        case CurveType.linear:
            break;
        case CurveType.quadratic:
            factor = bezier2(0, key.c1, 1, factor);
            break;
        case CurveType.cubic:
            factor = bezier3(0, key.c1, key.c2, 1, factor);
            break;
        case CurveType.quartic:
            factor = bezier4(0, key.c1, key.c2, key.c3, 1, factor);
            break;
        case CurveType.quintic:
            factor = bezier5(0, key.c1, key.c2, key.c3, key.c4, 1, factor);
            break;
        case CurveType.bezier:
            factor = bezier2d(key.c1, key.c2, key.c3, key.c4, factor);
            break;
    }

    return factor;
}

/**
 * Calculate the interpolation factor of two keys.
 * @param {Key} key_a
 * @param {Key} key_b
 * @param {number} anim_length
 * @param {number} target_time
 * @returns {number}
 */
function get_factor(key_a, key_b, anim_length, target_time) {
    let time_a = key_a.time, time_b = key_b.time;

    if (time_a > time_b) {
        time_b += anim_length;
        if (target_time < time_a) {
            target_time += anim_length;
        }
    }

    let factor = get_num_factor(time_a, time_b, target_time);
    factor = adjust_factor(factor, key_a);
    return factor;
}

/**
 * @param {number} target_time
 * @param {Key} key_a
 * @param {Key} key_b
 * @param {number} anim_length
 */
function adjust_time(target_time, key_a, key_b, anim_length) {
    let next_time = key_b.time > key_a.time ? key_b.time : anim_length;
    let factor = get_factor(key_a, key_b, anim_length, target_time);
    return linear(key_a.time, next_time, factor);
}

/**
 * Checks if the given mainline keys are compatible for animation blending.
 * @param {MainlineKey} first_key
 * @param {MainlineKey} second_key
 * @returns {boolean}
 */
function will_it_blend(first_key, second_key) {
    // bone
    if (first_key.bone_ref) {
        if (!second_key.bone_ref) {
            return false;
        }
        if (first_key.bone_ref.length !== second_key.bone_ref.length) {
            return false;
        }
    }
    else if (second_key.bone_ref) {
        return false;
    }
    // object
    if (first_key.object_ref) {
        if (!second_key.object_ref) {
            return false;
        }
        if (first_key.object_ref.length !== second_key.object_ref.length) {
            return false;
        }
    }
    else if (second_key.object_ref) {
        return false;
    }
    // yes, we can blend now
    return true;
}

export class FrameData {
    constructor() {
        /**
         * @type {Array<Obj>}
         */
        this.sprite_data = [];
    }

    clear() {
        for (let obj of this.sprite_data) {
            object_provider.put_obj(obj);
        }
        this.sprite_data.length = 0;
    }
}

export class FrameDataCalculator {
    constructor() {
        this.frame_data = new FrameData();

        /**
         * @type {{a:MainlineKey, b:MainlineKey}}
         */
        this._key_group = {
            a: null,
            b: null,
        };
    }

    /**
     * @param {Animation} animation
     * @param {number} target_time
     * @param {number} delta
     * @param {Spatial} parent_info
     * @returns {FrameData}
     */
    get_frame_data(animation, target_time, delta, parent_info = null) {
        if (!parent_info) {
            this.frame_data.clear();
        }

        this.get_mainline_keys(animation.mainline, target_time);
        let key_a = this._key_group.a, key_b = this._key_group.b;

        let adjusted_time = adjust_time(target_time, key_a, key_b, animation.length);

        let bone_infos = this.get_bone_infos(key_a, animation, adjusted_time, parent_info);

        if (!key_a.object_ref) {
            // Recycle bone_infos
            if (bone_infos && bone_infos.length > 0) {
                for (let b of bone_infos) {
                    object_provider.put_spatial(b);
                }
                bone_infos.length = 0;
                bone_infos = null;
            }

            return this.frame_data;
        }

        for (let i = 0; i < key_a.object_ref.length; i++) {
            let obj_ref = key_a.object_ref[i];
            let interpolated = this.get_object_info(obj_ref, animation, adjusted_time);
            if (bone_infos && obj_ref.parent >= 0) {
                interpolated.apply_parent_transform(bone_infos[obj_ref.parent]);
            }
            else if (parent_info) {
                interpolated.apply_parent_transform(parent_info);
            }

            this.add_spatial_data(interpolated, animation.timeline[obj_ref.timeline], animation.entity.spriter, delta);
        }

        // Recycle bone_infos
        if (bone_infos && bone_infos.length > 0) {
            for (let b of bone_infos) {
                object_provider.put_spatial(b);
            }
            bone_infos.length = 0;
            bone_infos = null;
        }

        return this.frame_data;
    }

    /**
     * @param {Animation} first
     * @param {Animation} second
     * @param {number} target_time
     * @param {number} delta
     * @param {number} factor
     * @returns {FrameData}
     */
    get_frame_data_with_blend(first, second, target_time, delta, factor) {
        this.frame_data.clear();

        if (first === second) {
            return this.get_frame_data(first, target_time, delta);
        }

        let target_time_second = target_time / first.length * second.length;

        this.get_mainline_keys(first.mainline, target_time);
        let first_key_a = this._key_group.a, first_key_b = this._key_group.b;

        this.get_mainline_keys(second.mainline, target_time_second);
        let second_key_a = this._key_group.a, second_key_b = this._key_group.b;

        if (!will_it_blend(first_key_a, second_key_a) || !will_it_blend(first_key_b, second_key_b)) {
            return this.get_frame_data(first, target_time, delta);
        }

        let adjusted_time_first = adjust_time(target_time, first_key_a, first_key_b, first.length);
        let adjusted_time_second = adjust_time(target_time_second, second_key_a, second_key_b, second.length);

        let bone_infos_a = this.get_bone_infos(first_key_a, first, adjusted_time_first);
        let bone_infos_b = this.get_bone_infos(second_key_a, second, adjusted_time_second);
        /**
         * @type {Spatial[]}
         */
        let bone_infos = null;
        if (bone_infos_a && bone_infos_b) {
            // TODO: cache
            bone_infos = new Array(bone_infos_a.length);
            /** @type {Spatial} */
            let bone_a;
            /** @type {Spatial} */
            let bone_b;
            /** @type {Spatial} */
            let interpolated;
            for (let i = 0; i < bone_infos.length; i++) {
                bone_a = bone_infos_a[i];
                bone_b = bone_infos_b[i];
                interpolated = this.interpolate_spatial(bone_a, bone_b, factor, 1);
                interpolated.angle = closer_angle_linear(bone_a.angle, bone_b.angle, factor);
                bone_infos[i] = interpolated;
            }
        }

        let base_key = factor < 0.5 ? first_key_a : first_key_b;
        let current_animation = factor < 0.5 ? first : second;

        for (let i = 0; i < base_key.object_ref.length; i++) {
            let obj_ref_first = base_key.object_ref[i];
            let interpolated_first = this.get_object_info(obj_ref_first, first, adjusted_time_first);

            let obj_ref_second = second_key_a.object_ref[i];
            let interpolated_second = this.get_object_info(obj_ref_second, second, adjusted_time_second);

            let info = this.interpolate_obj(interpolated_first, interpolated_second, factor, 1);
            info.angle = closer_angle_linear(interpolated_first.angle, interpolated_second.angle, factor);
            info.pivot_x = linear(interpolated_first.pivot_x, interpolated_second.pivot_x, factor);
            info.pivot_y = linear(interpolated_first.pivot_y, interpolated_second.pivot_y, factor);

            if (bone_infos && obj_ref_first.parent >= 0) {
                info.apply_parent_transform(bone_infos[obj_ref_first.parent]);
            }

            this.add_spatial_data(info, current_animation.timeline[obj_ref_first.timeline], current_animation.entity.spriter, delta);

            object_provider.put_obj(interpolated_first);
            object_provider.put_obj(interpolated_second);
        }

        // Recycle bone info lists
        if (bone_infos_a && bone_infos_a.length > 0) {
            for (let b of bone_infos_a) {
                object_provider.put_spatial(b);
            }
            bone_infos_a.length = 0;
            bone_infos_a = null;
        }
        if (bone_infos_b && bone_infos_b.length > 0) {
            for (let b of bone_infos_b) {
                object_provider.put_spatial(b);
            }
            bone_infos_b.length = 0;
            bone_infos_b = null;
        }
        if (bone_infos && bone_infos.length > 0) {
            for (let b of bone_infos) {
                object_provider.put_spatial(b);
            }
            bone_infos.length = 0;
            bone_infos = null;
        }

        return this.frame_data;
    }

    /**
     * @param {Obj} info
     * @param {Timeline} timeline
     * @param {Model} spriter
     * @param {number} delta
     */
    add_spatial_data(info, timeline, spriter, delta) {
        switch (timeline.object_type) {
            case ObjectType.sprite:
                this.frame_data.sprite_data.push(info);
                break;
            case ObjectType.entity:
                let new_anim = spriter.entity[info.entity].animation[info.animation];
                let new_target_time = info.t * new_anim.length;
                this.get_frame_data(new_anim, new_target_time, delta, info);
                break;
        }
    }

    /**
     * @param {MainlineKey} key
     * @param {Animation} animation
     * @param {number} target_time
     * @param {Spatial} [parent]
     * @returns {Array<Spatial>}
     */
    get_bone_infos(key, animation, target_time, parent) {
        if (!key.bone_ref) {
            return null;
        }
        let ret = new Array(key.bone_ref.length);
        for (let i = 0; i < key.bone_ref.length; i++) {
            let r = key.bone_ref[i];
            let interpolated = this.get_bone_info(r, animation, target_time);

            if (r.parent >= 0) {
                interpolated.apply_parent_transform(ret[r.parent]);
            }
            else if (parent) {
                interpolated.apply_parent_transform(parent);
            }
            ret[i] = interpolated;
        }
        return ret;
    }
    /**
     * @param {Ref} ref
     * @param {Animation} animation
     * @param {number} target_time
     * @returns {Spatial}
     */
    get_bone_info(ref, animation, target_time) {
        let keys = animation.timeline[ref.timeline].key;
        let key_a = keys[ref.key];
        let key_b = get_next_key(keys, key_a, animation.looping);

        if (!key_b) {
            return object_provider.get_spatial(key_a.bone);
        }

        let factor = get_factor(key_a, key_b, animation.length, target_time);
        return this.interpolate_spatial(key_a.bone, key_b.bone, factor, key_a.spin);
    }

    /**
     * @param {Array<MainlineKey>} keys
     * @param {number} target_time
     */
    get_mainline_keys(keys, target_time) {
        let key_a = get_last_key(keys, target_time);
        if (!key_a) {
            key_a = keys[keys.length - 1];
        }
        let next_key = key_a.id + 1;
        if (next_key >= keys.length) {
            next_key = 0;
        }
        let key_b = keys[next_key];
        this._key_group.a = key_a;
        this._key_group.b = key_b;
    }

    /**
     * @param {Ref} ref
     * @param {Animation} animation
     * @param {number} target_time
     * @returns {Obj}
     */
    get_object_info(ref, animation, target_time) {
        let keys = animation.timeline[ref.timeline].key;
        let key_a = keys[ref.key];
        let key_b = get_next_key(keys, key_a, animation.looping);

        if (!key_b) {
            return object_provider.get_obj(key_a.object);
        }

        let factor = get_factor(key_a, key_b, animation.length, target_time);
        return this.interpolate_obj(key_a.object, key_b.object, factor, key_a.spin);
    }

    /**
     * @param {Spatial} a
     * @param {Spatial} b
     * @param {number} f
     * @param {number} spin
     * @returns {Spatial}
     */
    interpolate_spatial(a, b, f, spin) {
        let ss = object_provider.get_spatial(undefined);
        ss.interpolate(a, b, f, spin);
        return ss;
    }
    /**
     * @param {Obj} a
     * @param {Obj} b
     * @param {number} f
     * @param {number} spin
     * @returns {Obj}
     */
    interpolate_obj(a, b, f, spin) {
        let so = object_provider.get_obj(undefined);
        so.interpolate(a, b, f, spin);
        return so;
    }
}

export const frame_data_calculator = new FrameDataCalculator();
