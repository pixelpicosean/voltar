import { node_class_map, resource_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color } from 'engine/core/color';
import {
    lerp,
    deg2rad,
    randf,
    rand_range_i,
} from 'engine/core/math/math_funcs';
import { Math_PI } from 'engine/core/math/math_defs';
import { Command, TYPE_CUSTOM } from 'engine/servers/visual/commands';

import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_INTERNAL_PROCESS,
} from '../main/node';
import { ImageTexture } from '../resources/texture';
import { Curve } from '../resources/curve';
import { Gradient } from '../resources/gradient';
import { NOTIFICATION_DRAW } from './canvas_item';
import { Node2D } from './node_2d';
import { VisualServer } from 'engine/servers/visual_server';
import { VSG } from 'engine/servers/visual/visual_server_globals';


const Math_PI2 = Math_PI * 2;

/**
 * @param {number} value
 */
const validate_frac = (value) => (value < 0) ? 0 : ((value > 1) ? 1 : value);

export const DRAW_ORDER_INDEX = 0;
export const DRAW_ORDER_LIFETIME = 1;

export const PARAM_INITIAL_LINEAR_VELOCITY = 0;
export const PARAM_ANGULAR_VELOCITY = 1;
export const PARAM_ORBIT_VELOCITY = 2;
export const PARAM_LINEAR_ACCEL = 3;
export const PARAM_RADIAL_ACCEL = 4;
export const PARAM_TANGENTIAL_ACCEL = 5;
export const PARAM_DAMPING = 6;
export const PARAM_ANGLE = 7;
export const PARAM_SCALE = 8;
export const PARAM_HUE_VARIATION = 9;
export const PARAM_ANIM_SPEED = 10;
export const PARAM_ANIM_OFFSET = 11;
export const PARAM_MAX = 12;

export const FLAG_ALIGN_Y_TO_VELOCITY = 0;
export const FLAG_ROTATE_Y = 1;
export const FLAG_DISABLE_Z = 2;
export const FLAG_MAX = 3;

export const EMISSION_SHAPE_POINT = 0;
export const EMISSION_SHAPE_SPHERE = 1;
export const EMISSION_SHAPE_RECTANGLE = 2;
export const EMISSION_SHAPE_POINTS = 3;
export const EMISSION_SHAPE_DIRECTED_POINTS = 4;

const quad_indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
]);
class BatchGroup {
    constructor() {
        this.active = false;
        this.texture = null;
        this.transform = new Transform2D();
        this.modulate = new Color();
        this.final_modulate = new Color();
        this.vertex_data = new Float32Array(8);
        this.indices = quad_indices;
        /** @type {Float32Array} */
        this.uvs = null;
    }
    /**
     * @param {Transform2D} item_wt
     * @param {Color} modulate
     */
    calculate_vertices(item_wt, modulate) {
        if (!this.active) return;

        const wt = this.transform;
        let a = wt.a;
        let b = wt.b;
        let c = wt.c;
        let d = wt.d;
        let tx = wt.tx;
        let ty = wt.ty;

        if (!item_wt.equals(Transform2D.IDENTITY)) {
            const item_a = item_wt.a;
            const item_b = item_wt.b;
            const item_c = item_wt.c;
            const item_d = item_wt.d;

            const self_wt = this.transform;
            const self_a = self_wt.a;
            const self_b = self_wt.b;
            const self_c = self_wt.c;
            const self_d = self_wt.d;
            const self_tx = self_wt.tx;
            const self_ty = self_wt.ty;

            a = (self_a * item_a) + (self_b * item_c);
            b = (self_a * item_b) + (self_b * item_d);
            c = (self_c * item_a) + (self_d * item_c);
            d = (self_c * item_b) + (self_d * item_d);
            tx = (self_tx * item_a) + (self_ty * item_c) + item_wt.tx;
            ty = (self_tx * item_b) + (self_ty * item_d) + item_wt.ty;
        }

        // vertex
        const x0 = 0;
        const x1 = x0 + this.texture.width;
        const y0 = 0;
        const y1 = y0 + this.texture.height;

        const vertex_data = this.vertex_data;

        vertex_data[0] = (a * x0) + (c * y0) + tx;
        vertex_data[1] = (d * y0) + (b * x0) + ty;

        vertex_data[2] = (a * x1) + (c * y0) + tx;
        vertex_data[3] = (d * y0) + (b * x1) + ty;

        vertex_data[4] = (a * x1) + (c * y1) + tx;
        vertex_data[5] = (d * y1) + (b * x1) + ty;

        vertex_data[6] = (a * x0) + (c * y1) + tx;
        vertex_data[7] = (d * y1) + (b * x0) + ty;

        // uv
        this.uvs = this.texture._uvs.uvsFloat32;

        // color
        this.final_modulate.copy(this.modulate).multiply(modulate);
    }
}

class CommandCPUParticle extends Command {
    get type() { return TYPE_CUSTOM }
    constructor() {
        super();

        this.local_coords = true;

        /** @type {BatchGroup[]} */
        this.batches = [];
        // FIXME: calculate rect of particle
        this.rect = new Rect2(0, 0, 1000, 1000);
    }
    /**
     * @param {Transform2D} transform
     * @param {Color} modulate
     */
    render(transform, modulate) {
        for (const b of this.batches) {
            b.calculate_vertices(this.local_coords ? transform : Transform2D.IDENTITY, modulate);
        }
    }
    free() {
        // do nothing
    }
}

