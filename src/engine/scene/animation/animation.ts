import { res_class_map } from "engine/registry";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import {
    ease,
    is_equal_approx,
    lerp,
    posmod,
} from "engine/core/math/math_funcs";
import { Vector2 } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { Basis, Quat } from "engine/core/math/basis";
import { NoShrinkArray } from "engine/core/v_array";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";
import { AABB } from "engine/core/math/aabb";
import { Transform } from "engine/core/math/transform";
import { Color } from "engine/core/color";
import { cubic_bezier } from "engine/core/math/interpolations";
import { Plane } from "engine/core/math/plane";


export const TrackType_VALUE = 0;      // value
export const TrackType_TRANSFORM = 1;  // transform a node or a bone
export const TrackType_METHOD = 2;     // call any method on a specific node
export const TrackType_BEZIER = 3;     // bezier curve
export const TrackType_AUDIO = 4;
export const TrackType_ANIMATION = 5;

export const Interpolation_NEAREST = 0;
export const Interpolation_LINEAR = 1;
export const Interpolation_CUBIC = 2;

export const UpdateMode_CONTINUOUS = 0;
export const UpdateMode_DISCRETE = 1;
export const UpdateMode_TRIGGER = 2;

export const ValueType_Number = 0;
export const ValueType_TransformKey = 1;
export const ValueType_Vector3 = 2;
export const ValueType_Quat = 3;
export const ValueType_Any = 4;
export const ValueType_Boolean = 10;
export const ValueType_String = 11;
export const ValueType_Vector2 = 12;
export const ValueType_Rect2 = 13;
export const ValueType_Transform2D = 14;
export const ValueType_Plane = 15;
export const ValueType_AABB = 16;
export const ValueType_Basis = 17;
export const ValueType_Transform = 18;
export const ValueType_Color = 19;

const TypeMap = {
    number: ValueType_Number,
    boolean: ValueType_Boolean,
    string: ValueType_String,
    any: ValueType_Any,

    TransformKey: ValueType_TransformKey,
    Vector3: ValueType_Vector3,
    Quat: ValueType_Quat,
    Vector2: ValueType_Vector2,
    Rect2: ValueType_Rect2,
    Transform2D: ValueType_Transform2D,
    Plane: ValueType_Plane,
    AABB: ValueType_AABB,
    Basis: ValueType_Basis,
    Transform: ValueType_Transform,
    Color: ValueType_Color,
};
const CtorMap: { [type: string]: new () => any } = {
    number: null,
    boolean: null,
    string: null,
    any: null,

    TransformKey: null,
    Vector3: Vector3,
    Quat: Quat,
    Vector2: Vector2,
    Rect2: Rect2,
    Transform2D: Transform2D,
    Plane: Plane,
    AABB: AABB,
    Basis: Basis,
    Transform: Transform,
    Color: Color,
};

export class Track {
    type = 0;
    interpolation = Interpolation_LINEAR;
    loop_wrap = true;
    path = "";
    enabled = true;

    load(data: any) {
        this.path = data.path;
        this.interpolation = data.interp;
        this.loop_wrap = !!data.loop_wrap;
        this.enabled = !!data.enabled;

        return this;
    }

    get_key_count(): number {
        switch (this.type) {
            case TrackType_TRANSFORM: {
                return (this as any as TransformTrack).transforms.length;
            }
            case TrackType_VALUE: {
                return (this as any as ValueTrack).values.length;
            }
            default: {
                return 0;
            }
        }
    }
}

export class TKey<T> {
    transition = 1;
    time = 0;
    value: T = null;
}

export class TransformKey {
    loc = new Vector3;
    rot = new Quat;
    scale = new Vector3;

    copy(other: TransformKey): TransformKey {
        this.loc.copy(other.loc);
        this.rot.copy(other.rot);
        this.scale.copy(other.scale);

        return this;
    }
}

export class TransformTrack extends Track {
    type = TrackType_TRANSFORM;
    transforms: TKey<TransformKey>[] = [];

    load(data: any) {
        super.load(data);

        const len = data.keys.times.length;

        this.transforms.length = len;
        for (let i = 0; i < len; i++) {
            const key = new TKey<TransformKey>();
            key.time = data.keys.times[i];
            key.transition = data.keys.transitions[i];
            key.value = new TransformKey();

            const t = key.value;
            const values = data.keys.values;
            t.loc.set(values[i * 10 + 0], values[i * 10 + 1], values[i * 10 + 2]);
            t.rot.set(values[i * 10 + 3], values[i * 10 + 4], values[i * 10 + 5], values[i * 10 + 6]);
            t.scale.set(values[i * 10 + 7], values[i * 10 + 8], values[i * 10 + 9]);

            this.transforms[i] = key;
        }

        return this;
    }
}

