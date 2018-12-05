import { Rectangle, Matrix, Vector2 } from "engine/math/index";
import { Shape2DSW } from "engine/servers/physics_2d/shape_2d_sw";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import { VObject } from "engine/dep/index";

export default class Shape2D extends VObject {
    get custom_solver_bias() {
        return this.custom_bias;
    }
    /**
     * @param {number} value
     */
    set custom_solver_bias(value) {
        this.custom_bias = value;
        this.shape.custom_bias = value;
    }
    /**
     * @param {number} value
     */
    set_custom_solver_bias(value) {
        this.custom_solver_bias = value;
        return this;
    }

    /**
     * @param {Shape2DSW} p_shape
     */
    constructor(p_shape) {
        super();

        this.shape = p_shape;
        this.custom_bias = 0;

        /* CollisionObject2DSW::Shape API */
        this.xform = new Matrix();
        this.xform_inv = new Matrix();
        this.bpid = -1;
        this.aabb_cache = new Rectangle();
        this.metadata = null;
        this.disabled = false;
        this.one_way_collision = false;
    }

    /**
     * @param {Matrix} p_local_xform
     * @param {Vector2} p_local_motion
     * @param {Shape2D} p_shape
     * @param {Matrix} p_shape_xform
     * @param {Vector2} p_shape_motion
     */
    collide_with_motion(p_local_xform, p_local_motion, p_shape, p_shape_xform, p_shape_motion) {
        return PhysicsServer.singleton.shape_collide(this.shape, p_local_xform, p_local_motion, p_shape.shape, p_shape_xform, p_shape_motion, null, 0, { value: 0 });
    }
    /**
     * @param {Matrix} p_local_xform
     * @param {Shape2D} p_shape
     * @param {Matrix} p_shape_xform
     */
    collide(p_local_xform, p_shape, p_shape_xform) {
        const v0 = Vector2.create();
        const v1 = Vector2.create();

        const res = PhysicsServer.singleton.shape_collide(this.shape, p_local_xform, v0, p_shape.shape, p_shape_xform, v1, null, 0, { value: 0 });

        Vector2.delete(v0);
        Vector2.delete(v1);

        return res;
    }
    /**
     * @param {Matrix} p_local_xform
     * @param {Vector2} p_local_motion
     * @param {Shape2D} p_shape
     * @param {Matrix} p_shape_xform
     * @param {Vector2} p_shape_motion
     * @returns {Vector2[]}
     */
    collide_with_motion_and_get_contacts(p_local_xform, p_local_motion, p_shape, p_shape_xform, p_shape_motion) {
        const max_contacts = 16;
        const result = new Array(max_contacts * 2);
        for (let i = 0; i < max_contacts; i++) result[i] = Vector2.create();
        const contacts = { value: 0 };

        if (!PhysicsServer.singleton.shape_collide(this.shape, p_local_xform, p_local_motion, p_shape.shape, p_shape_xform, p_shape_motion, result, max_contacts, contacts)) {
            return null;
        }

        result.length = contacts.value;
        // FIXME: why we only return half the results?

        return result;
    }
    /**
     * @param {Matrix} p_local_xform
     * @param {Shape2D} p_shape
     * @param {Matrix} p_shape_xform
     * @returns {Vector2[]}
     */
    collide_and_get_contacts(p_local_xform, p_shape, p_shape_xform) {
        const max_contacts = 16;
        const result = new Array(max_contacts * 2);
        for (let i = 0; i < max_contacts; i++) result[i] = Vector2.create();
        const contacts = { value: 0 };

        const v0 = Vector2.create();
        const v1 = Vector2.create();
        if (!PhysicsServer.singleton.shape_collide(this.shape, p_local_xform, v0, p_shape.shape, p_shape_xform, v1, result, max_contacts, contacts)) {
            Vector2.delete(v0);
            Vector2.delete(v1);
            return null;
        }
        Vector2.delete(v0);
        Vector2.delete(v1);

        result.length = contacts.value;
        // FIXME: why we only return half the results?

        return result;
    }

    get_rect(rect = new Rectangle()) {
        rect.x = rect.y = rect.width = rect.height = 0;
        return rect;
    }
    get_rid() {
        return this.shape;
    }
}
