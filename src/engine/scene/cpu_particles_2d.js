import Node2D from './node_2d';
import Color from 'engine/core/color';
import {
    Vector2,
    Matrix,
    PI,
    lerp,
    deg2rad,
    PI2,
} from 'engine/core/math/index';
import { randf, rand_range_i } from 'engine/core/math/random_pcg';
import Sprite from './sprites/sprite';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import { node_class_map } from 'engine/registry';
import { Curve } from './resources/curve';
import { TextureCache } from 'engine/utils/index';
import { Texture, BLEND_MODES } from 'engine/index';

/**
 * @param {number} value
 */
const validate_frac = (value) => (value < 0) ? 0 : ((value > 1) ? 1 : value);

/**
 * @enum {number}
 */
const DrawOrder = {
    INDEX: 0,
    LIFETIME: 1,
};

/**
 * @enum {number}
 */
const Parameter = {
    INITIAL_LINEAR_VELOCITY: 0,
    ANGULAR_VELOCITY: 1,
    ORBIT_VELOCITY: 2,
    LINEAR_ACCEL: 3,
    RADIAL_ACCEL: 4,
    TANGENTIAL_ACCEL: 5,
    DAMPING: 6,
    ANGLE: 7,
    SCALE: 8,
    HUE_VARIATION: 9,
    ANIM_SPEED: 10,
    ANIM_OFFSET: 11,
    MAX: 12,
};

/**
 * @enum {number}
 */
const Flags = {
    ALIGN_Y_TO_VELOCITY: 0,
    MAX: 1,
};

/**
 * @enum {number}
 */
const EmissionShape = {
    POINT: 0,
    SPHERE: 1,
    RECTANGLE: 2,
    POINTS: 3,
    DIRECTED_POINTS: 4,
};