export class ValueTrack extends Track {
    type = TrackType_VALUE;
    update_mode = UpdateMode_CONTINUOUS;
    update_on_seek = false;
    values: TKey<any>[] = [];

    value_type = -1;

    load(data: any) {
        super.load(data);

        this.update_mode = data.keys.update;

        const len = data.keys.times.length;

        let ctor = null;

        if (data.value_type) {
            this.value_type = TypeMap[data.value_type as (keyof typeof TypeMap)] || ValueType_Any;
            ctor = CtorMap[data.value_type as (keyof typeof CtorMap)] || null;
        }

        // guess value type
        if (this.value_type === -1) {
            // - find a valid value
            let i = 0;
            let first = data.keys.values[0];
            while (first === null && i < data.keys.values.length) {
                first = data.keys.values[i++];
            }

            // ValueType_Transform2D     ?
            // ValueType_Plane           ?
            // ValueType_AABB            ?
            // ValueType_Basis           ?
            // ValueType_Transform       ?
            switch (typeof first) {
                case "number": {
                    this.value_type = ValueType_Number;
                } break;
                case "object": {
                    // is an instance of something, let's skip
                    if ("class" in first) {
                        this.value_type = ValueType_Any;
                        break;
                    }

                    if (first.x !== undefined && first.y !== undefined) {
                        if (first.width !== undefined && first.height !== undefined) {
                            this.value_type = ValueType_Rect2;
                            ctor = Rect2;
                        } else if (first.z !== undefined) {
                            if (first.w !== undefined) {
                                this.value_type = ValueType_Quat;
                                ctor = Quat;
                            } else {
                                this.value_type = ValueType_Vector3;
                                ctor = Vector3;
                            }
                        } else {
                            this.value_type = ValueType_Vector2;
                            ctor = Vector2;
                        }
                    } else if (first.r !== undefined && first.g !== undefined && first.b !== undefined && first.a !== undefined) {
                        this.value_type = ValueType_Color;
                        ctor = Color;
                    } else {
                        this.value_type = ValueType_Any;
                    }
                } break;
                case "boolean": {
                    this.value_type = ValueType_Boolean;
                } break;
                case "string": {
                    this.value_type = ValueType_String;
                } break;
            }
        }

        this.values.length = len;
        for (let i = 0; i < len; i++) {
            let key = new TKey<any>();
            key.time = data.keys.times[i];
            key.transition = data.keys.transitions[i];
            if (ctor) {
                key.value = (new ctor as any).copy(data.keys.values[i]);
            } else {
                key.value = data.keys.values[i];
            }
            this.values[i] = key;
        }

        return this;
    }
}

export class MethodKey extends TKey<any> {
    method = "";
    params: any[] = [];
}

export class MethodTrack extends Track {
    type = TrackType_METHOD;
    methods: MethodKey[] = [];

    load(data: any) {
        super.load(data);

        const len = data.keys.times.length;

        this.methods.length = len;
        for (let i = 0; i < len; i++) {
            let key = new MethodKey;
            key.time = data.keys.times[i];
            key.value = data.keys.values[i];
            this.methods[i] = key;
        }

        return this;
    }
}

class BezierKey {
    in_handle = new Vector2;
    out_handle = new Vector2;
    value = 0;
}

export class BezierTrack extends Track {
    type = TrackType_BEZIER;
    values: TKey<BezierKey>[] = [];

    load(data: any) {
        super.load(data);

        const len = data.keys.times.length;
        const rv = data.keys.values;

        this.values.length = len;
        for (let i = 0; i < len; i++) {
            let key = new TKey<BezierKey>();
            key.time = data.keys.times[i];
            key.transition = 0;
            key.value = new BezierKey;
            key.value.value = rv[i * 5 + 0];
            key.value.in_handle.x = rv[i * 5 + 1];
            key.value.in_handle.y = rv[i * 5 + 2];
            key.value.out_handle.x = rv[i * 5 + 3];
            key.value.out_handle.y = rv[i * 5 + 4];
            this.values[i] = key;
        }

        return this;
    }
}

export class AudioKey {
    stream: any = null;
    start_offset = 0;
    end_offset = 0;
}

