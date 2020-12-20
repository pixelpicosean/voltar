import { node_class_map } from "engine/registry.js";
import { GDCLASS } from "engine/core/v_object.js";
import { Vector2, Vector2Like } from "engine/core/math/vector2.js";
import { Transform2D } from "engine/core/math/transform_2d.js";

import { CanvasLayer } from "../main/canvas_layer.js";
import { NOTIFICATION_ENTER_TREE, NOTIFICATION_EXIT_TREE } from "../main/node.js";


export class ParallaxBackground extends CanvasLayer {
    get class() { return 'ParallaxBackground' }

    get scroll_base_offset() { return this._scroll_base_offset }
    set scroll_base_offset(value) { this.set_scroll_base_offset(value) }

    get scroll_base_scale() { return this._scroll_base_scale }
    set scroll_base_scale(value) { this.set_scroll_base_scale(value) }

    get scroll_limit_begin() { return this._scroll_limit_begin }
    set scroll_limit_begin(value) { this.set_scroll_limit_begin(value) }

    get scroll_limit_end() { return this._scroll_limit_end }
    set scroll_limit_end(value) { this.set_scroll_limit_end(value) }

    get scroll_offset() { return this._scroll_offset }
    set scroll_offset(value) { this.set_scroll_offset(value) }

    constructor() {
        super();

        this.scroll_ignore_camera_zoom = false;
        this._scroll_base_offset = new Vector2();
        this._scroll_base_scale = new Vector2(1, 1);
        this._scroll_limit_begin = new Vector2();
        this._scroll_limit_end = new Vector2();
        this._scroll_offset = new Vector2();

        this.scroll_scale = 1.0;
        this.screen_offset = new Vector2();
        this.final_offset = new Vector2();

        this.group_name = '';

        this.set_layer(-100);
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.scroll_base_offset !== undefined) {
            this.set_scroll_base_offset(data.scroll_base_offset);
        }
        if (data.scroll_base_scale !== undefined) {
            this.set_scroll_base_scale(data.scroll_base_scale);
        }
        if (data.scroll_ignore_camera_zoom !== undefined) {
            this.scroll_ignore_camera_zoom = data.scroll_ignore_camera_zoom;
        }
        if (data.scroll_limit_begin !== undefined) {
            this.set_scroll_limit_begin(data.scroll_limit_begin);
        }
        if (data.scroll_limit_end !== undefined) {
            this.set_scroll_limit_end(data.scroll_limit_end);
        }
        if (data.scroll_offset !== undefined) {
            this.set_scroll_offset(data.scroll_offset);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.group_name = `__cameras_${this.get_viewport().get_id()}`;
                this.add_to_group(this.group_name);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.remove_from_group(this.group_name);
            } break;
        }
    }

    /* public */

    /**
     * @param {Vector2Like} p_offset
     */
    set_scroll_offset(p_offset) {
        this.set_scroll_offset_n(p_offset.x, p_offset.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scroll_offset_n(x, y) {
        this._scroll_offset.set(x, y);
        this._update_scroll();
    }

    /**
     * @param {Vector2Like} p_base_offset
     */
    set_scroll_base_offset(p_base_offset) {
        this.set_scroll_base_offset_n(p_base_offset.x, p_base_offset.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scroll_base_offset_n(x, y) {
        this._scroll_base_offset.set(x, y);
        this._update_scroll();
    }

    /**
     * @param {Vector2Like} p_base_scale
     */
    set_scroll_base_scale(p_base_scale) {
        this.set_scroll_base_scale_n(p_base_scale.x, p_base_scale.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scroll_base_scale_n(x, y) {
        this._scroll_base_scale.set(x, y);
    }

    /**
     * @param {Vector2Like} p_limit_begin
     */
    set_scroll_limit_begin(p_limit_begin) {
        this.set_scroll_limit_begin_n(p_limit_begin.x, p_limit_begin.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scroll_limit_begin_n(x, y) {
        this._scroll_limit_begin.set(x, y);
        this._update_scroll();
    }

    /**
     * @param {Vector2Like} p_limit_end
     */
    set_scroll_limit_end(p_limit_end) {
        this.set_scroll_limit_end_n(p_limit_end.x, p_limit_end.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scroll_limit_end_n(x, y) {
        this._scroll_limit_end.set(x, y);
        this._update_scroll();
    }

    /* private */

    _update_scroll() {
        if (!this.is_inside_tree()) {
            return;
        }

        const ofs = this._scroll_offset.clone().multiply(this._scroll_base_scale).add(this._scroll_base_offset);
        const vps = this.get_viewport_size();

        ofs.negate();
        if (this._scroll_limit_begin.x < this._scroll_limit_end.x) {
            if (ofs.x < this._scroll_limit_begin.x) {
                ofs.x = this._scroll_limit_begin.x;
            } else if (ofs.x + vps.x > this._scroll_limit_end.x) {
                ofs.x = this._scroll_limit_end.x - vps.x;
            }
        }

        if (this._scroll_limit_begin.y < this._scroll_limit_end.y) {
            if (ofs.y < this._scroll_limit_begin.y) {
                ofs.y = this._scroll_limit_begin.y;
            } else if (ofs.y + vps.y > this._scroll_limit_end.y) {
                ofs.y = this._scroll_limit_end.y - vps.y;
            }
        }
        ofs.negate();

        this.final_offset.copy(ofs);

        for (let c of this.data.children) {
            if (c.class !== 'ParallaxLayer') {
                continue;
            }

            const l = /** @type {import('./parallax_layer').ParallaxLayer} */(c);

            if (this.scroll_ignore_camera_zoom) {
                l.set_base_offset_and_scale(ofs, 1.0, this.screen_offset);
            } else {
                l.set_base_offset_and_scale(ofs, this.scroll_scale, this.screen_offset);
            }
        }

        Vector2.free(vps);
        Vector2.free(ofs);
    }

    /**
     * @param {Transform2D} p_transform
     * @param {Vector2} p_screen_offset
     */
    _camera_moved(p_transform, p_screen_offset) {
        this.screen_offset.copy(p_screen_offset);

        const vec = Vector2.new(0.5, 0.5);
        const scale = Vector2.new();
        p_transform.get_scale(scale);
        this.scroll_scale = scale.dot(vec);
        Vector2.free(scale);
        Vector2.free(vec);

        this.set_scroll_offset_n(p_transform.tx, p_transform.ty);
    }
}
node_class_map['ParallaxBackground'] = GDCLASS(ParallaxBackground, CanvasLayer);
