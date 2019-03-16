import { node_class_map } from "engine/registry";
import {
    Vector2,
    rad2deg,
    deg2rad,
    Transform,
    ObservableVector2,
} from "engine/core/math/index";
import Node2D from "../node_2d";

export default class CanvasLayer extends Node2D {
    /**
     * @type {Vector2}
     */
    get offset() {
        return this.custom_transform.position;
    }
    set offset(value) {
        this.custom_transform.position.copy(value);
    }
    /**
     * @param {Vector2} value
     */
    set_offset(value) {
        this.custom_transform.position.copy(value);
        return this;
    }

    /**
     * @type {number}
     */
    get rotation() {
        return this.custom_transform.rotation;
    }
    set rotation(value) {
        this.custom_transform.rotation = value;
    }
    /**
     * @param {number} value
     */
    set_rotation(value) {
        this.custom_transform.rotation = value;
        return this;
    }

    /**
     * @type {number}
     */
    get rotation_degree() {
        return rad2deg(this.custom_transform.rotation);
    }
    set rotation_degree(value) {
        this.custom_transform.rotation = deg2rad(value);
    }
    /**
     * @param {number} value
     */
    set_rotation_degree(value) {
        this.custom_transform.rotation = deg2rad(value);
        return this;
    }

    /**
     * @type {ObservableVector2}
     */
    get scale() {
        return this.custom_transform.scale;
    }
    set scale(value) {
        this.custom_transform.scale.copy(value);
    }
    /**
     * @param {Vector2} value
     */
    set_scale(value) {
        this.custom_transform.scale.copy(value);
        return this;
    }

    constructor() {
        super();

        this.has_transform = false;
        this.is_canvas_layer = true;
        this.toplevel = true;

        this.layer = 0;

        this.custom_transform = new Transform();

        this.layer_transform_owner = this;

        /**
         * @type {import('./viewport').default}
         */
        this.vp = null;

        this.sort_index = 0;
    }

    _load_data(data) {
        super._load_data(data);

        if (data.transform !== undefined) {
            this.custom_transform.local_transform.from_array(data.transform);
        }

        return this;
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    render_webgl(renderer) {
        // Finish current rendering batch
        renderer.current_renderer.flush();

        // Apply canvas transform
        renderer.set_projection_matrix(this.custom_transform.local_transform);

        // Render children with the new transform
        for (let c of this.children) {
            c.render_webgl(renderer);
        }

        // Let's have a rendering pass before transform reset
        renderer.current_renderer.flush();

        // Revert render transform
        renderer.set_projection_matrix(this.scene_tree.viewport.canvas_transform);
    }
}

node_class_map['CanvasLayer'] = CanvasLayer;