class Particle {
    get transform() { return this.batch.transform }
    get color() { return this.batch.modulate }

    get active() { return this.batch.active }
    set active(value) { this.batch.active = value }

    constructor() {
        this.custom = [0, 0, 0, 0];
        this.rotation = 0;
        this.velocity = new Vector2();
        this.angle_rand = 0;
        this.scale_rand = 0;
        this.hue_rot_rand = 0;
        this.anim_offset_rand = 0;
        this.time = 0;
        this.lifetime = 0;
        this.base_color = new Color(1, 1, 1, 1);

        this.seed = 0;

        this.batch = new BatchGroup();
    }
    static new() {
        const p = ParticlePool.pop();
        if (p) {
            return p;
        } else {
            return new Particle();
        }
    }
}
/** @type {Particle[]} */
const ParticlePool = [];

const basis = (m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1) => ([
    [m00, m01, m02],
    [m10, m11, m12],
    [m20, m21, m22],
]);

const mat1 = basis(0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114);
const mat2 = basis(0.701, -0.587, -0.114, -0.299, 0.413, -0.114, -0.300, -0.588, 0.886);
const mat3 = basis(0.168, 0.330, -0.497, -0.328, 0.035, 0.292, 1.250, -1.050, -0.203);

const hue_rot_mat = basis();

/**
 * @param {Particle} a
 * @param {Particle} b
 */
function sort_lifetime(a, b) {
    return b.lifetime - a.lifetime;
}

export class CPUParticles2D extends Node2D {
    get class() { return 'CPUParticles2D' }

    get amount() { return this._amount }
    set amount(value) {
        const len = this.particles.length;
        if (len > value) {
            for (let i = value; i < len; i++) {
                ParticlePool.push(this.particles[i]);
            }
            this.particles.length = value;
        } else if (len < value) {
            for (let i = len; i < value; i++) {
                this.particles.push(Particle.new());
            }
        }

        for (let p of this.particles) {
            p.active = false;
        }
    }

    get texture() { return this._texture }
    set texture(p_texture) {
        /** @type {ImageTexture} */
        const texture = (typeof (p_texture) === 'string') ? resource_map[p_texture] : p_texture;
        this._texture = texture;
    }

    get angle() {
        return this.parameters[PARAM_ANGLE];
    }
    set angle(value) {
        this.parameters[PARAM_ANGLE] = value;
    }
    get angle_random() {
        return this.randomness[PARAM_ANGLE];
    }
    set angle_random(value) {
        this.randomness[PARAM_ANGLE] = value;
    }

    get angular_velocity() {
        return this.parameters[PARAM_ANGULAR_VELOCITY];
    }
    set angular_velocity(value) {
        this.parameters[PARAM_ANGULAR_VELOCITY] = value;
    }
    get angular_velocity_random() {
        return this.randomness[PARAM_ANGULAR_VELOCITY];
    }
    set angular_velocity_random(value) {
        this.randomness[PARAM_ANGULAR_VELOCITY] = value;
    }

    get anim_offset() {
        return this.parameters[PARAM_ANIM_OFFSET];
    }
    set anim_offset(value) {
        this.parameters[PARAM_ANIM_OFFSET] = value;
    }
    get anim_offset_random() {
        return this.randomness[PARAM_ANIM_OFFSET];
    }
    set anim_offset_random(value) {
        this.randomness[PARAM_ANIM_OFFSET] = value;
    }

    get anim_speed() {
        return this.parameters[PARAM_ANIM_SPEED];
    }
    set anim_speed(value) {
        this.parameters[PARAM_ANIM_SPEED] = value;
    }
    get anim_speed_random() {
        return this.randomness[PARAM_ANIM_SPEED];
    }
    set anim_speed_random(value) {
        this.randomness[PARAM_ANIM_SPEED] = value;
    }

    get damping() {
        return this.parameters[PARAM_DAMPING];
    }
    set damping(value) {
        this.parameters[PARAM_DAMPING] = value;
    }
    get damping_random() {
        return this.randomness[PARAM_DAMPING];
    }
    set damping_random(value) {
        this.randomness[PARAM_DAMPING] = value;
    }

    get hue_variation() {
        return this.parameters[PARAM_HUE_VARIATION];
    }
    set hue_variation(value) {
        this.parameters[PARAM_HUE_VARIATION] = value;
    }
    get hue_variation_random() {
        return this.randomness[PARAM_HUE_VARIATION];
    }
    set hue_variation_random(value) {
        this.randomness[PARAM_HUE_VARIATION] = value;
    }

    get linear_accel() {
        return this.parameters[PARAM_LINEAR_ACCEL];
    }
    set linear_accel(value) {
        this.parameters[PARAM_LINEAR_ACCEL] = value;
    }
    get linear_accel_random() {
        return this.randomness[PARAM_LINEAR_ACCEL];
    }
    set linear_accel_random(value) {
        this.randomness[PARAM_LINEAR_ACCEL] = value;
    }

    get radial_accel() {
        return this.parameters[PARAM_RADIAL_ACCEL];
    }
    set radial_accel(value) {
        this.parameters[PARAM_RADIAL_ACCEL] = value;
    }
    get radial_accel_random() {
        return this.randomness[PARAM_RADIAL_ACCEL];
    }
    set radial_accel_random(value) {
        this.randomness[PARAM_RADIAL_ACCEL] = value;
    }