export class AudioTrack extends Track {
    type = TrackType_AUDIO;
    values: TKey<AudioKey>[] = [];

    load(data: any) {
        super.load(data);

        const len = data.keys.times.length;

        this.values.length = len;
        for (let i = 0; i < len; i++) {
            let key = new TKey<AudioKey>();
            key.time = data.keys.times[i];
            key.value = new AudioKey;
            const d2 = data.keys.values[i];
            key.value.start_offset = d2.start_offset;
            key.value.end_offset = d2.end_offset;
            key.value.stream = d2.stream;
            this.values[i] = key;
        }

        return this;
    }
}

export class AnimationTrack extends Track {
    type = TrackType_ANIMATION;
    values: TKey<string>[] = [];

    load(data: any) {
        super.load(data);

        this.values.length = 0;
        for (let i = 0; i < data.keys.times.length; i++) {
            let key: TKey<string> = new TKey;
            key.time = data.keys.times[i];
            key.value = data.keys.values[i];
            this.values.push(key);
        }

        return this;
    }
}

export class Animation {
    name = '';

    length = 1;
    step = 0.1;
    loop = false;

    tracks: Track[] = null;

    _load_data(data: any) {
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

        this.tracks = data.tracks.map((track_data: any) => {
            switch (track_data.type) {
                case 'transform': return new TransformTrack().load(track_data);
                case 'value': return new ValueTrack().load(track_data);
                case 'method': return new MethodTrack().load(track_data);
                case 'bezier': return new BezierTrack().load(track_data);
                case 'audio': return new AudioTrack().load(track_data);
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

    track_find_key(p_track: number, p_time: number, p_exact: boolean = false) {
        let t = this.tracks[p_track];
        switch (t.type) {
            case TrackType_TRANSFORM: {
                const tt = t as TransformTrack;
                const k = this._find(tt.transforms, p_time);
                if (k < 0 || k >= tt.transforms.length) {
                    return -1;
                }
                if (tt.transforms[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            }
            case TrackType_VALUE:
            case TrackType_BEZIER:
            case TrackType_AUDIO:
            case TrackType_ANIMATION: {
                const vt = t as (ValueTrack | BezierTrack | AudioTrack | AnimationTrack);
                const k = this._find(vt.values, p_time);
                if (k < 0 || k >= vt.values.length) {
                    return -1;
                }
                if (vt.values[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            }
            case TrackType_METHOD: {
                const mt = t as MethodTrack;
                const k = this._find(mt.methods, p_time);
                if (k < 0 || k >= mt.methods.length) {
                    return -1;
                }
                if (mt.methods[k].time !== p_time && p_exact) {
                    return -1;
                }
                return k;
            }
        }
        return -1;
    }

    track_get_key_time(p_track: number, p_key_idx: number) {
        let t = this.tracks[p_track];
        switch (t.type) {
            case TrackType_TRANSFORM: {
                return (t as TransformTrack).transforms[p_key_idx].time;
            }
            case TrackType_VALUE:
            case TrackType_BEZIER:
            case TrackType_AUDIO:
            case TrackType_ANIMATION: {
                return (t as ValueTrack).values[p_key_idx].time;
            }
            case TrackType_METHOD: {
                return (t as MethodTrack).methods[p_key_idx].time;
            }
        }
        return -1;
    }

    animation_track_get_key_animation(p_track: number, p_key: number) {
        let at = this.tracks[p_track] as AnimationTrack;
        if (at.type !== TrackType_ANIMATION) return "";

        return at.values[p_key].value;
    }

    track_get_key_indices_in_range(p_track: number, p_time: number, p_delta: number, p_indices: NoShrinkArray<number>) {
        const t = this.tracks[p_track];

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
                    case TrackType_TRANSFORM: {
                        const tt = t as TransformTrack;
                        this._track_get_key_indices_in_range(tt.transforms, from_time, this.length, p_indices);
                        this._track_get_key_indices_in_range(tt.transforms, 0, to_time, p_indices);
                    } break;
                    case TrackType_VALUE:
                    case TrackType_BEZIER:
                    case TrackType_AUDIO:
                    case TrackType_ANIMATION: {
                        const vt = t as ValueTrack;
                        this._track_get_key_indices_in_range(vt.values, from_time, this.length, p_indices);
                        this._track_get_key_indices_in_range(vt.values, 0, to_time, p_indices);
                    } break;
                    case TrackType_METHOD: {
                        const mt = t as MethodTrack;
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
                case TrackType_TRANSFORM: {
                    const tt = t as TransformTrack;
                    this._track_get_key_indices_in_range(tt.transforms, from_time, to_time, p_indices);
                } break;
                case TrackType_VALUE:
                case TrackType_BEZIER:
                case TrackType_AUDIO:
                case TrackType_ANIMATION: {
                    const vt = t as ValueTrack;
                    this._track_get_key_indices_in_range(vt.values, from_time, to_time, p_indices);
                } break;
                case TrackType_METHOD: {
                    const mt = t as MethodTrack;
                    this._track_get_key_indices_in_range(mt.methods, from_time, to_time, p_indices);
                } break;
            }
        }
    }

    _track_get_key_indices_in_range<T>(p_array: TKey<T>[], from_time: number, to_time: number, p_indices: NoShrinkArray<number>) {
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

    value_track_get_key_indices(p_track: number, p_time: number, p_delta: number, p_indices: NoShrinkArray<number>) {
        const vt = this.tracks[p_track] as ValueTrack;

        let from_time = p_time - p_delta;
        let to_time = p_time;

        if (from_time > to_time) {
            let t = from_time;
            from_time = to_time;
            to_time = t;
        }

        if (this.loop) {
            from_time = posmod(from_time, this.length);
            to_time = posmod(to_time, this.length);

            if (from_time > to_time) {
                this._value_track_get_key_indices_in_range(vt, from_time, this.length, p_indices);
                this._value_track_get_key_indices_in_range(vt, 0, to_time, p_indices);
                return;
            }
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

        this._value_track_get_key_indices_in_range(vt, from_time, to_time, p_indices);
    }

    _value_track_get_key_indices_in_range(vt: ValueTrack, from_time: number, to_time: number, p_indices: NoShrinkArray<number>) {
        if (from_time !== this.length && to_time === this.length) {
            to_time = this.length * 1.001;
        }
        let to = this._find(vt.values, to_time);

        if (to >= 0 && from_time === to_time && vt.values[to].time === from_time) {
            p_indices.push(to);
            return;
        }

        if (to >= 0 && vt.values[to].time >= to_time) {
            to--;
        }

        if (to < 0) {
            return;
        }

        let from = this._find(vt.values, from_time);

        if (from < 0 || vt.values[from].time < from_time) {
            from++;
        }

        for (let i = from; i <= to; i++) {
            p_indices.push(i);
        }
    }

    method_track_get_key_indices(p_track: number, p_time: number, p_delta: number, p_indices: NoShrinkArray<number>) {
        const mt = this.tracks[p_track] as MethodTrack;

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
                this._method_track_get_key_indices_in_range(mt, from_time, this.length, p_indices);
                this._method_track_get_key_indices_in_range(mt, 0, to_time, p_indices);
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

            this._method_track_get_key_indices_in_range(mt, from_time, to_time, p_indices);
        }
    }

    _method_track_get_key_indices_in_range(mt: MethodTrack, from_time: number, to_time: number, p_indices: NoShrinkArray<number>) {
        if (from_time !== this.length && to_time === this.length) {
            to_time = this.length * 1.01;
        }
        let to = this._find(mt.methods, to_time);

        if (to >= 0 && mt.methods[to].time >= to_time) {
            to--;
        }

        if (to < 0) {
            return;
        }

        let from = this._find(mt.methods, from_time);

        if (from < 0 || mt.methods[from].time < from_time) {
            from++;
        }

        for (let i = from; i <= to; i++) {
            p_indices.push(i);
        }
    }

    value_track_interpolate(p_track: number, p_time: number) {
        const vt = this.tracks[p_track] as ValueTrack;
        return this._interpolate(vt.value_type, vt.values, p_time, (vt.update_mode === UpdateMode_CONTINUOUS) ? vt.interpolation : Interpolation_NEAREST, vt.loop_wrap, null);
    }

    transform_track_interpolate(p_track: number, p_time: number, r_loc: Vector3, r_rot: Quat, r_scale: Vector3) {
        const tt = this.tracks[p_track] as TransformTrack;

        const tk = reset_transform_key(tmp_transform_key);

        this._interpolate(ValueType_TransformKey, tt.transforms, p_time, tt.interpolation, tt.loop_wrap, tk);

        r_loc.copy(tk.loc);
        r_rot.copy(tk.rot);
        r_scale.copy(tk.scale);
    }

    bezier_track_interpolate(p_track: number, p_time: number) {
        const bt = this.tracks[p_track] as BezierTrack;

        const len = this._find(bt.values, this.length) + 1;

        if (len <= 0) {
            return 0;
        } else if (len === 1) {
            return bt.values[0].value.value;
        }

        const idx = this._find(bt.values, p_time);

        if (idx < 0) {
            return bt.values[0].value.value;
        }

        if (idx >= bt.values.length - 1) {
            return bt.values[bt.values.length - 1].value.value;
        }

        const t = p_time - bt.values[idx].time;

        const iterations = 10;

        const duration = bt.values[idx + 1].time - bt.values[idx].time;
        let low = 0;
        let high = 1;
        let middle = 0;

        const start = _i_bezier_track_interpolate_Vector2_1.set(0, bt.values[idx].value.value);
        const start_out = _i_bezier_track_interpolate_Vector2_2.copy(start).add(bt.values[idx].value.out_handle);
        const end = _i_bezier_track_interpolate_Vector2_3.set(duration, bt.values[idx + 1].value.value);
        const end_in = _i_bezier_track_interpolate_Vector2_4.copy(end).add(bt.values[idx + 1].value.in_handle);

        for (let i = 0; i < iterations; i++) {
            middle = (low + high) / 2;

            const interp = _bezier_interp(middle, start, start_out, end_in, end, _i_bezier_track_interpolate_Vector2_5);

            if (interp.x < t) {
                low = middle;
            } else {
                high = middle;
            }
        }

        // interpolate the result:
        const low_pos = _bezier_interp(low, start, start_out, end_in, end, _i_bezier_track_interpolate_Vector2_6);
        const high_pos = _bezier_interp(high, start, start_out, end_in, end, _i_bezier_track_interpolate_Vector2_7);
        const c = (t - low_pos.x) / (high_pos.x - low_pos.x);

        return low_pos.linear_interpolate(high_pos, c, _i_bezier_track_interpolate_Vector2_8).y;
    }

    _interpolate<T>(value_type: number, p_keys: TKey<T>[], p_time: number, p_interp: number, p_loop_wrap: boolean, r_out?: T): T {
        const len = this._find(p_keys, this.length) + 1;

        if (len <= 0) {
            switch (value_type) {
                case ValueType_Number: {
                    return 0 as any as T;
                }
                case ValueType_Boolean: {
                    return false as any as T;
                }
                case ValueType_String: {
                    return "" as any as T;
                }
                case ValueType_TransformKey: {
                    return reset_transform_key(r_out as any as TransformKey) as any as T;
                }
                case ValueType_Vector2: {
                    if (!r_out) r_out = _i_interpolate_Vector2 as any;
                    return (r_out as any as Vector2).set(0, 0) as any as T;
                }
                case ValueType_Rect2: {
                    if (!r_out) r_out = _i_interpolate_Rect2 as any;
                    return (r_out as any as Rect2).set(0, 0, 0, 0) as any as T;
                }
                case ValueType_Transform2D: {
                    if (!r_out) r_out = _i_interpolate_Transform2D as any;
                    return (r_out as any as Transform2D).identity() as any as T;
                }
                case ValueType_AABB: {
                    if (!r_out) r_out = _i_interpolate_AABB as any;
                    return (r_out as any as AABB).set(0, 0, 0, 0, 0, 0) as any as T;
                }
                case ValueType_Basis: {
                    if (!r_out) r_out = _i_interpolate_Basis as any;
                    return (r_out as any as Basis).identity() as any as T;
                }
                case ValueType_Transform: {
                    if (!r_out) r_out = _i_interpolate_Transform_1 as any;
                    return (r_out as any as Transform).identity() as any as T;
                }
                case ValueType_Vector3: {
                    if (!r_out) r_out = _i_interpolate_Vector3 as any;
                    return (r_out as any as Vector3).set(0, 0, 0) as any as T;
                }
                case ValueType_Quat: {
                    if (!r_out) r_out = _i_interpolate_Quat as any;
                    return (r_out as any as Quat).set(0, 0, 0, 1) as any as T;
                }
                default: {
                    return null;
                }
            }
        } else if (len === 1) {
            if (r_out && (r_out as any).copy) {
                return (r_out as any).copy(p_keys[0].value) as T;
            } else {
                return p_keys[0].value;
            }
        }

        let idx = this._find(p_keys, p_time);

        let result = true;
        let next = 0;
        let c = 0;

        if (this.loop && p_loop_wrap) {
            // loop
            if (idx >= 0) {
                if ((idx + 1) < len) {
                    next = idx + 1;
                    let delta = p_keys[next].time - p_keys[idx].time;
                    let from = p_time - p_keys[idx].time;

                    if (Math.abs(delta) < CMP_EPSILON) {
                        c = 0;
                    } else {
                        c = from / delta;
                    }
                } else {
                    next = 0;
                    let delta = (this.length - p_keys[idx].time) + p_keys[next].time;
                    let from = p_time - p_keys[idx].time;

                    if (Math.abs(delta) < CMP_EPSILON) {
                        c = 0;
                    } else {
                        c = from / delta;
                    }
                }
            } else {
                // on loop, behind first key
                idx = len - 1;
                next = 0;
                let endtime = (this.length - p_keys[idx].time);
                if (endtime < 0) {
                    endtime = 0;
                }
                let delta = endtime + p_keys[next].time;
                let from = endtime + p_time;

                if (Math.abs(delta) < CMP_EPSILON) {
                    c = 0;
                } else {
                    c = from / delta;
                }
            }
        } else {
            // no loop
            if (idx >= 0) {
                if ((idx + 1) < len) {
                    next = idx + 1;
                    let delta = p_keys[next].time - p_keys[idx].time;
                    let from = p_time - p_keys[idx].time;

                    if (Math.abs(delta) < CMP_EPSILON) {
                        c = 0;
                    } else {
                        c = from / delta;
                    }
                } else {
                    next = idx;
                }
            } else {
                if (this.loop) {
                    idx = next = 0;
                } else {
                    result = false;
                }
            }
        }

        if (!result) {
            switch (value_type) {
                case ValueType_Number: {
                    return 0 as any as T;
                }
                case ValueType_Boolean: {
                    return false as any as T;
                }
                case ValueType_String: {
                    return "" as any as T;
                }
                case ValueType_TransformKey: {
                    return reset_transform_key(r_out as any as TransformKey) as any as T;
                }
                case ValueType_Vector2: {
                    if (!r_out) r_out = _i_interpolate_Vector2 as any;
                    return (r_out as any as Vector2).set(0, 0) as any as T;
                }
                case ValueType_Rect2: {
                    if (!r_out) r_out = _i_interpolate_Rect2 as any;
                    return (r_out as any as Rect2).set(0, 0, 0, 0) as any as T;
                }
                case ValueType_Transform2D: {
                    if (!r_out) r_out = _i_interpolate_Transform2D as any;
                    return (r_out as any as Transform2D).identity() as any as T;
                }
                case ValueType_AABB: {
                    if (!r_out) r_out = _i_interpolate_AABB as any;
                    return (r_out as any as AABB).set(0, 0, 0, 0, 0, 0) as any as T;
                }
                case ValueType_Basis: {
                    if (!r_out) r_out = _i_interpolate_Basis as any;
                    return (r_out as any as Basis).identity() as any as T;
                }
                case ValueType_Transform: {
                    if (!r_out) r_out = _i_interpolate_Transform_1 as any;
                    return (r_out as any as Transform).identity() as any as T;
                }
                case ValueType_Vector3: {
                    if (!r_out) r_out = _i_interpolate_Vector3 as any;
                    return (r_out as any as Vector3).set(0, 0, 0) as any as T;
                }
                case ValueType_Quat: {
                    if (!r_out) r_out = _i_interpolate_Quat as any;
                    return (r_out as any as Quat).set(0, 0, 0, 1) as any as T;
                }
                default: {
                    return null;
                }
            }
        }

        const tr = p_keys[idx].transition;

        if (tr === 0 || idx === next) {
            if (r_out && (r_out as any).copy) {
                return (r_out as any).copy(p_keys[idx].value) as T;
            } else {
                return p_keys[idx].value;
            }
        }

        if (tr !== 1) {
            c = ease(c, tr);
        }

        switch (p_interp) {
            case Interpolation_NEAREST: {
                if (r_out && (r_out as any).copy) {
                    return (r_out as any).copy(p_keys[idx].value) as T;
                } else {
                    return p_keys[idx].value;
                }
            }
            case Interpolation_LINEAR: {
                switch (value_type) {
                    case ValueType_TransformKey: {
                        return this._interpolate_TransformKey(p_keys[idx].value as any as TransformKey, p_keys[next].value as any as TransformKey, c, r_out as any as TransformKey) as any as T;
                    }
                    default: {
                        return this._interpolate_Any(value_type, p_keys[idx].value as any, p_keys[next].value as any, c) as any as T;
                    }
                }
            }
            case Interpolation_CUBIC: {
                let pre = idx - 1;
                if (pre < 0) {
                    pre = 0;
                }
                let post = next + 1;
                if (post >= len) {
                    post = next;
                }

                switch (value_type) {
                    case ValueType_TransformKey: {
                        return this._cubic_interpolate_TransformKey(p_keys[pre].value as any as TransformKey, p_keys[idx].value as any as TransformKey, p_keys[next].value as any as TransformKey, p_keys[post].value as any as TransformKey, c, r_out as any as TransformKey) as any as T;
                    }
                    default: {
                        return this._cubic_interpolate_Any(value_type, p_keys[pre].value as any as any, p_keys[idx].value as any, p_keys[next].value as any, p_keys[post].value as any, c) as any as T;
                    }
                }
            }
            default: {
                if (r_out && (r_out as any).copy) {
                    return (r_out as any).copy(p_keys[idx].value) as T;
                } else {
                    return p_keys[idx].value;
                }
            }
        }
    }

    _interpolate_TransformKey(p_a: TransformKey, p_b: TransformKey, c: number, r_out: TransformKey): TransformKey {
        p_a.loc.linear_interpolate(p_b.loc, c, r_out.loc);
        p_a.rot.slerp(p_b.rot, c, r_out.rot);
        p_a.scale.linear_interpolate(p_b.scale, c, r_out.scale);
        return r_out;
    }
    _interpolate_Any(value_type: number, p_a: any, p_b: any, c: number): any {
        switch (value_type) {
            case ValueType_Number: {
                return p_a + (p_b - p_a) * c;
            }
            case ValueType_String: {
                const len = Math.floor(p_a.length + (p_b.length - p_a.length) * c);
                if (len === 0) {
                    return "";
                }
                const split = Math.floor(len / 2);
                let dst = "";
                for (let i = 0; i < len; i++) {
                    if (i < split) {
                        if (i < p_a.length) {
                            dst += p_a[i];
                        } else if (i < p_b.length) {
                            dst += p_b[i];
                        }
                    } else {
                        if (i < p_b.length) {
                            dst += p_b[i];
                        } else if (i < p_a.length) {
                            dst += p_a[i];
                        }
                    }
                }
                return dst;
            }
            case ValueType_Vector2: {
                return (p_a as Vector2).linear_interpolate(p_b, c, _i_interpolate_Vector2);
            }
            case ValueType_Rect2: {
                _i_interpolate_Rect2.x = lerp(p_a.x, p_b.x, c);
                _i_interpolate_Rect2.y = lerp(p_a.y, p_b.y, c);
                _i_interpolate_Rect2.width = lerp(p_a.width, p_b.width, c);
                _i_interpolate_Rect2.height = lerp(p_a.height, p_b.height, c);
                return _i_interpolate_Rect2;
            }
            case ValueType_Vector3: {
                return (p_a as Vector3).linear_interpolate(p_b, c, _i_interpolate_Vector3);
            }
            case ValueType_Transform2D: {
                return (p_a as Transform2D).interpolate_with(p_b, c, _i_interpolate_Transform2D);
            }
            case ValueType_Quat: {
                return (p_a as Quat).slerp(p_b, c, _i_interpolate_Quat);
            }
            case ValueType_AABB: {
                (p_a as AABB).position.linear_interpolate(p_b.position, c, _i_interpolate_AABB.position);
                (p_a as AABB).size.linear_interpolate(p_b.size, c, _i_interpolate_AABB.size);
                return _i_interpolate_AABB;
            }
            case ValueType_Basis: {
                _i_interpolate_Transform_1.basis.copy(p_a);
                _i_interpolate_Transform_1.origin.set(0, 0, 0);
                _i_interpolate_Transform_2.basis.copy(p_b);
                _i_interpolate_Transform_2.origin.set(0, 0, 0);
                return (_i_interpolate_Transform_1).interpolate_with(_i_interpolate_Transform_2, c, _i_interpolate_Transform_3).basis;
            }
            case ValueType_Transform: {
                return (p_a as Transform).interpolate_with(p_b, c, _i_interpolate_Transform_1);
            }
            case ValueType_Color: {
                return (p_a as Color).linear_interpolate(p_b, c, _i_interpolate_Color);
            }
            default: {
                return p_a;
            }
        }
    }

    _cubic_interpolate_TransformKey(p_pre_a: TransformKey, p_a: TransformKey, p_b: TransformKey, p_post_b: TransformKey, c: number, r_out: TransformKey): TransformKey {
        p_a.loc.cubic_interpolate(p_b.loc, p_pre_a.loc, p_post_b.loc, c, r_out.loc);
        p_a.rot.cubic_slerp(p_b.rot, p_pre_a.rot, p_post_b.rot, c, r_out.rot);
        p_a.scale.cubic_interpolate(p_b.scale, p_pre_a.scale, p_post_b.scale, c, r_out.scale);
        return r_out;
    }
    _cubic_interpolate_Any(value_type: number, p_pre_a: any, p_a: any, p_b: any, p_post_b: any, c: number): any {
        switch (value_type) {
            case ValueType_Number: {
                return cubic_bezier(c, p_pre_a, p_a, p_b, p_post_b);
            }
            case ValueType_Vector2: {
                return (p_a as Vector2).cubic_interpolate(p_b, p_pre_a, p_post_b, c, _i_interpolate_Vector2);
            }
            case ValueType_Rect2: {
                _i_interpolate_Rect2.x = cubic_bezier(c, p_pre_a.x, p_a.x, p_b.x, p_post_b.x);
                _i_interpolate_Rect2.y = cubic_bezier(c, p_pre_a.y, p_a.y, p_b.y, p_post_b.y);
                _i_interpolate_Rect2.width = cubic_bezier(c, p_pre_a.width, p_a.width, p_b.width, p_post_b.width);
                _i_interpolate_Rect2.height = cubic_bezier(c, p_pre_a.height, p_a.height, p_b.height, p_post_b.height);
                return _i_interpolate_Rect2;
            }
            case ValueType_Vector3: {
                return (p_a as Vector3).cubic_interpolate(p_b, p_pre_a, p_post_b, c, _i_interpolate_Vector3);
            }
            case ValueType_Quat: {
                return (p_a as Quat).cubic_slerp(p_b, p_pre_a, p_post_b, c, _i_interpolate_Quat);
            }
            case ValueType_AABB: {
                (p_a as AABB).position.cubic_interpolate(p_b.position, p_pre_a.position, p_post_b.position, c, _i_interpolate_AABB.position);
                (p_a as AABB).size.cubic_interpolate(p_b.size, p_pre_a.size, p_post_b.size, c, _i_interpolate_AABB.size);
                return _i_interpolate_AABB;
            }
            default: {
                return this._interpolate_Any(value_type, p_a, p_b, c);
            }
        }
    }

    _find<T>(p_keys: TKey<T>[], p_time: number) {
        const len = p_keys.length;
        if (len === 0) return -2;

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

const tmp_transform_key = new TransformKey;
function reset_transform_key(key: TransformKey): TransformKey {
    key.loc.set(0, 0, 0);
    key.rot.set(0, 0, 0, 1);
    key.scale.set(1, 1, 1);

    return key;
}

const _i_bezier_track_interpolate_Vector2_1 = new Vector2;
const _i_bezier_track_interpolate_Vector2_2 = new Vector2;
const _i_bezier_track_interpolate_Vector2_3 = new Vector2;
const _i_bezier_track_interpolate_Vector2_4 = new Vector2;
const _i_bezier_track_interpolate_Vector2_5 = new Vector2;
const _i_bezier_track_interpolate_Vector2_6 = new Vector2;
const _i_bezier_track_interpolate_Vector2_7 = new Vector2;
const _i_bezier_track_interpolate_Vector2_8 = new Vector2;

const _i_interpolate_Vector2 = new Vector2;
const _i_interpolate_Rect2 = new Rect2;
const _i_interpolate_Transform2D = new Transform2D;
const _i_interpolate_Vector3 = new Vector3;
const _i_interpolate_Quat = new Quat;
const _i_interpolate_AABB = new AABB;
const _i_interpolate_Basis = new Basis;
const _i_interpolate_Transform_1 = new Transform;
const _i_interpolate_Transform_2 = new Transform;
const _i_interpolate_Transform_3 = new Transform;
const _i_interpolate_Color = new Color;

function _bezier_interp(t: number, start: Vector2, control_1: Vector2, control_2: Vector2, end: Vector2, r_out: Vector2) {
    const omt = 1 - t;
    const omt2 = omt * omt;
    const omt3 = omt2 * omt;
    const t2 = t * t;
    const t3 = t2 * t;

    return r_out.set(
        start.x * omt3 + control_1.x * omt2 * t * 3 + control_2.x * omt * t2 * 3 + end.x * t3,
        start.y * omt3 + control_1.y * omt2 * t * 3 + control_2.y * omt * t2 * 3 + end.y * t3
    );
}
