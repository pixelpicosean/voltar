import settings from 'engine/settings';
import { premultiply_blend_mode, premultiply_tint } from 'engine/utils/index';
import { nearest_po2, log_base_2 } from 'engine/core/math/math_funcs';
import create_indices_for_quads from 'engine/utils/create_indices_for_quads';

import VertexArrayObject from 'engine/drivers/webgl/vao';
import GLShader from 'engine/drivers/webgl/gl_shader';
import GLBuffer from 'engine/drivers/webgl/gl_buffer';

import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import ObjectRenderer from 'engine/servers/visual/utils/object_renderer';
import check_max_if_statments_in_shader from 'engine/servers/visual/utils/check_max_if_statments_in_shader';
import BaseTexture from 'engine/scene/resources/textures/base_texture';

import generate_multi_texture_shader from './generate_multi_texture_shader';
import Buffer from './batch_buffer';


let tick = 0;
let texture_tick = 0;

/**
 * @typedef Group
 * @property {BaseTexture[]} textures
 * @property {number} texture_count
 * @property {number[]} ids
 * @property {number} size
 * @property {number} start
 * @property {number} blend
 */

/**
 * Renderer dedicated to drawing and batching sprites.
 */
export default class SpriteRenderer extends ObjectRenderer {
    /**
     * @param {WebGLRenderer} renderer - The renderer this sprite batch works for.
     */
    constructor(renderer) {
        super(renderer);

        /**
         * Number of values sent in the vertex buffer.
         * a_vertex_position(2), a_texture_coord(1), a_color(1), a_texture_id(1) = 5
         */
        this.vert_size = 6;

        /**
         * The size of the vertex information in bytes.
         */
        this.vert_byte_size = this.vert_size * 4;

        /**
         * The number of images in the SpriteRenderer before it flushes.
         */
        this.size = settings.SPRITE_BATCH_SIZE; // 2000 is a nice balance between mobile / desktop

        // the total number of bytes in our batch
        // let num_verts = this.size * 4 * this.vert_byte_size;

        /** @type {Buffer[]} */
        this.buffers = [];
        for (let i = 1; i <= nearest_po2(this.size); i *= 2) {
            this.buffers.push(new Buffer(i * 4 * this.vert_byte_size));
        }

        /**
         * Holds the indices of the geometry (quads) to draw
         */
        this.indices = create_indices_for_quads(this.size);

        /**
         * The default shaders that is used if a sprite doesn't have a more specific one.
         * there is a shader for each number of textures that can be rendererd.
         * These shaders will also be generated on the fly as required.
         * @type {GLShader}
         */
        this.shader = null;

        this.current_index = 0;

        /** @type {Group[]} */
        this.groups = [];

        for (let k = 0; k < this.size; k++) {
            this.groups[k] = { textures: [], texture_count: 0, ids: [], size: 0, start: 0, blend: 0 };
        }

        /** @type {import('../sprite').default[]} */
        this.sprites = [];

        /** @type {BaseTexture[]} */
        this.bound_textures = null;

        /** @type {GLBuffer[]} */
        this.vertex_buffers = [];

        /** @type {VertexArrayObject[]} */
        this.vaos = [];

        this.vao_max = 2;
        this.vertex_count = 0;

        this.renderer.connect('prerender', this.on_prerender, this);
    }

    /**
     * Sets up the renderer context and necessary buffers.
     */
    on_context_change() {
        const gl = this.renderer.gl;

        if (this.renderer.legacy) {
            this.MAX_TEXTURES = 1;
        } else {
            // step 1: first check max textures the GPU can handle.
            this.MAX_TEXTURES = Math.min(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), settings.SPRITE_MAX_TEXTURES);

            // step 2: check the maximum number of if statements the shader can have too..
            this.MAX_TEXTURES = check_max_if_statments_in_shader(this.MAX_TEXTURES, gl);
        }

        this.shader = generate_multi_texture_shader(gl, this.MAX_TEXTURES);

        // create a couple of buffers
        this.index_buffer = GLBuffer.create_index_buffer(gl, this.indices, gl.STATIC_DRAW);

