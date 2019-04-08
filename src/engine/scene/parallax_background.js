import { node_class_map } from "engine/registry";
import { Vector2, Matrix, ObservableVector2 } from "engine/core/math/index";

import CanvasLayer from "./main/canvas_layer";

export class ParallaxBackground extends CanvasLayer {
    constructor() {
        super();

        this.type = 'ParallaxBackground';

        this.scroll_base_offset = new ObservableVector2(this._update_scroll, this);
        this.scroll_base_scale = new ObservableVector2(this._update_scroll, this, 1, 1);
        this.scroll_ignore_camera_zoom = false;
        this.scroll_limit_begin = new ObservableVector2(this._update_scroll, this);
        this.scroll_limit_end = new ObservableVector2(this._update_scroll, this);
        this.scroll_offset = new ObservableVector2(this._update_scroll, this);

        this.scroll_scale = 1.0;
        this.screen_offset = new Vector2();
        this.final_offset = new Vector2();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.scroll_base_offset !== undefined) this.scroll_base_offset.copy(data.scroll_base_offset);
        if (data.scroll_base_scale !== undefined) this.scroll_base_scale.copy(data.scroll_base_scale);
        if (data.scroll_ignore_camera_zoom !== undefined) this.scroll_ignore_camera_zoom = data.scroll_ignore_camera_zoom;
        if (data.scroll_limit_begin !== undefined) this.scroll_limit_begin.copy(data.scroll_limit_begin);
        if (data.scroll_limit_end !== undefined) this.scroll_limit_end.copy(data.scroll_limit_end);
        if (data.scroll_offset !== undefined) this.scroll_offset.copy(data.scroll_offset);

        return this;
    }

    _update_scroll() {
        if (!this.is_inside_tree) {
            return;
        }

        const ofs = this.offset.clone().multiply(this.scroll_base_scale).add(this.scroll_base_offset);
        const vps = this.get_viewport_size();

        ofs.negate();
        if (this.scroll_limit_begin.x < this.scroll_limit_end.x) {
            if (ofs.x < this.scroll_limit_begin.x) {
                ofs.x = this.scroll_limit_begin.x;
            } else if (ofs.x + vps.x > this.scroll_limit_end.x) {
                ofs.x = this.scroll_limit_end.x - vps.x;
            }
        }

        if (this.scroll_limit_begin.y < this.scroll_limit_end.y) {
            if (ofs.y < this.scroll_limit_begin.y) {
                ofs.y = this.scroll_limit_begin.y;
            } else if (ofs.y + vps.y > this.scroll_limit_end.y) {
                ofs.y = this.scroll_limit_end.y - vps.y;
            }
        }
        ofs.negate();

        this.final_offset.copy(ofs);

        for (const c of this.children) {
            if (c.type !== 'ParallaxLayer') {
                continue;
            }

            const l = /** @type {import('./parallax_layer').ParallaxLayer} */(c);

            if (this.scroll_ignore_camera_zoom) {
                l.set_base_offset_and_scale(ofs, 1.0, this.screen_offset);
            } else {
                l.set_base_offset_and_scale(ofs, this.scroll_scale, this.screen_offset);
            }
        }

        Vector2.free(ofs);
    }

    /**
     * @param {Matrix} p_transform
     * @param {Vector2} p_screen_offset
     */
    _camera_moved(p_transform, p_screen_offset) {
        p_screen_offset.copy(p_screen_offset);

        const vec = Vector2.new(0.5, 0.5);
        const scale = p_transform.get_scale();
        this.scroll_scale = scale.dot(vec);
        Vector2.free(scale);
        Vector2.free(vec);

        this.scroll_offset.set(p_transform.tx, p_transform.ty);
    }
}

node_class_map['ParallaxBackground'] = ParallaxBackground;
