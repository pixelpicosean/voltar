import Node2D from "../Node2D";
import Shape2D from "../resources/shape_2d";
import { Rectangle, Vector2 } from "engine/math/index";
import { res_class_map } from "engine/registry";
import ConvexPolygonShape2D from "../resources/convex_polygon_shape_2d";
import earcut from 'earcut';
import decompose_in_convex from "engine/math/convex";

/**
 * @param {Vector2[]} arr
 */
function vec2_arr_2_num_arr(arr) {
    const res = /** @type {number[]} */(new Array(arr.length * 2));
    for (let i = 0, len = arr.length; i < len; i++) {
        res[i * 2 + 0] = arr[i].x;
        res[i * 2 + 1] = arr[i].y;
    }
    return res;
}

/**
 * @param {number[]} arr
 */
function num_arr_2_vec2_arr(arr) {
    const res = /** @type {Vector2[]} */(new Array(Math.floor(arr.length / 2)));
    for (let i = 0, len = res.length; i < len; i++) {
        res[i] = new Vector2(arr[i * 2 + 0], arr[i * 2 + 1]);
    }
    return res;
}

/**
 * @enum {number}
 */
export const BuildMode = {
    SOLIDS: 0,
    SEGMENTS: 1,
}

export default class CollisionPolygon2D extends Node2D {
    get disabled() {
        return this._disabled;
    }
    /**
     * @param {boolean} p_disabled
     */
    set disabled(p_disabled) {
        this._disabled = p_disabled;
        if (this.parent) {
            this.parent.shape_owner_set_disabled(this.owner, p_disabled);
        }
    }
    /**
     * @param {boolean} p_disabled
     */
    set_disabled(p_disabled) {
        this.disabled = p_disabled;
        return this;
    }

    get one_way_collision() {
        return this._one_way_collision;
    }
    /**
     * @param {boolean} p_one_way_collision
     */
    set one_way_collision(p_one_way_collision) {
        this._one_way_collision = p_one_way_collision;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision(this.owner, p_one_way_collision);
        }
    }
    /**
     * @param {boolean} p_one_way_collision
     */
    set_one_way_collision(p_one_way_collision) {
        this.one_way_collision = p_one_way_collision;
        return this;
    }

    get one_way_collision_margin() {
        return this._one_way_collision_margin;
    }
    /**
     * @param {number} p_one_way_collision_margin
     */
    set one_way_collision_margin(p_one_way_collision_margin) {
        this._one_way_collision_margin = p_one_way_collision_margin;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision_margin(this.owner, p_one_way_collision_margin);
        }
    }
    /**
     * @param {number} p_one_way_collision_margin
     */
    set_one_way_collision_margin(p_one_way_collision_margin) {
        this.one_way_collision_margin = p_one_way_collision_margin;
        return this;
    }

    get polygon() {
        return this._polygon;
    }
    /**
     * @param {Vector2[]} p_polygon
     */
    set polygon(p_polygon) {
        this._polygon = p_polygon;

        {
            for (let i = 0; i < p_polygon.length; i++) {
                if (i === 0) {
                    this.aabb.set(p_polygon[i].x, p_polygon[i].y, 0, 0);
                } else {
                    this.aabb.expand_to(p_polygon[i]);
                }
            }
            if (this.aabb.is_zero()) {
                this.aabb.set(-10, -10, 20, 20);
            } else {
                this.aabb.x -= this.aabb.width * 0.3;
                this.aabb.y -= this.aabb.height * 0.3;
                this.aabb.width += this.aabb.width * 0.6;
                this.aabb.height += this.aabb.height * 0.6;
            }
        }

        if (this.parent) {
            this._build_polygon();
        }
    }
    /**
     * @param {Vector2[]} p_polygon
     */
    set_polygon(p_polygon) {
        this.polygon = p_polygon;
        return this;
    }

    get build_mode() {
        return this._build_mode;
    }
    /**
     * @param {BuildMode} p_build_mode
     */
    set build_mode(p_build_mode) {
        this._build_mode = p_build_mode;
        if (this.parent) {
            this._build_polygon();
        }
    }
    /**
     * @param {BuildMode} p_build_mode
     */
    set_build_mode(p_build_mode) {
        this.build_mode = p_build_mode;
        return this;
    }

    constructor() {
        super();

        this.type = 'CollisionPolygon2D';

        this._disabled = false;
        this._one_way_collision = false;
        this._one_way_collision_margin = 1.0;
        /**
         * @type {import('./collision_object_2d').default}
         */
        this.parent = null;
        this.aabb = new Rectangle(-10, -10, 20, 20);
        this._build_mode = BuildMode.SOLIDS;
        /**
         * @type {Vector2[]}
         */
        this._polygon = [];
    }
    _load_data(p_data) {
        super._load_data(p_data);

        if (p_data.polygon !== undefined) {
            this.set_polygon(num_arr_2_vec2_arr(p_data.polygon));
        }

        return this;
    }

    _propagate_parent() {
        if (this.parent.is_collision_object) {
            this.owner = this.parent.create_shape_owner(this);
            this._build_polygon();
            this._update_in_shape_owner();
        }
    }
    _propagate_unparent() {
        if (this.parent) {
            this.parent.remove_shape_owner(this);
        }
        this.parent = null;
    }
    _propagate_enter_tree() {
        super._propagate_enter_tree();

        if (this.parent) {
            this._update_in_shape_owner();
        }
    }

    // TODO: call `_update_in_shape_owner` when "local transform changed"

    /**
     * @param {boolean} [p_xform_only]
     */
    _update_in_shape_owner(p_xform_only = false) {
        this.transform.update_local_transform();
        this.parent.shape_owner_set_transform(this, this.transform.local_transform);
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this, this._disabled);
        this.parent.shape_owner_set_one_way_collision(this, this._one_way_collision);
        this.parent.shape_owner_set_one_way_collision_margin(this, this._one_way_collision_margin);
    }

    _build_polygon() {
        this.parent.shape_owner_clear_shapes(this);

        if (this._polygon.length === 0) {
            return;
        }

        const solids = (this._build_mode === BuildMode.SOLIDS);

        if (solids) {
            // decompose concave into multiple convex polygons and add them
            const decomp = this._decompose_in_convex();
            for (let i = 0; i < decomp.length; i++) {
                const convex = new ConvexPolygonShape2D();
                convex.set_points(decomp[i]);
                this.parent.shape_owner_add_shape(this, convex);
            }
        } else {
            // TODO: segment support
        }
    }

    _decompose_in_convex() {
        return decompose_in_convex(this._polygon).map(arr => arr.reverse());
    }
}