        // we use the second shader as the first one depending on your browser may omit a_texture_id
        // as it is not used by the shader so is optimized out.

        this.renderer.bind_vao(null);

        const attrs = this.shader.attributes;

        for (let i = 0; i < this.vao_max; i++) {
            const vertex_buffer = this.vertex_buffers[i] = GLBuffer.create_vertex_buffer(gl, null, gl.STREAM_DRAW);

            // build the vao object that will render..
            const vao = this.renderer.create_vao()
                .add_index(this.index_buffer)
                .add_attribute(vertex_buffer, attrs.a_vertex_position, gl.FLOAT, false, this.vert_byte_size, 0)
                .add_attribute(vertex_buffer, attrs.a_texture_coord, gl.UNSIGNED_SHORT, true, this.vert_byte_size, 2 * 4)
                .add_attribute(vertex_buffer, attrs.a_color, gl.UNSIGNED_BYTE, true, this.vert_byte_size, 3 * 4)
                .add_attribute(vertex_buffer, attrs.a_color_mode, gl.FLOAT, false, this.vert_byte_size, 4 * 4)

            if (attrs.a_texture_id) {
                vao.add_attribute(vertex_buffer, attrs.a_texture_id, gl.FLOAT, false, this.vert_byte_size, 5 * 4);
            }

            this.vaos[i] = vao;
        }

        this.vao = this.vaos[0];
        this.current_blend_mode = 99999;