    get scale_amount() {
        return this.parameters[PARAM_SCALE];
    }
    set scale_amount(value) {
        this.parameters[PARAM_SCALE] = value;
    }
    get scale_amount_random() {
        return this.randomness[PARAM_SCALE];
    }
    set scale_amount_random(value) {
        this.randomness[PARAM_SCALE] = value;
    }

    get tangential_accel() {
        return this.parameters[PARAM_TANGENTIAL_ACCEL];
    }
    set tangential_accel(value) {
        this.parameters[PARAM_TANGENTIAL_ACCEL] = value;
    }
    get tangential_accel_random() {
        return this.randomness[PARAM_TANGENTIAL_ACCEL];
    }
    set tangential_accel_random(value) {
        this.randomness[PARAM_TANGENTIAL_ACCEL] = value;
    }

    get initial_velocity() {
        return this.parameters[PARAM_INITIAL_LINEAR_VELOCITY];
    }
    set initial_velocity(value) {
        this.parameters[PARAM_INITIAL_LINEAR_VELOCITY] = value;
    }
    get initial_velocity_random() {
        return this.randomness[PARAM_INITIAL_LINEAR_VELOCITY];
    }
    set initial_velocity_random(value) {
        this.randomness[PARAM_INITIAL_LINEAR_VELOCITY] = value;
    }

    constructor() {
        super();

        this.emitting = true;

        this._amount = 8;
        this.lifetime = 1;
        this.lifetime_randomness = 0;

        this.local_coords = true;
        this.one_shot = false;
        this.explosiveness = false;
        this.flatness = 0;
        this.preprocess = 0;
        this.fract_delta = true;

        this.randomness_ratio = 0;
        this.explosiveness_ratio = 0;

        /** @type {number[]} */
        this.parameters = new Array(PARAM_MAX);
        /** @type {Curve[]} */
        this.curve_parameters = new Array(PARAM_MAX);
        /** @type {number[]} */
        this.randomness = new Array(PARAM_MAX);
        /** @type {boolean[]} */
        this.flags = new Array(FLAG_MAX);

        this.color = new Color(1, 1, 1, 1);
        /** @type {Gradient} */
        this.color_ramp = null;

        /** @type {ImageTexture} */
        this._texture = null;
        this.normalmap = null;

        /** @type {Color[]} */
        this.emission_colors = [];
        /** @type {Vector2[]} */
        this.emission_normals = [];
        /** @type {Vector2[]} */
        this.emission_points = [];
        this.emission_rect_extents = new Vector2(1, 1);
        this.emission_shape = EMISSION_SHAPE_POINT;
        this.emission_sphere_radius = 1;

        this.fixed_fps = 0;

        this.speed_scale = 1;

        this.direction = new Vector2();
        this.spread = 45;

        this.gravity = new Vector2(0, 98);

        /** @type {Curve} */
        this.angle_curve = null;
        /** @type {Curve} */
        this.angular_velocity_curve = null;
        /** @type {Curve} */
        this.anim_offset_curve = null;
        /** @type {Curve} */
        this.anim_speed_curve = null;
        /** @type {Curve} */
        this.damping_curve = null;
        /** @type {Curve} */
        this.hue_variation_curve = null;
        /** @type {Curve} */
        this.linear_accel_curve = null;
        /** @type {Curve} */
        this.radial_accel_curve = null;
        /** @type {Curve} */
        this.scale_amount_curve = null;
        /** @type {Curve} */
        this.tangential_accel_curve = null;

        this.draw_order = DRAW_ORDER_INDEX;

        this.time = 0;
        this.inactive_time = 0;
        this.frame_remainder = 0;
        this.cycle = 0;
        this.redraw = false;

        /**
         * @type {Particle[]}
         */
        this.particles = [];
        /**
         * @type {number[]}
         */
        this.particle_data = [];
        /**
         * @type {number[]}
         */
        this.particle_order = [];

        this.internal_process = true;

        // initialize
        for (let i = 0; i < PARAM_MAX; i++) {
            this.parameters[i] = 0;
        }
        for (let i = 0; i < PARAM_MAX; i++) {
            this.randomness[i] = 0;
        }
        for (let i = 0; i < FLAG_MAX; i++) {
            this.flags[i] = false;
        }

        this.amount = 8;

        this.set_param(PARAM_INITIAL_LINEAR_VELOCITY, 1);
        this.set_param(PARAM_ANGULAR_VELOCITY, 0);
        this.set_param(PARAM_ORBIT_VELOCITY, 0);
        this.set_param(PARAM_LINEAR_ACCEL, 0);
        this.set_param(PARAM_RADIAL_ACCEL, 0);
        this.set_param(PARAM_TANGENTIAL_ACCEL, 0);
        this.set_param(PARAM_DAMPING, 0);
        this.set_param(PARAM_ANGLE, 0);
        this.set_param(PARAM_SCALE, 1);
        this.set_param(PARAM_HUE_VARIATION, 0);
        this.set_param(PARAM_ANIM_SPEED, 0);
        this.set_param(PARAM_ANIM_OFFSET, 0);

        this._command = new CommandCPUParticle();
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.amount !== undefined) this.amount = data.amount;
        if (data.gravity !== undefined) this.gravity.copy(data.gravity);
        if (data.lifetime !== undefined) this.lifetime = data.lifetime;
        if (data.one_shot !== undefined) this.one_shot = data.one_shot;
        if (data.explosiveness !== undefined) this.explosiveness = data.explosiveness;
        if (data.preprocess !== undefined) this.preprocess = data.preprocess;
        if (data.randomness !== undefined) this.randomness_ratio = data.randomness;
        if (data.speed_scale !== undefined) this.speed_scale = data.speed_scale;
        if (data.spread !== undefined) this.spread = data.spread;
        if (data.local_coords !== undefined) this.local_coords = data.local_coords;
        if (data.fixed_fps !== undefined) this.fixed_fps = data.fixed_fps;
        if (data.emitting !== undefined) this.emitting = data.emitting;
        if (data.flag_align_y !== undefined) this.flags[FLAG_ALIGN_Y_TO_VELOCITY] = data.flag_align_y;
        if (data.flatness !== undefined) this.flatness = data.flatness;
        if (data.fract_delta !== undefined) this.fract_delta = data.fract_delta;
        if (data.draw_order !== undefined) this.draw_order = data.draw_order;