class Particle {
    constructor() {
        this.transform = new Matrix();
        this.color = new Color(1, 1, 1, 1);
        this.custom = [0, 0, 0, 0];
        this.rotation = 0;
        this.velocity = new Vector2();
        this.active = false;
        this.angle_rand = 0;
        this.scale_rand = 0;
        this.hue_rot_rand = 0;
        this.anim_offset_rand = 0;
        this.time = 0;
        this.base_color = new Color(1, 1, 1, 1);

        this.seed = 0;

        this.sprite = new Sprite();
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

export default class CPUParticles2D extends Node2D {
    /**
     * @type {number}
     */
    get amount() {
        return this._amount;
    }
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

    /**
     * @type {Texture}
     */
    get texture() {
        return this._texture;
    }
    set texture(value) {
        if (typeof (value) === 'string') {
            this._texture = TextureCache[value];
        } else {
            this._texture = value;
        }
        if (!this._texture) {
            this._texture = Texture.WHITE;
        }
    }

    get angle() {
        return this.parameters[Parameter.ANGLE];
    }
    set angle(value) {
        this.parameters[Parameter.ANGLE] = value;
    }
    get angle_random() {
        return this.randomness[Parameter.ANGLE];
    }
    set angle_random(value) {
        this.randomness[Parameter.ANGLE] = value;
    }

    get angular_velocity() {
        return this.parameters[Parameter.ANGULAR_VELOCITY];
    }
    set angular_velocity(value) {
        this.parameters[Parameter.ANGULAR_VELOCITY] = value;
    }
    get angular_velocity_random() {
        return this.randomness[Parameter.ANGULAR_VELOCITY];
    }
    set angular_velocity_random(value) {
        this.randomness[Parameter.ANGULAR_VELOCITY] = value;
    }

    get anim_offset() {
        return this.parameters[Parameter.ANIM_OFFSET];
    }
    set anim_offset(value) {
        this.parameters[Parameter.ANIM_OFFSET] = value;
    }
    get anim_offset_random() {
        return this.randomness[Parameter.ANIM_OFFSET];
    }
    set anim_offset_random(value) {
        this.randomness[Parameter.ANIM_OFFSET] = value;
    }

    get anim_speed() {
        return this.parameters[Parameter.ANIM_SPEED];
    }
    set anim_speed(value) {
        this.parameters[Parameter.ANIM_SPEED] = value;
    }
    get anim_speed_random() {
        return this.randomness[Parameter.ANIM_SPEED];
    }
    set anim_speed_random(value) {
        this.randomness[Parameter.ANIM_SPEED] = value;
    }

    get damping() {
        return this.parameters[Parameter.DAMPING];
    }
    set damping(value) {
        this.parameters[Parameter.DAMPING] = value;
    }
    get damping_random() {
        return this.randomness[Parameter.DAMPING];
    }
    set damping_random(value) {
        this.randomness[Parameter.DAMPING] = value;
    }

    get hue_variation() {
        return this.parameters[Parameter.HUE_VARIATION];
    }
    set hue_variation(value) {
        this.parameters[Parameter.HUE_VARIATION] = value;
    }
    get hue_variation_random() {
        return this.randomness[Parameter.HUE_VARIATION];
    }
    set hue_variation_random(value) {
        this.randomness[Parameter.HUE_VARIATION] = value;
    }

    get linear_accel() {
        return this.parameters[Parameter.LINEAR_ACCEL];
    }
    set linear_accel(value) {
        this.parameters[Parameter.LINEAR_ACCEL] = value;
    }
    get linear_accel_random() {
        return this.randomness[Parameter.LINEAR_ACCEL];
    }
    set linear_accel_random(value) {
        this.randomness[Parameter.LINEAR_ACCEL] = value;
    }

    get radial_accel() {
        return this.parameters[Parameter.RADIAL_ACCEL];
    }
    set radial_accel(value) {
        this.parameters[Parameter.RADIAL_ACCEL] = value;
    }
    get radial_accel_random() {
        return this.randomness[Parameter.RADIAL_ACCEL];
    }
    set radial_accel_random(value) {
        this.randomness[Parameter.RADIAL_ACCEL] = value;
    }

    get scale_amount() {
        return this.parameters[Parameter.SCALE];
    }
    set scale_amount(value) {
        this.parameters[Parameter.SCALE] = value;
    }
    get scale_amount_random() {
        return this.randomness[Parameter.SCALE];
    }
    set scale_amount_random(value) {
        this.randomness[Parameter.SCALE] = value;
    }

    get tangential_accel() {
        return this.parameters[Parameter.TANGENTIAL_ACCEL];
    }
    set tangential_accel(value) {
        this.parameters[Parameter.TANGENTIAL_ACCEL] = value;
    }
    get tangential_accel_random() {
        return this.randomness[Parameter.TANGENTIAL_ACCEL];
    }
    set tangential_accel_random(value) {
        this.randomness[Parameter.TANGENTIAL_ACCEL] = value;
    }

    get initial_velocity() {
        return this.parameters[Parameter.INITIAL_LINEAR_VELOCITY];
    }
    set initial_velocity(value) {
        this.parameters[Parameter.INITIAL_LINEAR_VELOCITY] = value;
    }
    get initial_velocity_random() {
        return this.randomness[Parameter.INITIAL_LINEAR_VELOCITY];
    }
    set initial_velocity_random(value) {
        this.randomness[Parameter.INITIAL_LINEAR_VELOCITY] = value;
    }

    constructor() {
        super();

        this.emitting = true;

        this._amount = 8;
        this.lifetime = 1;

        this.local_coords = true;
        this.one_shot = false;
        this.explosiveness = false;
        this.flatness = 0;
        this.preprocess = 0;
        this.fract_delta = true;

        this.randomness_ratio = 0;
        this.explosiveness_ratio = 0;

        /** @type {number[]} */
        this.parameters = new Array(Parameter.MAX);
        /** @type {Curve[]} */
        this.curve_parameters = new Array(Parameter.MAX);
        /** @type {number[]} */
        this.randomness = new Array(Parameter.MAX);
        /** @type {boolean[]} */
        this.flags = new Array(Flags.MAX);

        this.color = new Color(1, 1, 1, 1);
        this.color_ramp = null;

        this._texture = null;
        this.normalmap = null;

        /** @type {Color[]} */
        this.emission_colors = [];
        /** @type {Vector2[]} */
        this.emission_normals = [];
        /** @type {Vector2[]} */
        this.emission_points = [];
        this.emission_rect_extents = new Vector2(1, 1);
        this.emission_shape = EmissionShape.POINT;
        this.emission_sphere_radius = 1;

        this.fixed_fps = 0;

        this.speed_scale = 1;

        this.spread = 45;

        this.flag_align_y = 0;
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

        this.draw_order = DrawOrder.INDEX;

        this.time = 0;
        this.inactive_time = 0;
        this.frame_remainder = 0;
        this.cycle = 0;

        this.blend_mode = BLEND_MODES.NORMAL;

        /**
         * @type {Particle[]}
         */
        this.particles = [];
        /**
         * @type {number[]}
         */
        this.particle_order = [];

        this.internal_process = true;

        // initialize
        for (let i = 0; i < Parameter.MAX; i++) {
            this.parameters[i] = 0;
        }
        for (let i = 0; i < Parameter.MAX; i++) {
            this.randomness[i] = 0;
        }
        for (let i = 0; i < Flags.MAX; i++) {
            this.flags[i] = false;
        }

        this.amount = 8;

        this.set_param(Parameter.INITIAL_LINEAR_VELOCITY, 1);
        this.set_param(Parameter.ANGULAR_VELOCITY, 0);
        this.set_param(Parameter.ORBIT_VELOCITY, 0);
        this.set_param(Parameter.LINEAR_ACCEL, 0);
        this.set_param(Parameter.RADIAL_ACCEL, 0);
        this.set_param(Parameter.TANGENTIAL_ACCEL, 0);
        this.set_param(Parameter.DAMPING, 0);
        this.set_param(Parameter.ANGLE, 0);
        this.set_param(Parameter.SCALE, 1);
        this.set_param(Parameter.HUE_VARIATION, 0);
        this.set_param(Parameter.ANIM_SPEED, 0);
        this.set_param(Parameter.ANIM_OFFSET, 0);
    }

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
        if (data.flag_align_y !== undefined) this.flag_align_y = data.flag_align_y;
        if (data.flatness !== undefined) this.flatness = data.flatness;
        if (data.fract_delta !== undefined) this.fract_delta = data.fract_delta;
        if (data.draw_order !== undefined) this.draw_order = data.draw_order;

        if (data.blend_mode !== undefined) this.blend_mode = data.blend_mode;

        if (data.color !== undefined) this.color.copy(data.color);
        // if (data.color_ramp !== undefined) this.color_ramp = data.data;

        if (data.texture !== undefined) this.texture = data.texture;
        // if (data.normalmap !== undefined) this.normalmap = data.normalmap;

        if (data.initial_velocity !== undefined) this.initial_velocity = data.initial_velocity;
        if (data.initial_velocity_random !== undefined) this.initial_velocity_random = data.initial_velocity_random;

        if (data.angle !== undefined) this.angle = data.angle;
        if (data.angle_curve !== undefined) this.set_param_curve(Parameter.ANGLE, new Curve().set_data(data.angle_curve.data));
        if (data.angle_random !== undefined) this.angle_random = data.angle_random;

        if (data.angular_velocity !== undefined) this.angular_velocity = data.angular_velocity;
        if (data.angular_velocity_curve !== undefined) this.set_param_curve(Parameter.ANGULAR_VELOCITY, new Curve().set_data(data.angular_velocity_curve.data));
        if (data.angular_velocity_random !== undefined) this.angular_velocity_random = data.angular_velocity_random;

        if (data.anim_offset !== undefined) this.anim_offset = data.anim_offset;
        if (data.anim_offset_curve !== undefined) this.set_param_curve(Parameter.ANIM_OFFSET, new Curve().set_data(data.anim_offset_curve.data));
        if (data.anim_offset_random !== undefined) this.anim_offset_random = data.anim_offset_random;

        if (data.anim_speed !== undefined) this.anim_speed = data.anim_speed;
        if (data.anim_speed_curve !== undefined) this.set_param_curve(Parameter.ANIM_SPEED, new Curve().set_data(data.anim_speed_curve.data));
        if (data.anim_speed_random !== undefined) this.anim_speed_random = data.anim_speed_random;

        if (data.damping !== undefined) this.damping = data.damping;
        if (data.damping_curve !== undefined) this.set_param_curve(Parameter.DAMPING, new Curve().set_data(data.damping_curve.data));
        if (data.damping_random !== undefined) this.damping_random = data.damping_random;

        // if (data.emission_colors !== undefined) this.emission_colors = data.emission_colors;
        // if (data.emission_normals !== undefined) this.emission_normals = data.emission_normals;
        // if (data.emission_points !== undefined) this.emission_points = data.emission_points;

        if (data.emission_rect_extents !== undefined) this.emission_rect_extents = data.emission_rect_extents;
        if (data.emission_shape !== undefined) this.emission_shape = data.emission_shape;
        if (data.emission_sphere_radius !== undefined) this.emission_sphere_radius = data.emission_sphere_radius;

        if (data.hue_variation !== undefined) this.hue_variation = data.hue_variation;
        if (data.hue_variation_curve !== undefined) this.set_param_curve(Parameter.HUE_VARIATION, new Curve().set_data(data.hue_variation_curve.data));
        if (data.hue_variation_random !== undefined) this.hue_variation_random = data.hue_variation_random;

        if (data.linear_accel !== undefined) this.linear_accel = data.linear_accel;
        if (data.linear_accel_curve !== undefined) this.set_param_curve(Parameter.LINEAR_ACCEL, new Curve().set_data(data.linear_accel_curve.data));
        if (data.linear_accel_random !== undefined) this.linear_accel_random = data.linear_accel_random;

        if (data.radial_accel !== undefined) this.radial_accel = data.radial_accel;
        if (data.radial_accel_curve !== undefined) this.set_param_curve(Parameter.RADIAL_ACCEL, new Curve().set_data(data.radial_accel_curve.data));
        if (data.radial_accel_random !== undefined) this.radial_accel_random = data.radial_accel_random;

        if (data.scale_amount !== undefined) this.scale_amount = data.scale_amount;
        if (data.scale_amount_curve !== undefined) this.set_param_curve(Parameter.SCALE, new Curve().set_data(data.scale_amount_curve.data));
        if (data.scale_amount_random !== undefined) this.scale_amount_random = data.scale_amount_random;

        if (data.tangential_accel !== undefined) this.tangential_accel = data.tangential_accel;
        if (data.tangential_accel_curve !== undefined) this.set_param_curve(Parameter.TANGENTIAL_ACCEL, new Curve().set_data(data.tangential_accel_curve.data));
        if (data.tangential_accel_random !== undefined) this.tangential_accel_random = data.tangential_accel_random;

        return this;
    }

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
     * @param {Parameter} p_param
     * @param {number} p_value
     */
    set_param(p_param, p_value) {
        this.parameters[p_param] = p_value;
    }
    /**
     * @param {Parameter} p_param
     */
    get_param(p_param) {
        return this.parameters[p_param];
    }

    /**
     * @param {Parameter} p_param
     * @param {number} p_value
     */
    set_param_randomness(p_param, p_value) {
        this.randomness[p_param] = p_value;
    }
    /**
     * @param {Parameter} p_param
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
     * @param {Parameter} p_param
     * @param {Curve} p_curve
     */
    set_param_curve(p_param, p_curve) {
        this.curve_parameters[p_param] = p_curve;

        switch (p_param) {
            case Parameter.INITIAL_LINEAR_VELOCITY: {
                //do none for this one
            } break;
            case Parameter.ANGULAR_VELOCITY: {
                this._adjust_curve_range(p_curve, -360, 360);
            } break;
            /*case Parameter.ORBIT_VELOCITY: {
                this._adjust_curve_range(p_curve, -500, 500);
            } break;*/
            case Parameter.LINEAR_ACCEL: {
                this._adjust_curve_range(p_curve, -200, 200);
            } break;
            case Parameter.RADIAL_ACCEL: {
                this._adjust_curve_range(p_curve, -200, 200);
            } break;
            case Parameter.TANGENTIAL_ACCEL: {
                this._adjust_curve_range(p_curve, -200, 200);
            } break;
            case Parameter.DAMPING: {
                this._adjust_curve_range(p_curve, 0, 100);
            } break;
            case Parameter.ANGLE: {
                this._adjust_curve_range(p_curve, -360, 360);
            } break;
            case Parameter.SCALE: {
            } break;
            case Parameter.HUE_VARIATION: {
                this._adjust_curve_range(p_curve, -1, 1);
            } break;
            case Parameter.ANIM_SPEED: {
                this._adjust_curve_range(p_curve, 0, 200);
            } break;
            case Parameter.ANIM_OFFSET: {
            } break;
            default: { }
        }
    }
    /**
     * @param {Parameter} p_param
     */
    get_param_curve(p_param) {
        return this.curve_parameters[p_param];
    }

    /**
     * @param {number} delta
     */
    _propagate_process(delta) {
        super._propagate_process(delta);

        if (!this.internal_process) {
            return;
        }

        if (this.particles.length === 0 || !this.world_visible) {
            return;
        }

        if (this.emitting) {
            this.inactive_time = 0;
        } else {
            this.inactive_time += delta;
            if (this.inactive_time > this.lifetime * 1.2) {
                this.internal_process = false;

                // reset variables
                this.time = 0;
                this.inactive_time = 0;
                this.frame_remainder = 0;
                this.cycle = 0;
                return;
            }
        }

        if (this.time === 0 && this.preprocess > 0) {
            let frame_time = 0;
            if (this.fixed_fps > 0) {
                frame_time += 1 / this.fixed_fps;
            } else {
                frame_time += 1 / 30;
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

        const emission_xform = Matrix.new();
        const velocity_xform = Matrix.new();
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

            if (restart) {
                if (!this.emitting) {
                    p.active = false;
                    continue;
                }
                p.active = true;

                let tex_angle = 0;
                if (this.curve_parameters[Parameter.ANGLE]) {
                    tex_angle = this.curve_parameters[Parameter.ANGLE].interpolate(0);
                }

                let tex_anim_offset = 0;
                if (this.curve_parameters[Parameter.ANGLE]) {
                    tex_anim_offset = this.curve_parameters[Parameter.ANGLE].interpolate(0);
                }

                p.angle_rand = randf();
                p.scale_rand = randf();
                p.hue_rot_rand = randf();
                p.anim_offset_rand = randf();

                let angle1_rad = (randf() * 2 - 1) * PI * this.spread / 180;
                const rot = Vector2.new(Math.cos(angle1_rad), Math.sin(angle1_rad));
                p.velocity.copy(rot).scale(this.parameters[Parameter.INITIAL_LINEAR_VELOCITY] * lerp(1, randf(), this.randomness[Parameter.INITIAL_LINEAR_VELOCITY]));

                let base_angle = (this.parameters[Parameter.ANGLE] + tex_angle) * lerp(1, p.angle_rand, this.randomness[Parameter.ANGLE]);
                p.rotation = deg2rad(base_angle);

                p.custom[0] = 0; // unused
                p.custom[1] = 0; // phase [0..1]
                p.custom[2] = (this.parameters[Parameter.ANIM_OFFSET] + tex_anim_offset) * lerp(1, p.anim_offset_rand, this.randomness[Parameter.ANIM_OFFSET]);
                p.custom[3] = 0;
                p.transform.set(1, 0, 0, 1, 0, 0);
                p.time = 0;
                p.base_color.set(1, 1, 1, 1);

                const vec = Vector2.new();
                switch (this.emission_shape) {
                    case EmissionShape.POINT: {
                    } break;
                    // TODO: new sphere emit shape implementation
                    case EmissionShape.SPHERE: {
                        vec.set(randf() * 2 - 1, randf() * 2 - 1)
                            .normalize()
                            .scale(this.emission_sphere_radius);
                        p.transform.tx = vec.x;
                        p.transform.ty = vec.y;
                    } break;
                    case EmissionShape.RECTANGLE: {
                        vec.set(randf() * 2 - 1, randf() * 2 - 1)
                            .multiply(this.emission_rect_extents);
                        p.transform.tx = vec.x;
                        p.transform.ty = vec.y;
                    } break;
                    case EmissionShape.POINTS:
                    case EmissionShape.DIRECTED_POINTS: {
                        const pc = this.emission_points.length;
                        if (pc === 0) {
                            break;
                        }

                        const random_idx = rand_range_i(0, pc - 1);

                        let pos = this.emission_points[random_idx];
                        p.transform.tx = pos.x;
                        p.transform.ty = pos.y;

                        if (this.emission_shape === EmissionShape.DIRECTED_POINTS && this.emission_normals.length === pc) {
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
                    Matrix.free(t);
                }
            } else if (!p.active) {
                continue;
            } else {
                p.time += local_delta;
                p.custom[1] = p.time / this.lifetime;

                let tex_linear_velocity = 0;
                if (this.curve_parameters[Parameter.INITIAL_LINEAR_VELOCITY]) {
                    tex_linear_velocity = this.curve_parameters[Parameter.INITIAL_LINEAR_VELOCITY].interpolate(p.custom[1]);
                }

                let tex_orbit_velocity = 0;
                if (this.curve_parameters[Parameter.ORBIT_VELOCITY]) {
                    tex_orbit_velocity = this.curve_parameters[Parameter.ORBIT_VELOCITY].interpolate(p.custom[1]);
                }

                let tex_angular_velocity = 0;
                if (this.curve_parameters[Parameter.ANGULAR_VELOCITY]) {
                    tex_angular_velocity = this.curve_parameters[Parameter.ANGULAR_VELOCITY].interpolate(p.custom[1]);
                }

                let tex_linear_accel = 0;
                if (this.curve_parameters[Parameter.LINEAR_ACCEL]) {
                    tex_linear_accel = this.curve_parameters[Parameter.LINEAR_ACCEL].interpolate(p.custom[1]);
                }

                let tex_tangential_accel = 0;
                if (this.curve_parameters[Parameter.TANGENTIAL_ACCEL]) {
                    tex_tangential_accel = this.curve_parameters[Parameter.TANGENTIAL_ACCEL].interpolate(p.custom[1]);
                }

                let tex_radial_accel = 0;
                if (this.curve_parameters[Parameter.RADIAL_ACCEL]) {
                    tex_radial_accel = this.curve_parameters[Parameter.RADIAL_ACCEL].interpolate(p.custom[1]);
                }

                let tex_damping = 0;
                if (this.curve_parameters[Parameter.DAMPING]) {
                    tex_damping = this.curve_parameters[Parameter.DAMPING].interpolate(p.custom[1]);
                }

                let tex_angle = 0;
                if (this.curve_parameters[Parameter.ANGLE]) {
                    tex_angle = this.curve_parameters[Parameter.ANGLE].interpolate(p.custom[1]);
                }

                let tex_anim_speed = 0;
                if (this.curve_parameters[Parameter.ANIM_SPEED]) {
                    tex_anim_speed = this.curve_parameters[Parameter.ANIM_SPEED].interpolate(p.custom[1]);
                }

                let tex_anim_offset = 0;
                if (this.curve_parameters[Parameter.ANIM_OFFSET]) {
                    tex_anim_offset = this.curve_parameters[Parameter.ANIM_OFFSET].interpolate(p.custom[1]);
                }

                const force = this.gravity.clone();
                const pos = Vector2.new(p.transform.tx, p.transform.ty);

                // Apply linear acceleration
                if (p.velocity.length_squared() > 0) {
                    force.add(
                        p.velocity.normalized().scale(
                            (this.parameters[Parameter.LINEAR_ACCEL] + tex_linear_accel) * lerp(1, randf(), this.randomness[Parameter.LINEAR_ACCEL])
                        )
                    );
                }
                // Apply radial acceleration
                const org = emission_xform.origin.clone();
                const diff = pos.clone().subtract(org);
                if (diff.length_squared() > 0) {
                    force.add(diff.normalized().scale((this.parameters[Parameter.RADIAL_ACCEL] + tex_radial_accel) * lerp(1, randf(), this.randomness[Parameter.RADIAL_ACCEL])));
                }
                // Apply tangential acceleration
                const yx = Vector2.new(diff.y, diff.x);
                if (yx.length_squared() > 0) {
                    yx.multiply(-1, 1).normalize()
                        .scale((this.parameters[Parameter.TANGENTIAL_ACCEL] + tex_tangential_accel) * lerp(1, randf(), this.randomness[Parameter.TANGENTIAL_ACCEL]))
                    force.add(yx);
                }
                Vector2.free(yx);
                // Apply attractor forces
                p.velocity.add(force.x * local_delta, force.y * local_delta);
                // Orbit velocity
                const orbit_amount = (this.parameters[Parameter.ORBIT_VELOCITY] + tex_orbit_velocity) * lerp(1, randf(), this.randomness[Parameter.ORBIT_VELOCITY]);
                if (orbit_amount !== 0) {
                    const ang = orbit_amount * local_delta * Math.PI * 2;
                    const rot = Matrix.new();
                    rot.rotate(-ang);
                    const x_diff = rot.basis_xform(diff);
                    p.transform.tx -= diff.x;
                    p.transform.ty -= diff.y;
                    p.transform.tx += x_diff.x;
                    p.transform.ty += x_diff.y;
                    Vector2.free(x_diff);
                    Matrix.free(rot);
                }
                if (this.curve_parameters[Parameter.INITIAL_LINEAR_VELOCITY]) {
                    p.velocity.normalize().scale(tex_linear_velocity);
                }

                if (this.parameters[Parameter.DAMPING] + tex_damping > 0) {
                    let v = p.velocity.length();
                    let damp = (this.parameters[Parameter.DAMPING] + tex_damping) * lerp(1, randf(), this.randomness[Parameter.DAMPING]);
                    v -= damp * local_delta;
                    if (v < 0) {
                        p.velocity.set(0, 0);
                    } else {
                        p.velocity.normalize().scale(v);
                    }
                }
                let base_angle = (this.parameters[Parameter.ANGLE] + tex_angle) * lerp(1, p.angle_rand, this.randomness[Parameter.ANGLE]);
                base_angle += p.custom[1] * this.lifetime * (this.parameters[Parameter.ANGULAR_VELOCITY] + tex_angular_velocity) * lerp(1, randf() * 2 - 1, this.randomness[Parameter.ANGULAR_VELOCITY]);
                p.rotation = deg2rad(base_angle);
                let animation_phase = (this.parameters[Parameter.ANIM_OFFSET] + tex_anim_offset) * lerp(1, p.anim_offset_rand, this.randomness[Parameter.ANIM_OFFSET]) + p.custom[1] * (this.parameters[Parameter.ANIM_SPEED] + tex_anim_speed) * lerp(1, randf(), this.randomness[Parameter.ANIM_SPEED]);
                p.custom[2] = animation_phase;
            }
            // Apply color
            // Apply hue rotation

            let tex_scale = 1;
            if (this.curve_parameters[Parameter.SCALE]) {
                tex_scale = this.curve_parameters[Parameter.SCALE].interpolate(p.custom[1]);
            }

            let tex_hue_variation = 0;
            if (this.curve_parameters[Parameter.HUE_VARIATION]) {
                tex_hue_variation = this.curve_parameters[Parameter.HUE_VARIATION].interpolate(p.custom[1]);
            }

            let hue_rot_angle = (this.parameters[Parameter.HUE_VARIATION] + tex_hue_variation) * PI2 * lerp(1, p.hue_rot_rand * 2 - 1, this.randomness[Parameter.HUE_VARIATION]);
            let hue_rot_c = Math.cos(hue_rot_angle);
            let hue_rot_s = Math.sin(hue_rot_angle);

            for (let j = 0; j < 3; j++) {
                hue_rot_mat[j][0] = mat1[j][0] + mat2[j][0] * hue_rot_c + mat3[j][0] * hue_rot_s;
                hue_rot_mat[j][1] = mat1[j][1] + mat2[j][1] * hue_rot_c + mat3[j][1] * hue_rot_s;
                hue_rot_mat[j][2] = mat1[j][2] + mat2[j][2] * hue_rot_c + mat3[j][2] * hue_rot_s;
            }

            // TODO: gradient/color ramp
            p.color.copy(this.color);

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

            if (this.flags[Flags.ALIGN_Y_TO_VELOCITY]) {
                if (p.velocity.length_squared() > 0) {
                    const vel_n = p.velocity.normalized();
                    p.transform.c = vel_n.x;
                    p.transform.d = vel_n.y;
                    const tan = vel_n.set(p.transform.c, p.transform.d).tangent();
                    p.transform.a = tan.x;
                    p.transform.b = tan.y;
                    Vector2.free(vel_n);
                    Vector2.free(tan);
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
            let base_scale = lerp(this.parameters[Parameter.SCALE] * tex_scale, 1, p.scale_rand * this.randomness[Parameter.SCALE]);
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
    }

    _update_particle_data_buffer() { }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {WebGLRenderer} renderer - The webgl renderer to use.
     */
    _render_webgl(renderer) {
        renderer.set_object_renderer(renderer.plugins.sprite);

        for (let p of this.particles) {
            if (!p.active) {
                continue;
            }

            // Update transform
            p.transform.decompose(p.sprite.transform);
            if (this.local_coords) {
                p.sprite.transform.update_transform(this.transform);
            } else {
                p.sprite.transform.update_transform(this._temp_node_2d_parent.transform);
            }
            p.sprite.calculate_vertices();

            // Update texture
            p.sprite.texture = this.texture;

            // Color
            p.sprite.blend_mode = this.blend_mode;
            p.sprite.modulate.copy(p.color).multiply(this.modulate).multiply(this.self_modulate);
            p.sprite._update_color();

            renderer.plugins.sprite.render(p.sprite);
        }
    }
}

CPUParticles2D.DrawOrder = DrawOrder;
CPUParticles2D.Parameter = Parameter;
CPUParticles2D.Flags = Flags;
CPUParticles2D.EmissionShape = EmissionShape;

node_class_map['CPUParticles2D'] = CPUParticles2D;
