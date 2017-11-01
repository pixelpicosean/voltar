import { Ref, Obj, Key, MainlineKey, Timeline, Model, CurveType, ObjectType, Animation, Spatial, ObjectInfo } from './Model';
import { linear, bezier2, bezier3, bezier4, bezier5, bezier2d } from './math';

/**
 * @param {Array<Key>} keys
 * @param {Key} first
 * @param {boolean} looping
 * @returns {Key}
 */
const get_next_key = (keys, first, looping) => {
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
};

/**
 * @param {Array<Key>} keys
 * @param {number} target_time 
 * @returns {Key}
 */
const get_last_key = (keys, target_time) => {
    let current = null, key;
    for (let i = 0; i < keys.length; i++) {
        key = keys[i];
        if (key.time > target_time) break;
        current = key;
    }
    return current;
};

/**
 * Calculate the interpolation factor of the given value
 * @param {number} a 
 * @param {number} b 
 * @param {number} v 
 * @returns {number}
 */
const get_num_factor = (a, b, v) => {
    return (v - a) / (b - a);
};

/**
 * Adjust the factor based on curve type of the key
 * @param {number} factor 
 * @param {Key} key 
 * @returns {number}
 */
const adjust_factor = (factor, key) => {
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
            // factor = bezier2d(key.c1, key.c2, key.c3, key.c4, factor);
            break;
    }

    return factor;
};

/**
 * Calculate the interpolation factor of two keys.
 * @param {Key} key_a 
 * @param {Key} key_b 
 * @param {number} anim_length
 * @param {number} target_time 
 * @returns {number}
 */
const get_factor = (key_a, key_b, anim_length, target_time) => {
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
};

/**
 * @param {number} target_time 
 * @param {Key} key_a 
 * @param {Key} key_b 
 * @param {number} anim_length 
 */
const adjust_time = (target_time, key_a, key_b, anim_length) => {
    let next_time = key_b.time > key_a.time ? key_b.time : anim_length;
    let factor = get_factor(key_a, key_b, anim_length, target_time);
    return linear(key_a.time, next_time, factor);
};

export class FrameData {
    constructor() {
        this.sprite_data = [];
    }

    clear() {
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

        let bone_infos = this.get_bone_infos(key_a, animation, adjust_time, parent_info);

        if (!key_a.object_ref) {
            // TODO: recycle bone_infos
            return this.frame_data;
        }

        for (let i = 0; i < key_a.object_ref.length; i++) {
            let obj_ref = key_a.object_ref[i];
            let interpolated = this.get_object_info(obj_ref, animation, adjust_time);
            if (bone_infos && obj_ref.parent >= 0) {
                interpolated.apply_parent_transform(bone_infos[obj_ref.parent]);
            }
            else if (parent_info) {
                interpolated.apply_parent_transform(parent_info);
            }

            this.add_spatial_data(interpolated, animation.timeline[obj_ref.timeline], animation.entity.spriter, delta);
        }

        // TODO: recycle bone_infos

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
     * @param {Spatial} parent 
     */
    get_bone_infos(key, animation, target_time, parent) {
        if (!key.bone_ref) {
            return null;
        }
        // TODO: recycle
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
     */
    get_bone_info(ref, animation, target_time) {
        let keys = animation.timeline[ref.timeline].key;
        let key_a = keys[ref.key];
        let key_b = get_next_key(keys, key_a, animation.looping);

        if (!key_b) {
            return this.copy_spatial(key_a.bone);
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
     * @param {string} name
     * @returns {Obj}
     */
    get_object_info(ref, animation, target_time) {
        let keys = animation.timeline[ref.timeline].key;
        let key_a = keys[ref.key];
        let key_b = get_next_key(keys, key_a, animation.looping);

        if (!key_b) {
            return this.copy_obj(key_a.object);
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
        // TODO: recycle
        let ss = new Spatial();
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
        // TODO: recycle
        let so = new Obj();
        so.interpolate(a, b, f, spin);
        return so;
    }
    /**
     * @param {Spatial} info 
     * @returns {Spatial}
     */
    copy_spatial(info) {
        // TODO: recycle
        let copy = new Spatial();
        copy.copy_spatial(info);
        return copy;
    }
    /**
     * @param {Obj} obj 
     * @returns {Obj}
     */
    copy_obj(obj) {
        // TODO: recycle
        let copy = new Obj();
        copy.copy_obj(obj);
        return copy;
    }
}
