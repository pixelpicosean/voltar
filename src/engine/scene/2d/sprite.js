import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';

import { Color } from 'engine/core/color';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import { NOTIFICATION_DRAW } from '../2d/canvas_item';
import { Node2D } from '../2d/node_2d';
import { Rect2 } from 'engine/core/math/rect2';
import { Vector2 } from 'engine/core/math/vector2';
import { ImageTexture } from '../resources/texture';

const rect = new Rect2();
const white = new Color(1, 1, 1);

export class Sprite extends Node2D {
    get class() { return 'Sprite' }
    constructor() {
        super();

        this.centered = true;
        this.offset = new Vector2(0, 0);
        this.hflip = false;
        this.vflip = false;

        /**
         * The texture that the sprite is using
         * @type {ImageTexture}
         */
        this.texture = null;
    }

    /**
     * @param {ImageTexture} p_texture
     */
    set_texture(p_texture) {
        if (this.texture === p_texture) return;
        this.texture = p_texture;
        this.update();
        this.item_rect_changed();
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_DRAW: {
                if (!this.texture) {
                    break;
                }

                rect.width = this.texture.width;
                rect.height = this.texture.height;
                rect.x = this.offset.x;
                rect.y = this.offset.y;
                if (this.centered) {
                    rect.x -= rect.width * 0.5;
                    rect.y -= rect.height * 0.5;
                }

                // TODO: base on "use_pixel_snap" setting
                rect.x = Math.floor(rect.x);
                rect.y = Math.floor(rect.y);

                VSG.canvas.canvas_item_add_texture_rect(this.canvas_item, rect, this.texture, false, white, false, null);
            } break;
        }
    }
}

node_class_map['Sprite'] = GDCLASS(Sprite, Node2D)
