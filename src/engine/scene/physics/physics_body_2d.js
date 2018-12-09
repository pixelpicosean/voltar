import CollisionObject2D from "./collision_object_2d";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import { BodyMode } from "./const";
import { Vector2 } from "engine/math/index";
import Body2DSW from "engine/servers/physics_2d/body_2d_sw";
import PhysicsMaterial from "../resources/physics_material";

export class PhysicsBody2D extends CollisionObject2D {
    /**
     * @returns {number}
     */
    get_collision_layer() {
        return this.collision_layer;
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     * @returns {boolean}
     */
    get_collision_layer_bit(bit) {
        return !!(this.collision_layer & (1 << bit));
    }
    /**
     * @param {number} layer
     * @returns {this}
     */
    set_collision_layer(layer) {
        this.collision_layer = layer;

        return this;
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {number} bit
     * @param {boolean} value
     * @returns {this}
     */
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= (1 << bit);
        } else {
            this.collision_layer &= ~(1 << bit);
        }

        return this;
    }

    /**
     * @returns {number}
     */
    get_collision_mask() {
        return this.collision_mask;
    }
    /**
     * Return an individual bit on the collision mask. Describes whether
     * this area will collide with others on the given layer.
     *
     * @param {number} bit
     * @returns {boolean}
     */
    get_collision_mask_bit(bit) {
        return !!(this.collision_mask & (1 << bit));
    }
    /**
     * @param {number} mask
     * @returns {this}
     */
    set_collision_mask(mask) {
        this.collision_mask = mask;

        return this;
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {number} bit
     * @param {boolean} value
     * @returns {this}
     */
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= (1 << bit);
        } else {
            this.collision_mask &= ~(1 << bit);
        }

        return this;
    }

    /**
     * @param {number} p_mask
     */
    _set_layers(p_mask) {
        this.set_collision_layer(p_mask);
        this.set_collision_mask(p_mask);
    }
    _get_layers() {
        return this.collision_layer;
    }

    /**
     * @param {BodyMode} p_mode
     */
    constructor(p_mode) {
        super(PhysicsServer.singleton.body_create(), false);

        this.collision_layer = 1;
        this.collision_mask = 1;

        /**
         * @type {Body2DSW}
         */
        this.rid;
    }

    get_collision_exception() { }
    add_collision_exception_with(p_node) { }
    remove_collision_exception_with(p_node) { }
}

export class StaticBody2D extends PhysicsBody2D {
    get friction() {
        if (!this._physics_material_override) {
            return 1;
        }

        return this._physics_material_override._friction;
    }
    /**
     * @param {number} p_friction
     */
    set friction(p_friction) {
        if (p_friction === 1) {
            return;
        }

        if (!this._physics_material_override) {
            this.physics_material_override = new PhysicsMaterial();
        }
        this._physics_material_override.friction = p_friction;
    }
    /**
     * @param {number} p_friction
     */
    set_friction(p_friction) {
        this.friction = p_friction;
        return this;
    }

    get bounce() {
        if (!this._physics_material_override) {
            return 1;
        }

        return this._physics_material_override._bounce;
    }
    /**
     * @param {number} p_bounce
     */
    set bounce(p_bounce) {
        if (p_bounce === 0) {
            return;
        }

        if (!this._physics_material_override) {
            this.physics_material_override = new PhysicsMaterial();
        }
        this._physics_material_override.bounce = p_bounce;
    }
    /**
     * @param {number} p_bounce
     */
    set_bounce(p_bounce) {
        this.bounce = p_bounce;
        return this;
    }

    get physics_material_override() {
        return this._physics_material_override;
    }
    /**
     * @param {PhysicsMaterial} p_physics_material_override
     */
    set physics_material_override(p_physics_material_override) {
        if (this._physics_material_override) {
            this._physics_material_override.disconnect('changed', this._reload_physics_characteristics, this);
        }

        this._physics_material_override = p_physics_material_override;

        if (p_physics_material_override) {
            p_physics_material_override.connect('changed', this._reload_physics_characteristics, this);
        }
        this._reload_physics_characteristics();
    }
    /**
     * @param {PhysicsMaterial} p_physics_material_override
     */
    set_physics_material_override(p_physics_material_override) {
        this.physics_material_override = p_physics_material_override;
        return this;
    }

    constructor() {
        super(BodyMode.STATIC);

        this.type = 'StaticBody2D';

        this.constant_linear_velocity = new Vector2();
        this.constant_angular_velocity = 0;

        /**
         * @type {PhysicsMaterial}
         */
        this._physics_material_override = null;
    }

    _reload_physics_characteristics() {
        if (!this._physics_material_override) {
            this.rid.bounce = 0;
            this.rid.friction = 1;
        } else {
            this.rid.bounce = this._physics_material_override.computed_bounce;
            this.rid.friction = this._physics_material_override.computed_friction;
        }
    }
}