        if (data.blend_mode !== undefined) this.blend_mode = data.blend_mode;

        if (data.color !== undefined) this.color.copy(data.color);
        if (data.color_ramp !== undefined) this.color_ramp = data.color_ramp;

        if (data.texture !== undefined) this.texture = data.texture;
        if (data.normalmap !== undefined) this.normalmap = data.normalmap;

        if (data.initial_velocity !== undefined) this.initial_velocity = data.initial_velocity;
        if (data.initial_velocity_random !== undefined) this.initial_velocity_random = data.initial_velocity_random;

        if (data.angle !== undefined) this.angle = data.angle;
        if (data.angle_curve !== undefined) this.set_param_curve(PARAM_ANGLE, data.angle_curve);
        if (data.angle_random !== undefined) this.angle_random = data.angle_random;

        if (data.angular_velocity !== undefined) this.angular_velocity = data.angular_velocity;
        if (data.angular_velocity_curve !== undefined) this.set_param_curve(PARAM_ANGULAR_VELOCITY, data.angular_velocity_curve);
        if (data.angular_velocity_random !== undefined) this.angular_velocity_random = data.angular_velocity_random;

        if (data.anim_offset !== undefined) this.anim_offset = data.anim_offset;
        if (data.anim_offset_curve !== undefined) this.set_param_curve(PARAM_ANIM_OFFSET, data.anim_offset_curve);
        if (data.anim_offset_random !== undefined) this.anim_offset_random = data.anim_offset_random;

        if (data.anim_speed !== undefined) this.anim_speed = data.anim_speed;
        if (data.anim_speed_curve !== undefined) this.set_param_curve(PARAM_ANIM_SPEED, data.anim_speed_curve);
        if (data.anim_speed_random !== undefined) this.anim_speed_random = data.anim_speed_random;

        if (data.damping !== undefined) this.damping = data.damping;
        if (data.damping_curve !== undefined) this.set_param_curve(PARAM_DAMPING, data.damping_curve);
        if (data.damping_random !== undefined) this.damping_random = data.damping_random;

        if (data.emission_colors !== undefined) this.emission_colors = data.emission_colors;
        if (data.emission_normals !== undefined) this.emission_normals = data.emission_normals;
        if (data.emission_points !== undefined) this.emission_points = data.emission_points;

        if (data.emission_rect_extents !== undefined) this.emission_rect_extents = data.emission_rect_extents;
        if (data.emission_shape !== undefined) this.emission_shape = data.emission_shape;
        if (data.emission_sphere_radius !== undefined) this.emission_sphere_radius = data.emission_sphere_radius;

        if (data.hue_variation !== undefined) this.hue_variation = data.hue_variation;
        if (data.hue_variation_curve !== undefined) this.set_param_curve(PARAM_HUE_VARIATION, data.hue_variation_curve);
        if (data.hue_variation_random !== undefined) this.hue_variation_random = data.hue_variation_random;

        if (data.linear_accel !== undefined) this.linear_accel = data.linear_accel;
        if (data.linear_accel_curve !== undefined) this.set_param_curve(PARAM_LINEAR_ACCEL, data.linear_accel_curve);
        if (data.linear_accel_random !== undefined) this.linear_accel_random = data.linear_accel_random;

        if (data.radial_accel !== undefined) this.radial_accel = data.radial_accel;
        if (data.radial_accel_curve !== undefined) this.set_param_curve(PARAM_RADIAL_ACCEL, data.radial_accel_curve);
        if (data.radial_accel_random !== undefined) this.radial_accel_random = data.radial_accel_random;

        if (data.scale_amount !== undefined) this.scale_amount = data.scale_amount;
        if (data.scale_amount_curve !== undefined) this.set_param_curve(PARAM_SCALE, data.scale_amount_curve);
        if (data.scale_amount_random !== undefined) this.scale_amount_random = data.scale_amount_random;

