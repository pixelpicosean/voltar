import { Rectangle, Matrix } from "engine/math/index";

export default class Shape2D {
    get custom_solver_bias() {
        return this.custom_bias;
    }
    /**
     * @param {number} value
     */
    set custom_solver_bias(value) {
        this.custom_bias = value;
        // TODO: [physics] shape_set_custom_solver_bias(this.shape, this.custom_bias)
    }
    /**
     * @param {number} value
     */
    set_custom_solver_bias(value) {
        this.custom_solver_bias = value;
        return this;
    }

    /**
     * @param {import('engine/servers/physics_2d/shape_2d_sw').Shape2DSW} p_shape
     */
    constructor(p_shape) {
        this.shape = p_shape;
        this.custom_bias = 0;

        this.type = -1;

        /* CollisionObject2DSW::Shape API */
        this.xform = new Matrix();
        this.xform_inv = new Matrix();
        this.bpid = -1;
        this.aabb_cache = new Rectangle();
        this.metadata = null;
        this.disabled = false;
        this.one_way_collision = false;
    }

    collide_with_motion(p_local_xform, p_local_motion, p_shape, p_shape_xform, p_shape_motion) {
        return false;
    }
    collide(p_local_xform, p_shape, p_shape_xform) {
        return false;
    }

    collide_with_motion_and_get_contacts(p_local_xform, p_local_motion, p_shape, p_shape_xform, p_shape_motion) {
        return false;
    }
    collide_and_get_contacts(p_local_xform, p_shape, p_shape_xform) {
        return false;
    }

    get_rect(rect = new Rectangle()) {
        rect.x = rect.y = rect.width = rect.height = 0;
        return rect;
    }
}
