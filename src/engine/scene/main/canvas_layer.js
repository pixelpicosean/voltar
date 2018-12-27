import Node2D from "../Node2D";
import { Vector2, rad2deg, deg2rad, Matrix } from "engine/math/index";

export default class CanvasLayer extends Node2D {
    get offset() {
        return this.transform.position;
    }
    /**
     * @param {Vector2} value
     */
    set offset(value) {
        this.transform.position.copy(value);
    }
    /**
     * @param {Vector2} value
     */
    set_offset(value) {
        this.transform.position.copy(value);
        return this;
    }

    get rotation_degree() {
        return rad2deg(this.transform.rotation);
    }
    /**
     * @param {number} value
     */
    set rotation_degree(value) {
        this.transform.rotation = deg2rad(value);
    }
    /**
     * @param {number} value
     */
    set_rotation_degree(value) {
        this.transform.rotation = deg2rad(value);
        return this;
    }

    constructor() {
        super();

        this.is_canvas_layer = true;
        this.toplevel = true;

        this.layer = 0;

        /**
         * @type {import('./viewport').default}
         */
        this.vp = null;

        this.sort_index = 0;
    }

    _recursive_post_update_transform() {
        this.transform.update_transform(this._temp_node_2d_parent.transform);
    }
    _update_transform() {
        this.transform.update_transform(this._temp_node_2d_parent.transform);
        this._bounds.update_id++;
    }
    update_transform() {
        const parent = this._temp_node_2d_parent;

        this._bounds_id++;

        let transform_changed = (this.transform._local_id !== this.transform._current_local_id);
        this.transform.update_transform(parent.transform);
        if (transform_changed) {
            this._notify_transform_changed();
        }

        let t = this.transform.local_transform;
        this._world_position.set(t.tx, t.ty);
        this._world_scale.copy(this.scale);
        this._world_rotation = this.transform.rotation;

        for (let child of this.children) {
            if (child.visible) {
                child.update_transform();
            }
        }
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {import('engine/renderers/WebGLRenderer').default} renderer - The renderer
     */
    render_webgl(renderer) {
        // Finish current rendering batch
        renderer.current_renderer.flush();

        // Apply canvas transform
        renderer.bind_render_texture(undefined, this.transform.local_transform);

        // simply render children!
        for (let c of this.children) {
            c.render_webgl(renderer);
        }

        // Revert render transform
        renderer.bind_render_texture(undefined, this.scene_tree.viewport.canvas_transform);
    }
}
/**
 * performance increase to avoid using call.. (10x faster)
 * @this {CanvasLayer}
 */
CanvasLayer.prototype.node2d_update_transform = CanvasLayer.prototype.update_transform;