        if (data.tangential_accel !== undefined) this.tangential_accel = data.tangential_accel;
        if (data.tangential_accel_curve !== undefined) this.set_param_curve(PARAM_TANGENTIAL_ACCEL, data.tangential_accel_curve);
        if (data.tangential_accel_random !== undefined) this.tangential_accel_random = data.tangential_accel_random;

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_ENTER_TREE) {
            this.set_process_internal(this.emitting);
        }

        if (p_what === NOTIFICATION_EXIT_TREE) {
            this._set_redraw(false);
        }

        if (p_what === NOTIFICATION_DRAW) {
            if (!this.redraw) {
                return;
            }
            this.canvas_item.rect_dirty = true;
        }

        if (p_what === NOTIFICATION_INTERNAL_PROCESS) {
            if (this.particles.length === 0 || !this.is_visible_in_tree()) {
                this._set_redraw(false);
                return;
            }

            const delta = this.get_process_delta_time();
            if (this.emitting) {
                this.inactive_time = 0;
            } else {
                this.inactive_time += delta;
                if (this.inactive_time > this.lifetime * 1.2) {
                    this.set_process_internal(false);
                    this._set_redraw(false);

                    // reset variables
                    this.time = 0;
                    this.inactive_time = 0;
                    this.frame_remainder = 0;
                    this.cycle = 0;
                    return;
                }
            }
            this._set_redraw(true);

            if (this.time === 0 && this.preprocess > 0) {
                let frame_time = 0;
                if (this.fixed_fps > 0) {
                    frame_time = 1 / this.fixed_fps;
                } else {
                    frame_time = 1 / 30;
                }

                let todo = this.preprocess;

                while (todo >= 0) {
                    this._particles_process(frame_time);
                    todo -= frame_time;
                }
            }

            if (this.fixed_fps > 0) {
                let frame_time = 1 / this.fixed_fps;
                let decr = frame_time;

                let ldelta = delta;
                if (ldelta > 0.1) {
                    ldelta = 0.1;
                } else if (ldelta <= 0) {
                    ldelta = 0.001;
                }
                let todo = this.frame_remainder + ldelta;

                while (todo >= frame_time) {
                    this._particles_process(frame_time);
                    todo -= decr;
                }

                this.frame_remainder = todo;
            } else {
                this._particles_process(delta);
            }

            this._update_particle_data_buffer();
        }
    }

    /* public */

    restart() {
        this.time = 0;
        this.inactive_time = 0;
        this.frame_remainder = 0;
        this.cycle = 0;

        for (let p of this.particles) {
            p.active = false;
        }
    }

    /**
     * @param {number} p_param
     * @param {number} p_value
     */
    set_param(p_param, p_value) {
        this.parameters[p_param] = p_value;
    }
    /**
     * @param {number} p_param
     */
    get_param(p_param) {
        return this.parameters[p_param];
    }

    /**
     * @param {number} p_param
     * @param {number} p_value
     */
    set_param_randomness(p_param, p_value) {
        this.randomness[p_param] = p_value;
    }
    /**
     * @param {number} p_param
     */
    get_param_randomness(p_param) {
        return this.randomness[p_param];
    }

    /**
     * @param {Curve} p_curve
     * @param {number} p_min
     * @param {number} p_max
     */
    _adjust_curve_range(p_curve, p_min, p_max) {
        if (!p_curve) {
            return;
        }

        p_curve.ensure_default_setup(p_min, p_max);
    }

    /**
     * @param {number} p_param
     * @param {Curve} p_curve
     */
    set_param_curve(p_param, p_curve) {
        this.curve_parameters[p_param] = p_curve;

        switch (p_param) {
            case PARAM_INITIAL_LINEAR_VELOCITY: {
                //do none for this one
            } break;
            case PARAM_ANGULAR_VELOCITY: {
                this._adjust_curve_range(p_curve, -360, 360);
            } break;
            case PARAM_ORBIT_VELOCITY: {
                this._adjust_curve_range(p_curve, -500, 500);
            } break;
            case PARAM_LINEAR_ACCEL: {
                this._adjust_curve_range(p_curve, -200, 200);
            } break;
            case PARAM_RADIAL_ACCEL: {
                this._adjust_curve_range(p_curve, -200, 200);
            } break;
            case PARAM_TANGENTIAL_ACCEL: {
                this._adjust_curve_range(p_curve, -200, 200);
            } break;
            case PARAM_DAMPING: {
                this._adjust_curve_range(p_curve, 0, 100);
            } break;
            case PARAM_ANGLE: {
                this._adjust_curve_range(p_curve, -360, 360);
            } break;
            case PARAM_SCALE: {
            } break;
            case PARAM_HUE_VARIATION: {
                this._adjust_curve_range(p_curve, -1, 1);
            } break;
            case PARAM_ANIM_SPEED: {
                this._adjust_curve_range(p_curve, 0, 200);
            } break;
            case PARAM_ANIM_OFFSET: {
            } break;
            default: { }
        }
    }
    /**
     * @param {number} p_param
     */
    get_param_curve(p_param) {
        return this.curve_parameters[p_param];
    }

    /**
     * @param {number} p_delta
     */
    _particles_process(p_delta) {
        p_delta *= this.speed_scale;

        let pcount = this.particles.length;
        const parray = this.particles;

        let prev_time = this.time;
        this.time += p_delta;
        if (this.time > this.lifetime) {
            this.time = this.time % this.lifetime;
            this.cycle++;
            if (this.one_shot && this.cycle > 0) {
                this.emitting = false;
            }
        }

        const emission_xform = Transform2D.new();
        const velocity_xform = Transform2D.new();
        if (!this.local_coords) {
            emission_xform.copy(this.get_global_transform());
            velocity_xform.copy(emission_xform);
            velocity_xform.tx = 0;
            velocity_xform.ty = 0;
        }

        const system_phase = this.time / this.lifetime;

        for (let i = 0; i < pcount; i++) {
            const p = parray[i];

            if (!this.emitting && !p.active) {
                continue;
            }

            let local_delta = p_delta;

            let restart_phase = i / pcount;

            if (this.randomness_ratio > 0) {
                restart_phase += this.randomness_ratio * randf() / pcount;
            }

            restart_phase *= (1 - this.explosiveness_ratio);
            const restart_time = restart_phase * this.lifetime;
            let restart = false;

            if (this.time > prev_time) {
                if (restart_time >= prev_time && restart_time < this.time) {
                    restart = true;
                    if (this.fract_delta) {
                        local_delta = this.time - restart_time;
                    }
                }
            } else if (local_delta > 0) {
                if (restart_time >= prev_time) {
                    restart = true;
                    if (this.fract_delta) {
                        local_delta = this.lifetime - restart_time + this.time;
                    }
                } else if (restart_time < this.time) {
                    restart = true;
                    if (this.fract_delta) {
                        local_delta = this.time - restart_time;
                    }
                }
            }

            if (p.time * (1 - this.explosiveness_ratio) > p.lifetime) {
                restart = true;
            }

            if (restart) {
                if (!this.emitting) {
                    p.active = false;
                    continue;
                }
                p.active = true;

                let tex_angle = 0;
                if (this.curve_parameters[PARAM_ANGLE]) {
                    tex_angle = this.curve_parameters[PARAM_ANGLE].interpolate(0);
                }

                let tex_anim_offset = 0;
                if (this.curve_parameters[PARAM_ANGLE]) {
                    tex_anim_offset = this.curve_parameters[PARAM_ANGLE].interpolate(0);
                }

                p.angle_rand = randf();
                p.scale_rand = randf();
                p.hue_rot_rand = randf();
                p.anim_offset_rand = randf();

                let angle1_rad = Math.atan2(this.direction.y, this.direction.x) + (randf() * 2 - 1) * Math_PI * this.spread / 180;
                const rot = Vector2.new(Math.cos(angle1_rad), Math.sin(angle1_rad));
                p.velocity.copy(rot).scale(this.parameters[PARAM_INITIAL_LINEAR_VELOCITY] * lerp(1, randf(), this.randomness[PARAM_INITIAL_LINEAR_VELOCITY]));

                let base_angle = (this.parameters[PARAM_ANGLE] + tex_angle) * lerp(1, p.angle_rand, this.randomness[PARAM_ANGLE]);
                p.rotation = deg2rad(base_angle);

                p.custom[0] = 0; // unused
                p.custom[1] = 0; // phase [0..1]
                p.custom[2] = (this.parameters[PARAM_ANIM_OFFSET] + tex_anim_offset) * lerp(1, p.anim_offset_rand, this.randomness[PARAM_ANIM_OFFSET]);
                p.custom[3] = 0;
                p.transform.reset();
                p.time = 0;
                p.lifetime = this.lifetime * (1 - randf() * this.lifetime_randomness);
                p.base_color.set(1, 1, 1, 1);

                const vec = Vector2.new();
                switch (this.emission_shape) {
                    case EMISSION_SHAPE_POINT: {
                    } break;
                    // TODO: new sphere emit shape implementation
                    case EMISSION_SHAPE_SPHERE: {
                        const s = randf(), t = 2 * Math.PI * randf();
                        vec.set(Math.cos(t), Math.sin(t))
                            .scale(this.emission_sphere_radius * Math.sqrt(1 - s * s));
                        p.transform.tx = vec.x;
                        p.transform.ty = vec.y;
                    } break;
                    case EMISSION_SHAPE_RECTANGLE: {
                        vec.set(randf() * 2 - 1, randf() * 2 - 1)
                            .multiply(this.emission_rect_extents);
                        p.transform.tx = vec.x;
                        p.transform.ty = vec.y;
                    } break;
                    case EMISSION_SHAPE_POINTS:
                    case EMISSION_SHAPE_DIRECTED_POINTS: {
                        const pc = this.emission_points.length;
                        if (pc === 0) {
                            break;
                        }

                        const random_idx = rand_range_i(0, pc - 1);

                        let pos = this.emission_points[random_idx];
                        p.transform.tx = pos.x;
                        p.transform.ty = pos.y;

                        if (this.emission_shape === EMISSION_SHAPE_DIRECTED_POINTS && this.emission_normals.length === pc) {
                            p.velocity.copy(pos);
                        }

                        if (this.emission_colors.length === pc) {
                            p.base_color.copy(this.emission_colors[random_idx]);
                        }
                    } break;
                }

                if (!this.local_coords) {
                    velocity_xform.xform(p.velocity, p.velocity);
                    const t = p.transform.clone();
                    p.transform.copy(emission_xform).append(t);
                    Transform2D.free(t);
                }

                Vector2.free(vec);
                Vector2.free(rot);
            } else if (!p.active) {
                continue;
            } else if (p.time > p.lifetime) {
                p.active = false;
            } else {
                p.time += local_delta;
                p.custom[1] = p.time / this.lifetime;

                let tex_linear_velocity = 0;
                if (this.curve_parameters[PARAM_INITIAL_LINEAR_VELOCITY]) {
                    tex_linear_velocity = this.curve_parameters[PARAM_INITIAL_LINEAR_VELOCITY].interpolate(p.custom[1]);
                }

                let tex_orbit_velocity = 0;
                if (this.curve_parameters[PARAM_ORBIT_VELOCITY]) {
                    tex_orbit_velocity = this.curve_parameters[PARAM_ORBIT_VELOCITY].interpolate(p.custom[1]);
                }

                let tex_angular_velocity = 0;
                if (this.curve_parameters[PARAM_ANGULAR_VELOCITY]) {
                    tex_angular_velocity = this.curve_parameters[PARAM_ANGULAR_VELOCITY].interpolate(p.custom[1]);
                }

                let tex_linear_accel = 0;
                if (this.curve_parameters[PARAM_LINEAR_ACCEL]) {
                    tex_linear_accel = this.curve_parameters[PARAM_LINEAR_ACCEL].interpolate(p.custom[1]);
                }

                let tex_tangential_accel = 0;
                if (this.curve_parameters[PARAM_TANGENTIAL_ACCEL]) {
                    tex_tangential_accel = this.curve_parameters[PARAM_TANGENTIAL_ACCEL].interpolate(p.custom[1]);
                }

                let tex_radial_accel = 0;
                if (this.curve_parameters[PARAM_RADIAL_ACCEL]) {
                    tex_radial_accel = this.curve_parameters[PARAM_RADIAL_ACCEL].interpolate(p.custom[1]);
                }

                let tex_damping = 0;
                if (this.curve_parameters[PARAM_DAMPING]) {
                    tex_damping = this.curve_parameters[PARAM_DAMPING].interpolate(p.custom[1]);
                }

                let tex_angle = 0;
                if (this.curve_parameters[PARAM_ANGLE]) {
                    tex_angle = this.curve_parameters[PARAM_ANGLE].interpolate(p.custom[1]);
                }

                let tex_anim_speed = 0;
                if (this.curve_parameters[PARAM_ANIM_SPEED]) {
                    tex_anim_speed = this.curve_parameters[PARAM_ANIM_SPEED].interpolate(p.custom[1]);
                }

                let tex_anim_offset = 0;
                if (this.curve_parameters[PARAM_ANIM_OFFSET]) {
                    tex_anim_offset = this.curve_parameters[PARAM_ANIM_OFFSET].interpolate(p.custom[1]);
                }

                const force = this.gravity.clone();
                const pos = Vector2.new(p.transform.tx, p.transform.ty);

                // Apply linear acceleration
                if (p.velocity.length_squared() > 0) {
                    force.add(
                        p.velocity.normalized().scale(
                            (this.parameters[PARAM_LINEAR_ACCEL] + tex_linear_accel) * lerp(1, randf(), this.randomness[PARAM_LINEAR_ACCEL])
                        )
                    );
                }
                // Apply radial acceleration
                const org = emission_xform.get_origin();
                const diff = pos.clone().subtract(org);
                const diff_n = diff.normalized();
                if (diff.length_squared() > 0) {
                    force.add(diff_n.scale((this.parameters[PARAM_RADIAL_ACCEL] + tex_radial_accel) * lerp(1, randf(), this.randomness[PARAM_RADIAL_ACCEL])));
                }
                // Apply tangential acceleration
                const yx = Vector2.new(diff.y, diff.x);
                if (yx.length_squared() > 0) {
                    yx.multiply(-1, 1).normalize()
                        .scale((this.parameters[PARAM_TANGENTIAL_ACCEL] + tex_tangential_accel) * lerp(1, randf(), this.randomness[PARAM_TANGENTIAL_ACCEL]))
                    force.add(yx);
                }
                // Apply attractor forces
                p.velocity.add(force.x * local_delta, force.y * local_delta);
                // Orbit velocity
                const orbit_amount = (this.parameters[PARAM_ORBIT_VELOCITY] + tex_orbit_velocity) * lerp(1, randf(), this.randomness[PARAM_ORBIT_VELOCITY]);
                if (orbit_amount !== 0) {
                    const ang = orbit_amount * local_delta * Math_PI * 2;
                    const rot = Transform2D.new();
                    rot.rotate(-ang);
                    const x_diff = rot.basis_xform(diff);
                    p.transform.tx -= diff.x;
                    p.transform.ty -= diff.y;
                    p.transform.tx += x_diff.x;
                    p.transform.ty += x_diff.y;
                    Vector2.free(x_diff);
                    Transform2D.free(rot);
                }
                if (this.curve_parameters[PARAM_INITIAL_LINEAR_VELOCITY]) {
                    p.velocity.normalize().scale(tex_linear_velocity);
                }

                if (this.parameters[PARAM_DAMPING] + tex_damping > 0) {
                    let v = p.velocity.length();
                    let damp = (this.parameters[PARAM_DAMPING] + tex_damping) * lerp(1, randf(), this.randomness[PARAM_DAMPING]);
                    v -= damp * local_delta;
                    if (v < 0) {
                        p.velocity.set(0, 0);
                    } else {
                        p.velocity.normalize().scale(v);
                    }
                }
                let base_angle = (this.parameters[PARAM_ANGLE] + tex_angle) * lerp(1, p.angle_rand, this.randomness[PARAM_ANGLE]);
                base_angle += p.custom[1] * this.lifetime * (this.parameters[PARAM_ANGULAR_VELOCITY] + tex_angular_velocity) * lerp(1, randf() * 2 - 1, this.randomness[PARAM_ANGULAR_VELOCITY]);
                p.rotation = deg2rad(base_angle);
                let animation_phase = (this.parameters[PARAM_ANIM_OFFSET] + tex_anim_offset) * lerp(1, p.anim_offset_rand, this.randomness[PARAM_ANIM_OFFSET]) + p.custom[1] * (this.parameters[PARAM_ANIM_SPEED] + tex_anim_speed) * lerp(1, randf(), this.randomness[PARAM_ANIM_SPEED]);
                p.custom[2] = animation_phase;

                Vector2.free(yx);
                Vector2.free(diff_n);
                Vector2.free(diff);
                Vector2.free(org);
                Vector2.free(pos);
                Vector2.free(force);
            }
            // Apply color
            // Apply hue rotation

            let tex_scale = 1;
            if (this.curve_parameters[PARAM_SCALE]) {
                tex_scale = this.curve_parameters[PARAM_SCALE].interpolate(p.custom[1]);
            }

            let tex_hue_variation = 0;
            if (this.curve_parameters[PARAM_HUE_VARIATION]) {
                tex_hue_variation = this.curve_parameters[PARAM_HUE_VARIATION].interpolate(p.custom[1]);
            }

            let hue_rot_angle = (this.parameters[PARAM_HUE_VARIATION] + tex_hue_variation) * Math_PI2 * lerp(1, p.hue_rot_rand * 2 - 1, this.randomness[PARAM_HUE_VARIATION]);
            let hue_rot_c = Math.cos(hue_rot_angle);
            let hue_rot_s = Math.sin(hue_rot_angle);

            for (let j = 0; j < 3; j++) {
                hue_rot_mat[j][0] = mat1[j][0] + mat2[j][0] * hue_rot_c + mat3[j][0] * hue_rot_s;
                hue_rot_mat[j][1] = mat1[j][1] + mat2[j][1] * hue_rot_c + mat3[j][1] * hue_rot_s;
                hue_rot_mat[j][2] = mat1[j][2] + mat2[j][2] * hue_rot_c + mat3[j][2] * hue_rot_s;
            }

            if (this.color_ramp) {
                const color = this.color_ramp.interpolate(p.custom[1]).multiply(this.color);
                p.color.copy(color);
                Color.free(color);
            } else {
                p.color.copy(this.color);
            }

            const r = p.color.r;
            const g = p.color.g;
            const b = p.color.b;
            p.color.r = (hue_rot_mat[0][0] * r) + (hue_rot_mat[1][0] * g) + (hue_rot_mat[2][0] * b);
            p.color.g = (hue_rot_mat[0][1] * r) + (hue_rot_mat[1][1] * g) + (hue_rot_mat[2][1] * b);
            p.color.b = (hue_rot_mat[0][2] * r) + (hue_rot_mat[1][2] * g) + (hue_rot_mat[2][2] * b);

            p.color.multiply(p.base_color);

            p.color.r = validate_frac(p.color.r);
            p.color.g = validate_frac(p.color.g);
            p.color.b = validate_frac(p.color.b);
            p.color.a = validate_frac(p.color.a);

            if (this.flags[FLAG_ALIGN_Y_TO_VELOCITY]) {
                if (p.velocity.length_squared() > 0) {
                    const vel_n = p.velocity.normalized();
                    p.transform.c = vel_n.x;
                    p.transform.d = vel_n.y;
                    const tan = vel_n.set(p.transform.c, p.transform.d).tangent();
                    p.transform.a = tan.x;
                    p.transform.b = tan.y;
                    Vector2.free(tan);
                    Vector2.free(vel_n);
                }
            } else {
                const c = Math.cos(p.rotation);
                const s = Math.sin(p.rotation);
                p.transform.a = c;
                p.transform.b = -s;
                p.transform.c = s;
                p.transform.d = c;
            }

            // Scale by scale
            let base_scale = lerp(this.parameters[PARAM_SCALE] * tex_scale, 1, p.scale_rand * this.randomness[PARAM_SCALE]);
            if (base_scale === 0) {
                base_scale = 0.000001;
            }

            p.transform.a *= base_scale;
            p.transform.b *= base_scale;
            p.transform.c *= base_scale;
            p.transform.d *= base_scale;

            p.transform.tx += p.velocity.x * local_delta;
            p.transform.ty += p.velocity.y * local_delta;
        }

        Transform2D.free(emission_xform);
        Transform2D.free(velocity_xform);
    }

    _update_particle_data_buffer() {
        if (this.draw_order !== DRAW_ORDER_INDEX) {
            if (this.draw_order === DRAW_ORDER_LIFETIME) {
                this.particles.sort(sort_lifetime);
            }
        }

        const batches = this._command.batches;
        const particles = this.particles;

        batches.length = 0;
        let batch = null;
        let p = null;
        for (let i = 0, len = particles.length; i < len; i++) {
            p = particles[i]
            batch = p.batch;
            // we only draw active particles
            if (batch.active) {
                // sync texture
                batch.texture = this._texture.texture;
                batches.push(batch);
            }
        }

        this._command.local_coords = this.local_coords;
        this.canvas_item.commands.length = 1;
        this.canvas_item.commands[0] = this._command;
    }

    _update_render_thread() { }

    /**
     * @param {boolean} p_redraw
     */
    _set_redraw(p_redraw) {
        if (this.redraw === p_redraw) {
            return;
        }
        this.redraw = p_redraw;
        if (this.redraw) {
            VisualServer.get_singleton().connect('frame_pre_draw', this._update_render_thread, this);
            VSG.canvas.canvas_item_set_update_when_visible(this.canvas_item, true);
        } else {
            VisualServer.get_singleton().disconnect('frame_pre_draw', this._update_render_thread, this);
            VSG.canvas.canvas_item_set_update_when_visible(this.canvas_item, false);
        }
        this.update();
    }
}
node_class_map['CPUParticles2D'] = GDCLASS(CPUParticles2D, Node2D)
