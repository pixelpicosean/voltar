import ObjectRenderer from 'engine/renderers/utils/ObjectRenderer';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import create_indices_for_quads from 'engine/utils/create_indices_for_quads';
import generateMultiTextureShader from './generateMultiTextureShader';
import check_max_if_statments_in_shader from 'engine/renderers/utils/check_max_if_statments_in_shader';
import Buffer from './BatchBuffer';
import settings from 'engine/settings';
import { premultiply_blend_mode, premultiply_tint } from 'engine/utils/index';
import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import { nearest_po2, log_base_2 } from 'engine/math/index';

let TICK = 0;
let TEXTURE_TICK = 0;

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
         * aVertexPosition(2), aTextureCoord(1), aColor(1), aTextureId(1) = 5
         *
         * @member {number}
         */
        this.vertSize = 5;

        /**
         * The size of the vertex information in bytes.
         *
         * @member {number}
         */
        this.vertByteSize = this.vertSize * 4;

        /**
         * The number of images in the SpriteRenderer before it flushes.
         *
         * @member {number}
         */
        this.size = settings.SPRITE_BATCH_SIZE; // 2000 is a nice balance between mobile / desktop

        // the total number of bytes in our batch
        // let numVerts = this.size * 4 * this.vertByteSize;

        this.buffers = [];
        for (let i = 1; i <= nearest_po2(this.size); i *= 2) {
            this.buffers.push(new Buffer(i * 4 * this.vertByteSize));
        }

        /**
         * Holds the indices of the geometry (quads) to draw
         *
         * @member {Uint16Array}
         */
        this.indices = create_indices_for_quads(this.size);

        /**
         * The default shaders that is used if a sprite doesn't have a more specific one.
         * there is a shader for each number of textures that can be rendererd.
         * These shaders will also be generated on the fly as required.
         * @member {Shader[]}
         */
        this.shader = null;

        this.currentIndex = 0;
        this.groups = [];

        for (let k = 0; k < this.size; k++) {
            this.groups[k] = { textures: [], textureCount: 0, ids: [], size: 0, start: 0, blend: 0 };
        }

        this.sprites = [];

        this.vertexBuffers = [];
        this.vaos = [];

        this.vaoMax = 2;
        this.vertexCount = 0;

        this.renderer.connect('prerender', this.onPrerender, this);
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    on_context_change() {
        const gl = this.renderer.gl;

        if (this.renderer.legacy) {
            this.MAX_TEXTURES = 1;
        }
        else {
            // step 1: first check max textures the GPU can handle.
            this.MAX_TEXTURES = Math.min(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), settings.SPRITE_MAX_TEXTURES);

            // step 2: check the maximum number of if statements the shader can have too..
            this.MAX_TEXTURES = check_max_if_statments_in_shader(this.MAX_TEXTURES, gl);
        }

        this.shader = generateMultiTextureShader(gl, this.MAX_TEXTURES);

        // create a couple of buffers
        this.index_buffer = GLBuffer.create_index_buffer(gl, this.indices, gl.STATIC_DRAW);

        // we use the second shader as the first one depending on your browser may omit aTextureId
        // as it is not used by the shader so is optimized out.

        this.renderer.bind_vao(null);

        const attrs = this.shader.attributes;

        for (let i = 0; i < this.vaoMax; i++) {
            /* eslint-disable max-len */
            const vertexBuffer = this.vertexBuffers[i] = GLBuffer.create_vertex_buffer(gl, null, gl.STREAM_DRAW);
            /* eslint-enable max-len */

            // build the vao object that will render..
            const vao = this.renderer.createVao()
                .addIndex(this.index_buffer)
                .addAttribute(vertexBuffer, attrs.aVertexPosition, gl.FLOAT, false, this.vertByteSize, 0)
                .addAttribute(vertexBuffer, attrs.aTextureCoord, gl.UNSIGNED_SHORT, true, this.vertByteSize, 2 * 4)
                .addAttribute(vertexBuffer, attrs.aColor, gl.UNSIGNED_BYTE, true, this.vertByteSize, 3 * 4);

            if (attrs.aTextureId) {
                vao.addAttribute(vertexBuffer, attrs.aTextureId, gl.FLOAT, false, this.vertByteSize, 4 * 4);
            }

            this.vaos[i] = vao;
        }

        this.vao = this.vaos[0];
        this.currentBlendMode = 99999;

        this.bound_textures = new Array(this.MAX_TEXTURES);
    }

    /**
     * Called before the renderer starts rendering.
     *
     */
    onPrerender() {
        this.vertexCount = 0;
    }

    /**
     * Renders the sprite object.
     *
     * @param {import('engine/index').Sprite} sprite - the sprite to render when using this spritebatch
     */
    render(sprite) {
        // TODO set blend modes..
        // check texture..
        if (this.currentIndex >= this.size) {
            this.flush();
        }

        // get the uvs for the texture

        // if the uvs have not updated then no point rendering just yet!
        if (!sprite._texture._uvs) {
            return;
        }

        // push a texture.
        // increment the batchsize
        this.sprites[this.currentIndex++] = sprite;
    }

    /**
     * Renders the content and empties the current batch.
     *
     */
    flush() {
        if (this.currentIndex === 0) {
            return;
        }

        const gl = this.renderer.gl;
        const MAX_TEXTURES = this.MAX_TEXTURES;

        const np2 = nearest_po2(this.currentIndex);
        const log2 = log_base_2(np2);
        const buffer = this.buffers[log2];

        const sprites = this.sprites;
        const groups = this.groups;

        const float32View = buffer.float32View;
        const uint32View = buffer.uint32View;

        const bound_textures = this.bound_textures;
        const rendererBoundTextures = this.renderer.bound_textures;
        const touch = this.renderer.texture_gc.count;

        let index = 0;
        let nextTexture;
        let currentTexture;
        let groupCount = 1;
        let textureCount = 0;
        let currentGroup = groups[0];
        let vertex_data;
        let uvs;
        let blend_mode = premultiply_blend_mode[
            sprites[0]._texture.base_texture.premultiplied_alpha ? 1 : 0][sprites[0].blend_mode];

        currentGroup.textureCount = 0;
        currentGroup.start = 0;
        currentGroup.blend = blend_mode;

        TICK++;

        let i;

        // copy textures..
        for (i = 0; i < MAX_TEXTURES; ++i) {
            const bt = rendererBoundTextures[i];

            if (bt._enabled === TICK) {
                bound_textures[i] = this.renderer.empty_textures[i];
                continue;
            }

            bound_textures[i] = bt;
            bt._virtalBoundId = i;
            bt._enabled = TICK;
        }
        TICK++;

        for (i = 0; i < this.currentIndex; ++i) {
            // upload the sprite elemetns...
            // they have all ready been calculated so we just need to push them into the buffer.
            const sprite = sprites[i];

            sprites[i] = null;

            nextTexture = sprite._texture.base_texture;

            const spriteBlendMode = premultiply_blend_mode[Number(nextTexture.premultiplied_alpha)][sprite.blend_mode];

            if (blend_mode !== spriteBlendMode) {
                // finish a group..
                blend_mode = spriteBlendMode;

                // force the batch to break!
                currentTexture = null;
                textureCount = MAX_TEXTURES;
                TICK++;
            }

            if (currentTexture !== nextTexture) {
                currentTexture = nextTexture;

                if (nextTexture._enabled !== TICK) {
                    if (textureCount === MAX_TEXTURES) {
                        TICK++;

                        currentGroup.size = i - currentGroup.start;

                        textureCount = 0;

                        currentGroup = groups[groupCount++];
                        currentGroup.blend = blend_mode;
                        currentGroup.textureCount = 0;
                        currentGroup.start = i;
                    }

                    nextTexture.touched = touch;

                    if (nextTexture._virtalBoundId === -1) {
                        for (let j = 0; j < MAX_TEXTURES; ++j) {
                            const tIndex = (j + TEXTURE_TICK) % MAX_TEXTURES;

                            const t = bound_textures[tIndex];

                            if (t._enabled !== TICK) {
                                TEXTURE_TICK++;

                                t._virtalBoundId = -1;

                                nextTexture._virtalBoundId = tIndex;

                                bound_textures[tIndex] = nextTexture;
                                break;
                            }
                        }
                    }

                    nextTexture._enabled = TICK;

                    currentGroup.textureCount++;
                    currentGroup.ids[textureCount] = nextTexture._virtalBoundId;
                    currentGroup.textures[textureCount++] = nextTexture;
                }
            }

            vertex_data = sprite.vertex_data;

            // TODO this sum does not need to be set each frame..
            uvs = sprite._texture._uvs.uvs_uint32;

            if (this.renderer.pixel_snap) {
                const resolution = this.renderer.resolution;

                // xy
                float32View[index] = ((vertex_data[0] * resolution) | 0) / resolution;
                float32View[index + 1] = ((vertex_data[1] * resolution) | 0) / resolution;

                // xy
                float32View[index + 5] = ((vertex_data[2] * resolution) | 0) / resolution;
                float32View[index + 6] = ((vertex_data[3] * resolution) | 0) / resolution;

                // xy
                float32View[index + 10] = ((vertex_data[4] * resolution) | 0) / resolution;
                float32View[index + 11] = ((vertex_data[5] * resolution) | 0) / resolution;

                // xy
                float32View[index + 15] = ((vertex_data[6] * resolution) | 0) / resolution;
                float32View[index + 16] = ((vertex_data[7] * resolution) | 0) / resolution;
            }
            else {
                // xy
                float32View[index] = vertex_data[0];
                float32View[index + 1] = vertex_data[1];

                // xy
                float32View[index + 5] = vertex_data[2];
                float32View[index + 6] = vertex_data[3];

                // xy
                float32View[index + 10] = vertex_data[4];
                float32View[index + 11] = vertex_data[5];

                // xy
                float32View[index + 15] = vertex_data[6];
                float32View[index + 16] = vertex_data[7];
            }

            uint32View[index + 2] = uvs[0];
            uint32View[index + 7] = uvs[1];
            uint32View[index + 12] = uvs[2];
            uint32View[index + 17] = uvs[3];
            /* eslint-disable max-len */
            const alpha = Math.min(sprite.world_alpha, 1.0);
            // we dont call extra function if alpha is 1.0, that's faster
            const argb = alpha < 1.0 && nextTexture.premultiplied_alpha ? premultiply_tint(sprite._tint_rgb, alpha)
                : sprite._tint_rgb + (alpha * 255 << 24);

            uint32View[index + 3] = uint32View[index + 8] = uint32View[index + 13] = uint32View[index + 18] = argb;
            float32View[index + 4] = float32View[index + 9] = float32View[index + 14] = float32View[index + 19] = nextTexture._virtalBoundId;
            /* eslint-enable max-len */

            index += 20;
        }

        currentGroup.size = i - currentGroup.start;

        if (!settings.CAN_UPLOAD_SAME_BUFFER) {
            // this is still needed for IOS performance..
            // it really does not like uploading to the same buffer in a single frame!
            if (this.vaoMax <= this.vertexCount) {
                this.vaoMax++;

                const attrs = this.shader.attributes;

                const vertexBuffer = this.vertexBuffers[this.vertexCount] = GLBuffer.create_vertex_buffer(gl, null, gl.STREAM_DRAW);

                // build the vao object that will render..
                const vao = this.renderer.createVao()
                    .addIndex(this.index_buffer)
                    .addAttribute(vertexBuffer, attrs.aVertexPosition, gl.FLOAT, false, this.vertByteSize, 0)
                    .addAttribute(vertexBuffer, attrs.aTextureCoord, gl.UNSIGNED_SHORT, true, this.vertByteSize, 2 * 4)
                    .addAttribute(vertexBuffer, attrs.aColor, gl.UNSIGNED_BYTE, true, this.vertByteSize, 3 * 4);

                if (attrs.aTextureId) {
                    vao.addAttribute(vertexBuffer, attrs.aTextureId, gl.FLOAT, false, this.vertByteSize, 4 * 4);
                }

                this.vaos[this.vertexCount] = vao;
            }

            this.renderer.bind_vao(this.vaos[this.vertexCount]);

            this.vertexBuffers[this.vertexCount].upload(buffer.vertices, 0, false);

            this.vertexCount++;
        }
        else {
            // lets use the faster option, always use buffer number 0
            this.vertexBuffers[this.vertexCount].upload(buffer.vertices, 0, true);
        }

        for (i = 0; i < MAX_TEXTURES; ++i) {
            rendererBoundTextures[i]._virtalBoundId = -1;
        }

        // render the groups..
        for (i = 0; i < groupCount; ++i) {
            const group = groups[i];
            const groupTextureCount = group.textureCount;

            for (let j = 0; j < groupTextureCount; j++) {
                currentTexture = group.textures[j];

                // reset virtual ids..
                // lets do a quick check..
                if (rendererBoundTextures[group.ids[j]] !== currentTexture) {
                    this.renderer.bind_texture(currentTexture, group.ids[j], true);
                }

                // reset the virtualId..
                currentTexture._virtalBoundId = -1;
            }

            // set the blend mode..
            this.renderer.state.set_blend_mode(group.blend);

            gl.drawElements(gl.TRIANGLES, group.size * 6, gl.UNSIGNED_SHORT, group.start * 6 * 2);
        }

        // reset elements for the next flush
        this.currentIndex = 0;
    }

    /**
     * Starts a new sprite batch.
     */
    start() {
        this.renderer.bind_shader(this.shader);

        if (settings.CAN_UPLOAD_SAME_BUFFER) {
            // bind buffer #0, we don't need others
            this.renderer.bind_vao(this.vaos[this.vertexCount]);

            this.vertexBuffers[this.vertexCount].bind();
        }
    }

    /**
     * Stops and flushes the current batch.
     *
     */
    stop() {
        this.flush();
    }

    /**
     * Destroys the SpriteRenderer.
     *
     */
    destroy() {
        for (let i = 0; i < this.vaoMax; i++) {
            if (this.vertexBuffers[i]) {
                this.vertexBuffers[i].destroy();
            }
            if (this.vaos[i]) {
                this.vaos[i].destroy();
            }
        }

        if (this.index_buffer) {
            this.index_buffer.destroy();
        }

        this.renderer.disconnect('prerender', this.onPrerender, this);

        super.destroy();

        if (this.shader) {
            this.shader.destroy();
            this.shader = null;
        }

        this.vertexBuffers = null;
        this.vaos = null;
        this.index_buffer = null;
        this.indices = null;

        this.sprites = null;

        for (let i = 0; i < this.buffers.length; ++i) {
            this.buffers[i].destroy();
        }
    }
}
