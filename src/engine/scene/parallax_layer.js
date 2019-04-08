import { Vector2, ObservableVector2, Matrix } from "engine/core/math/index";
import { node_class_map } from "engine/registry";

import Node2D from "./node_2d";

export class ParallaxLayer extends Node2D {
    constructor() {
        super();

        this.type = 'ParallaxLayer';

        this.motion_mirroring = new ObservableVector2(this._on_motion_mirror_changed, this);
        this.motion_offset = new ObservableVector2(this._on_motion_offset_changed, this);
        this.motion_scale = new ObservableVector2(this._on_motion_scale_changed, this);

        this.orig_offset = new Vector2();
        this.orig_scale = new Vector2();
        this.screen_offset = new Vector2();

        this._mirror_scale = new Vector2();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.motion_mirroring !== undefined) this.motion_mirroring.copy(data.motion_mirroring);
        if (data.motion_offset !== undefined) this.motion_offset.copy(data.motion_offset);
        if (data.motion_scale !== undefined) this.motion_scale.copy(data.motion_scale);

        return this;
    }

    _propagate_enter_tree() {
        super._propagate_enter_tree();

        this.orig_offset.copy(this.position);
        this.orig_scale.copy(this.scale);
        this._update_mirroring();
    }

    /**
     * @param {Vector2} p_offset
     * @param {number} p_scale
     * @param {Vector2} p_screen_offset
     */
    set_base_offset_and_scale(p_offset, p_scale, p_screen_offset) {
        this.screen_offset.copy(p_offset);

        if (!this.is_inside_tree) {
            return;
        }

        const offset_scale = this.motion_offset.clone().scale(p_scale);
        const orig_offset_scale = this.orig_offset.clone().scale(p_scale);
        const new_ofs = p_offset.clone().subtract(this.screen_offset).multiply(this.motion_scale)
            .add(this.screen_offset)
            .add(offset_scale)
            .add(orig_offset_scale)

        if (this.motion_mirroring.x) {
            const den = this.motion_mirroring.x * p_scale;
            new_ofs.x -= den * Math.ceil(new_ofs.x / den);
        }
        if (this.motion_mirroring.y) {
            const den = this.motion_mirroring.y * p_scale;
            new_ofs.y -= den * Math.ceil(new_ofs.y / den);
        }

        this.position.copy(new_ofs);
        this.scale.copy(this.orig_scale).scale(p_scale);

        this._update_mirroring();
    }

    _update_mirroring() {
        this._mirror_scale.copy(this.motion_mirroring).multiply(this.scale);
    }

    _on_motion_scale_changed() {
        const pb = /** @type {import('./parallax_background').ParallaxBackground} */(this.parent);
        if (pb.type === 'ParallaxBackground' && this.is_inside_tree) {
            this.set_base_offset_and_scale(pb.final_offset, pb.scroll_scale, this.screen_offset);
        }
    }
    _on_motion_offset_changed() {
        const pb = /** @type {import('./parallax_background').ParallaxBackground} */(this.parent);
        if (pb.type === 'ParallaxBackground' && this.is_inside_tree) {
            this.set_base_offset_and_scale(pb.final_offset, pb.scroll_scale, this.screen_offset);
        }
    }
    _on_motion_mirror_changed() {
        if (this.motion_mirroring.x < 0) {
            this.motion_mirroring.x = 0;
        }
        if (this.motion_mirroring.y < 0) {
            this.motion_mirroring.y = 0;
        }
        this._update_mirroring();
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    render_webgl(renderer) {
        if (this._destroyed || this.is_queued_for_deletion) return;

        this._render_webgl(renderer);

        // simply render children!
        for (let c of this.children) {
            c.render_webgl(renderer);
        }

        // render mirroring children
        const canvas_transform = renderer.current_projection_matrix.clone();

        const xform = Matrix.new();
        if (this.motion_mirroring.x !== 0) {
            xform.copy(canvas_transform).translate(this.motion_mirroring.x, 0);

            renderer.current_renderer.flush();
            renderer.set_projection_matrix(xform);
            for (let c of this.children) {
                c.render_webgl(renderer);
            }
        }
        if (this.motion_mirroring.y !== 0) {
            xform.copy(canvas_transform).translate(0, this.motion_mirroring.y);

            renderer.current_renderer.flush();
            renderer.set_projection_matrix(xform);
            for (let c of this.children) {
                c.render_webgl(renderer);
            }
        }
        if (this.motion_mirroring.x !== 0 && this.motion_mirroring.y !== 0) {
            xform.copy(canvas_transform).translate(this.motion_mirroring.x, this.motion_mirroring.y);

            renderer.current_renderer.flush();
            renderer.set_projection_matrix(xform);
            for (let c of this.children) {
                c.render_webgl(renderer);
            }
        }

        renderer.current_renderer.flush();
        renderer.set_projection_matrix(canvas_transform);
    }
}

node_class_map['ParallaxLayer'] = ParallaxLayer;
