import { Matrix } from '../math/index';
import Texture from './texture';

const temp_mat = new Matrix();

/**
 * class controls uv transform and frame clamp for texture
 */
export default class TextureMatrix {
    /**
     *
     * @param {Texture} texture observed texture
     * @param {number} [clamp_margin] Changes frame clamping, 0.5 by default. Use -0.5 for extra border.
     */
    constructor(texture, clamp_margin = 0.5) {
        this._texture = texture;

        this.map_coord = new Matrix();

        this.u_clamp_frame = new Float32Array(4);

        this.u_clamp_offset = new Float32Array(2);

        this._last_texture_id = -1;

        /**
         * Changes frame clamping
         * Works with TilingSprite and Mesh
         * Change to 1.5 if you texture has repeated right and bottom lines, that leads to smoother borders
         *
         * @default 0
         */
        this.clamp_offset = 0;

        /**
         * Changes frame clamping
         * Works with TilingSprite and Mesh
         * Change to -0.5 to add a pixel to the edge, recommended for transparent trimmed textures in atlas
         *
         * @default 0.5
         */
        this.clamp_margin = clamp_margin;
    }

    /**
     * texture property
     * @type {Texture}
     */
    get texture() {
        return this._texture;
    }
    set texture(value) {
        this._texture = value;
        this._last_texture_id = -1;
    }

    /**
     * Multiplies uvs array to transform
     * @param {Float32Array} uvs mesh uvs
     * @param {Float32Array} [out] output
     */
    multiply_uvs(uvs, out) {
        if (out === undefined) {
            out = uvs;
        }

        const mat = this.map_coord;

        for (let i = 0; i < uvs.length; i += 2) {
            const x = uvs[i];
            const y = uvs[i + 1];

            out[i] = (x * mat.a) + (y * mat.c) + mat.tx;
            out[i + 1] = (x * mat.b) + (y * mat.d) + mat.ty;
        }

        return out;
    }

    /**
     * updates matrices if texture was changed
     * @param {boolean} [force_update] if true, matrices will be updated any case
     */
    update(force_update = false) {
        const tex = this._texture;

        if (!tex || !tex.valid) {
            return false;
        }

        if (!force_update && this._last_texture_id === tex._update_id) {
            return false;
        }

        this._last_texture_id = tex._update_id;

        const uvs = tex._uvs;

        this.map_coord.set(uvs.x1 - uvs.x0, uvs.y1 - uvs.y0, uvs.x3 - uvs.x0, uvs.y3 - uvs.y0, uvs.x0, uvs.y0);

        const orig = tex.orig;
        const trim = tex.trim;

        if (trim) {
            temp_mat.set(orig.width / trim.width, 0, 0, orig.height / trim.height,
                -trim.x / trim.width, -trim.y / trim.height);
            this.map_coord.append(temp_mat);
        }

        const tex_base = tex.base_texture;
        const frame = this.u_clamp_frame;
        const margin = this.clamp_margin / tex_base.resolution;
        const offset = this.clamp_offset;

        frame[0] = (tex._frame.x + margin + offset) / tex_base.width;
        frame[1] = (tex._frame.y + margin + offset) / tex_base.height;
        frame[2] = (tex._frame.x + tex._frame.width - margin + offset) / tex_base.width;
        frame[3] = (tex._frame.y + tex._frame.height - margin + offset) / tex_base.height;
        this.u_clamp_offset[0] = offset / tex_base.real_width;
        this.u_clamp_offset[1] = offset / tex_base.real_height;

        return true;
    }
}
