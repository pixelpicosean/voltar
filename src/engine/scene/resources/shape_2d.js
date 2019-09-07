import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";

import { Shape2DSW } from "engine/servers/physics_2d/shape_2d_sw";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";


export class Shape2D {
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
        this.shape = p_shape;
        this.custom_bias = 0;
    }

    /**
     * @param {*} data
     */
    _load_data(data) { return this }

    /**
     * @param {Transform2D} p_local_xform
     * @param {Vector2} p_local_motion
     * @param {Shape2D} p_shape
     * @param {Transform2D} p_shape_xform
     * @param {Vector2} p_shape_motion
     */
    collide_with_motion(p_local_xform, p_local_motion, p_shape, p_shape_xform, p_shape_motion) {
        return Physics2DServer.get_singleton().shape_collide(this.shape, p_local_xform, p_local_motion, p_shape.shape, p_shape_xform, p_shape_motion, null, 0, { value: 0 });
    }
    /**
     * @param {Transform2D} p_local_xform
     * @param {Shape2D} p_shape
     * @param {Transform2D} p_shape_xform
     */
    collide(p_local_xform, p_shape, p_shape_xform) {
        const v0 = Vector2.new();
        const v1 = Vector2.new();

        const res = Physics2DServer.get_singleton().shape_collide(this.shape, p_local_xform, v0, p_shape.shape, p_shape_xform, v1, null, 0, { value: 0 });

        Vector2.free(v0);
        Vector2.free(v1);

        return res;
    }
    /**
     * @param {Transform2D} p_local_xform
     * @param {Vector2} p_local_motion
     * @param {Shape2D} p_shape
     * @param {Transform2D} p_shape_xform
     * @param {Vector2} p_shape_motion
     * @returns {Vector2[]}
     */
    collide_with_motion_and_get_contacts(p_local_xform, p_local_motion, p_shape, p_shape_xform, p_shape_motion) {
        const max_contacts = 16;
        const result = new Array(max_contacts * 2);
        for (let i = 0; i < max_contacts; i++) result[i] = Vector2.new();
        const contacts = { value: 0 };

        if (!Physics2DServer.get_singleton().shape_collide(this.shape, p_local_xform, p_local_motion, p_shape.shape, p_shape_xform, p_shape_motion, result, max_contacts, contacts)) {
            return null;
        }

        result.length = contacts.value;
        // FIXME: why we only return half the results?

        return result;
    }
    /**
     * @param {Transform2D} p_local_xform
     * @param {Shape2D} p_shape
     * @param {Transform2D} p_shape_xform
     * @returns {Vector2[]}
     */
    collide_and_get_contacts(p_local_xform, p_shape, p_shape_xform) {
        const max_contacts = 16;
        const result = new Array(max_contacts * 2);
        for (let i = 0; i < max_contacts; i++) result[i] = Vector2.new();
        const contacts = { value: 0 };

        const v0 = Vector2.new();
        const v1 = Vector2.new();
        if (!Physics2DServer.get_singleton().shape_collide(this.shape, p_local_xform, v0, p_shape.shape, p_shape_xform, v1, result, max_contacts, contacts)) {
            Vector2.free(v0);
            Vector2.free(v1);
            return null;
        }
        Vector2.free(v0);
        Vector2.free(v1);

        result.length = contacts.value;
        // FIXME: why we only return half the results?

        return result;
    }

    get_rect(rect = Rect2.new()) {
        rect.x = rect.y = rect.width = rect.height = 0;
        return rect;
    }
    get_rid() {
        return this.shape;
    }
}