        this.bound_textures = new Array(this.MAX_TEXTURES);
    }

    /**
     * Called before the renderer starts rendering.
     *
     */
    on_prerender() {
        this.vertex_count = 0;
    }

    /**
     * Renders the sprite object.
     *
     * @param {import('engine/index').Sprite} sprite - the sprite to render when using this spritebatch
     */
    render(sprite) {
        // TODO set blend modes..
        // check texture..
        if (this.current_index >= this.size) {
            this.flush();
        }

        // get the uvs for the texture

        // if the uvs have not updated then no point rendering just yet!
        if (!sprite._texture._uvs) {
            return;
        }

        // push a texture.
        // increment the batchsize
        this.sprites[this.current_index++] = sprite;
    }

    /**
     * Renders the content and empties the current batch.
     *
     */
    flush() {
        if (this.current_index === 0) {
            return;
        }

        const gl = this.renderer.gl;
        const MAX_TEXTURES = this.MAX_TEXTURES;

        const np2 = nearest_po2(this.current_index);
        const log2 = log_base_2(np2);
        const buffer = this.buffers[log2];

        const sprites = this.sprites;
        const groups = this.groups;

        const float32_view = buffer.float32View;
        const uint32_view = buffer.uint32View;

        const bound_textures = this.bound_textures;
        const renderer_bound_textures = this.renderer.bound_textures;
        const touch = this.renderer.texture_gc.count;

        let index = 0;
        /** @type {BaseTexture} */
        let next_texture = null;
        /** @type {BaseTexture} */
        let current_texture = null;
        let group_count = 1;
        let texture_count = 0;
        let current_group = groups[0];
        /** @type {Float32Array} */
        let vertex_data = null;
        /** @type {Uint32Array} */
        let uvs = null;
        let blend_mode = premultiply_blend_mode[sprites[0]._texture.base_texture.premultiplied_alpha ? 1 : 0][sprites[0].blend_mode];

        current_group.texture_count = 0;
        current_group.start = 0;
        current_group.blend = blend_mode;

        tick++;

        let i = 0;

        // copy textures..
        for (i = 0; i < MAX_TEXTURES; ++i) {
            const bound_texture = renderer_bound_textures[i];

            if (bound_texture._enabled === tick) {
                bound_textures[i] = this.renderer.empty_textures[i];
                continue;
            }

            bound_textures[i] = bound_texture;
            bound_texture._virtal_bound_id = i;
            bound_texture._enabled = tick;
        }
        tick++;

        for (i = 0; i < this.current_index; ++i) {
            // upload the sprite elemetns...
            // they have all ready been calculated so we just need to push them into the buffer.
            const sprite = sprites[i];

            sprites[i] = null;

            next_texture = sprite._texture.base_texture;

            const sprite_blend_mode = premultiply_blend_mode[Number(next_texture.premultiplied_alpha)][sprite.blend_mode];

            if (blend_mode !== sprite_blend_mode) {
                // finish a group..
                blend_mode = sprite_blend_mode;

                // force the batch to break!
                current_texture = null;
                texture_count = MAX_TEXTURES;
                tick++;
            }

            if (current_texture !== next_texture) {
                current_texture = next_texture;

                if (next_texture._enabled !== tick) {
                    if (texture_count === MAX_TEXTURES) {
                        tick++;

                        current_group.size = i - current_group.start;

                        texture_count = 0;

                        current_group = groups[group_count++];
                        current_group.blend = blend_mode;
                        current_group.texture_count = 0;
                        current_group.start = i;
                    }

                    next_texture.touched = touch;

                    if (next_texture._virtal_bound_id === -1) {
                        for (let j = 0; j < MAX_TEXTURES; ++j) {
                            const tex_index = (j + texture_tick) % MAX_TEXTURES;

                            const tex = bound_textures[tex_index];

                            if (tex._enabled !== tick) {
                                texture_tick++;

                                tex._virtal_bound_id = -1;

                                next_texture._virtal_bound_id = tex_index;

                                bound_textures[tex_index] = next_texture;
                                break;
                            }
                        }
                    }

                    next_texture._enabled = tick;

                    current_group.texture_count++;
                    current_group.ids[texture_count] = next_texture._virtal_bound_id;
                    current_group.textures[texture_count++] = next_texture;
                }
            }

            vertex_data = sprite.vertex_data;

            // TODO: this sum does not need to be set each frame...
            uvs = sprite._texture._uvs.uvs_uint32;

            if (this.renderer.pixel_snap) {
                const resolution = this.renderer.resolution;

                // [write] vertex_position
                float32_view[index +  0] = ((vertex_data[0] * resolution) | 0) / resolution;
                float32_view[index +  1] = ((vertex_data[1] * resolution) | 0) / resolution;

                // [write] vertex_position
                float32_view[index +  6] = ((vertex_data[2] * resolution) | 0) / resolution;
                float32_view[index +  7] = ((vertex_data[3] * resolution) | 0) / resolution;

                // [write] vertex_position
                float32_view[index + 12] = ((vertex_data[4] * resolution) | 0) / resolution;
                float32_view[index + 13] = ((vertex_data[5] * resolution) | 0) / resolution;

                // [write] vertex_position
                float32_view[index + 18] = ((vertex_data[6] * resolution) | 0) / resolution;
                float32_view[index + 19] = ((vertex_data[7] * resolution) | 0) / resolution;
            } else {
                // [write] vertex_position
                float32_view[index +  0] = vertex_data[0];
                float32_view[index +  1] = vertex_data[1];

                // [write] vertex_position
                float32_view[index +  6] = vertex_data[2];
                float32_view[index +  7] = vertex_data[3];

                // [write] vertex_position
                float32_view[index + 12] = vertex_data[4];
                float32_view[index + 13] = vertex_data[5];

                // [write] vertex_position
                float32_view[index + 18] = vertex_data[6];
                float32_view[index + 19] = vertex_data[7];
            }

            // [write] texture_coord
            uint32_view[index +  2] = uvs[0];
            uint32_view[index +  8] = uvs[1];
            uint32_view[index + 14] = uvs[2];
            uint32_view[index + 20] = uvs[3];

            // we dont call extra function if alpha is 1.0, that's faster
            const alpha = Math.min(sprite.world_alpha, 1.0);
            const argb = alpha < 1.0 && next_texture.premultiplied_alpha ?
                premultiply_tint(sprite._tint_rgb, alpha) :
                sprite._tint_rgb + (alpha * 255 << 24);

            // [write] color
            uint32_view[index + 3] = uint32_view[index + 9] = uint32_view[index + 15] = uint32_view[index + 21] = argb;
            // [write] color_mode
            float32_view[index + 4] = float32_view[index + 10] = float32_view[index + 16] = float32_view[index + 22] = sprite.color_mode;
            // [write] texture_id
            float32_view[index + 5] = float32_view[index + 11] = float32_view[index + 17] = float32_view[index + 23] = next_texture._virtal_bound_id;

            index += this.vert_byte_size;
        }

        current_group.size = i - current_group.start;

        if (!settings.CAN_UPLOAD_SAME_BUFFER) {
            // iOS does not like uploading to the same buffer in a single frame.
            if (this.vao_max <= this.vertex_count) {
                this.vao_max++;

                const attrs = this.shader.attributes;

                const vertexBuffer = this.vertex_buffers[this.vertex_count] = GLBuffer.create_vertex_buffer(gl, null, gl.STREAM_DRAW);

                // Build the vao object that will render
                const vao = this.renderer.create_vao()
                    .add_index(this.index_buffer)
                    .add_attribute(vertexBuffer, attrs.a_vertex_position, gl.FLOAT, false, this.vert_byte_size, 0)
                    .add_attribute(vertexBuffer, attrs.a_texture_coord, gl.UNSIGNED_SHORT, true, this.vert_byte_size, 2 * 4)
                    .add_attribute(vertexBuffer, attrs.a_color, gl.UNSIGNED_BYTE, true, this.vert_byte_size, 3 * 4)
                    .add_attribute(vertexBuffer, attrs.a_color_mode, gl.FLOAT, false, this.vert_byte_size, 4 * 4)

                if (attrs.a_texture_id) {
                    vao.add_attribute(vertexBuffer, attrs.a_texture_id, gl.FLOAT, false, this.vert_byte_size, 5 * 4);
                }

                this.vaos[this.vertex_count] = vao;
            }

            this.renderer.bind_vao(this.vaos[this.vertex_count]);

            this.vertex_buffers[this.vertex_count].upload(buffer.vertices, 0, false);

            this.vertex_count++;
        } else {
            // Lets use the faster option, always use buffer number 0
            this.vertex_buffers[this.vertex_count].upload(buffer.vertices, 0, true);
        }

        for (i = 0; i < MAX_TEXTURES; ++i) {
            renderer_bound_textures[i]._virtal_bound_id = -1;
        }

        // Render the groups
        for (i = 0; i < group_count; ++i) {
            const group = groups[i];
            const groupTextureCount = group.texture_count;

            for (let j = 0; j < groupTextureCount; j++) {
                current_texture = group.textures[j];

                // Reset virtual ids
                // Lets do a quick check
                if (renderer_bound_textures[group.ids[j]] !== current_texture) {
                    this.renderer.bind_texture(current_texture, group.ids[j], true);
                }

                // Reset the virtual_id
                current_texture._virtal_bound_id = -1;
            }

            // Set the blend mode
            this.renderer.state.set_blend_mode(group.blend);

            gl.drawElements(gl.TRIANGLES, group.size * 6, gl.UNSIGNED_SHORT, group.start * 6 * 2);
        }

        // Reset elements for the next flush
        this.current_index = 0;
    }

    /**
     * Starts a new sprite batch.
     */
    start() {
        this.renderer.bind_shader(this.shader);

        if (settings.CAN_UPLOAD_SAME_BUFFER) {
            // bind buffer #0, we don't need others
            this.renderer.bind_vao(this.vaos[this.vertex_count]);

            this.vertex_buffers[this.vertex_count].bind();
        }
    }

    /**
     * Stops and flushes the current batch.
     */
    stop() {
        this.flush();
    }

    /**
     * Destroys the SpriteRenderer.
     */
    destroy() {
        for (let i = 0; i < this.vao_max; i++) {
            if (this.vertex_buffers[i]) {
                this.vertex_buffers[i].destroy();
            }
            if (this.vaos[i]) {
                this.vaos[i].destroy();
            }
        }

        if (this.index_buffer) {
            this.index_buffer.destroy();
        }

        this.renderer.disconnect('prerender', this.on_prerender, this);

        super.destroy();

        if (this.shader) {
            this.shader.destroy();
            this.shader = null;
        }

        this.vertex_buffers = null;
        this.vaos = null;
        this.index_buffer = null;
        this.indices = null;

        this.sprites = null;

        for (let i = 0; i < this.buffers.length; ++i) {
            this.buffers[i].destroy();
        }
    }
}
