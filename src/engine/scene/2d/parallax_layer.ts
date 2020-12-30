import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";

import { VSG } from "engine/servers/visual/visual_server_globals";
import { NOTIFICATION_ENTER_TREE, NOTIFICATION_EXIT_TREE } from "../main/node";
import { Node2D } from "./node_2d";
import { ParallaxBackground } from "./parallax_background";


export class ParallaxLayer extends Node2D {
    get class() { return 'ParallaxLayer' }

    motion_mirroring = new Vector2;
    motion_offset = new Vector2;
    motion_scale = new Vector2(1, 1);

    orig_offset = new Vector2;
    orig_scale = new Vector2;
    screen_offset = new Vector2;

    mirror_scale = new Vector2;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.motion_mirroring !== undefined) {
            this.set_motion_mirroring(data.motion_mirroring);
        }
        if (data.motion_offset !== undefined) {
            this.set_motion_offset(data.motion_offset);
        }
        if (data.motion_scale !== undefined) {
            this.set_motion_scale(data.motion_scale);
        }

        return this;
    }

    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.orig_offset.copy(this.position);
                this.orig_scale.copy(this.scale);
                this._update_mirroring();
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.set_position(this.orig_offset);
                this.set_scale(this.orig_scale);
            } break;
        }
    }

    /* public */

    /**
     * @param {Vector2Like} p_mirroring
     */
    set_motion_mirroring(p_mirroring: Vector2Like) {
        this.set_motion_mirroring_n(p_mirroring.x, p_mirroring.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_motion_mirroring_n(x: number, y: number) {
        this.motion_mirroring.set(x, y);
        if (this.motion_mirroring.x < 0) {
            this.motion_mirroring.x = 0;
        }
        if (this.motion_mirroring.y < 0) {
            this.motion_mirroring.y = 0;
        }
        this._update_mirroring();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_motion_offset(p_offset: Vector2Like) {
        this.set_motion_offset_n(p_offset.x, p_offset.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_motion_offset_n(x: number, y: number) {
        this.motion_offset.set(x, y);
        const pb = this.get_parent() as unknown as ParallaxBackground;
        if (pb instanceof ParallaxBackground && this.is_inside_tree()) {
            this.set_base_offset_and_scale(pb.final_offset, pb.scroll_scale, this.screen_offset);
        }
    }

    /**
     * @param {Vector2Like} p_scale
     */
    set_motion_scale(p_scale: Vector2Like) {
        this.set_motion_scale_n(p_scale.x, p_scale.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_motion_scale_n(x: number, y: number) {
        this.motion_scale.set(x, y);
        const pb = this.get_parent() as unknown as ParallaxBackground;
        if (pb instanceof ParallaxBackground && this.is_inside_tree()) {
            this.set_base_offset_and_scale(pb.final_offset, pb.scroll_scale, this.screen_offset);
        }
    }

    /* private */

    /**
     * @param {Vector2} p_offset
     * @param {number} p_scale
     * @param {Vector2} p_screen_offset
     */
    set_base_offset_and_scale(p_offset: Vector2, p_scale: number, p_screen_offset: Vector2) {
        this.screen_offset.copy(p_screen_offset);

        if (!this.is_inside_tree()) {
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

        this.set_position(new_ofs);
        const scale = this.orig_scale.clone().scale(p_scale)
        this.set_scale(scale);
        Vector2.free(scale);

        this._update_mirroring();
    }

    _update_mirroring() {
        if (!this.is_inside_tree()) {
            return;
        }

        const pb = this.get_parent() as unknown as ParallaxBackground;
        if (pb instanceof ParallaxBackground) {
            const c = pb.canvas;
            const mirror_scale = this.scale.clone().multiply(this.motion_mirroring);
            VSG.canvas.canvas_set_item_mirroring(c, this.canvas_item, mirror_scale);
            Vector2.free(mirror_scale);
        }
    }
}
node_class_map['ParallaxLayer'] = GDCLASS(ParallaxLayer, Node2D);
