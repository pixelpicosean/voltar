import ObjectRenderer from 'engine/renderers/utils/ObjectRenderer';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import {
    premultiply_tint,
    correct_blend_mode,
    premultiply_rgba,
} from 'engine/utils/index';
import { Matrix } from 'engine/math/index';
import ParticleShader from './ParticleShader';
import ParticleBuffer from './ParticleBuffer';
import ParticleNode2D from '../ParticleNode2D';
import Sprite from 'engine/scene/sprites/Sprite';

/**
 * @author Mat Groves
 *
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original version!
 * Also a thanks to https://github.com/bchevalier for tweaking the tint and alpha so that they now
 * share 4 bytes on the vertex buffer
 *
 * Heavily inspired by LibGDX's ParticleRenderer:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/ParticleRenderer.java
 */

export default class ParticleRenderer extends ObjectRenderer {
    /**
     * @param {WebGLRenderer} renderer - The renderer this sprite batch works for.
     */
    constructor(renderer) {
        super(renderer);

        // 65535 is max vertex index in the index buffer (see ParticleRenderer)
        // so max number of particles is 65536 / 4 = 16384
        // and max number of element in the index buffer is 16384 * 6 = 98304
        // Creating a full index buffer, overhead is 98304 * 2 = 196Ko
        // let numIndices = 98304;

        /**
         * The default shader that is used if a sprite doesn't have a more specific one.
         *
         * @member {Shader}
         */
        this.shader = null;

        this.index_buffer = null;

        this.properties = null;

        this.temp_matrix = new Matrix();

        this.CONTEXT_UID = 0;
    }

    /**
     * When there is a WebGL context change
     *
     * @private
     */
    on_context_change() {
        const gl = this.renderer.gl;

        this.CONTEXT_UID = this.renderer.CONTEXT_UID;

        // setup default shader
        this.shader = new ParticleShader(gl);

        this.properties = [
            // verticesData
            {
                attribute: this.shader.attributes.a_vertex_position,
                size: 2,
                uploadFunction: this.upload_vertices,
                offset: 0,
            },
            // positionData
            {
                attribute: this.shader.attributes.a_position_coord,
                size: 2,
                uploadFunction: this.upload_position,
                offset: 0,
            },
            // rotationData
            {
                attribute: this.shader.attributes.a_rotation,
                size: 1,
                uploadFunction: this.upload_rotation,
                offset: 0,
            },
            // uvsData
            {
                attribute: this.shader.attributes.a_texture_coord,
                size: 2,
                uploadFunction: this.upload_uvs,
                offset: 0,
            },
            // tintData
            {
                attribute: this.shader.attributes.a_color,
                size: 1,
                unsignedByte: true,
                uploadFunction: this.upload_tint,
                offset: 0,
            },
        ];
    }

    /**
     * Starts a new particle batch.
     *
     */
    start() {
        this.renderer.bind_shader(this.shader);
    }

    /**
     * Renders the particle container object.
     *
     * @param {ParticleNode2D} container - The container to render using this ParticleRenderer
     */
    render(container) {
        const children = container.children;
        const maxSize = container._maxSize;
        const batchSize = container._batchSize;
        const renderer = this.renderer;
        let totalChildren = children.length;

        if (totalChildren === 0) {
            return;
        }
        else if (totalChildren > maxSize) {
            totalChildren = maxSize;
        }

        let buffers = container._glBuffers[renderer.CONTEXT_UID];

        if (!buffers) {
            buffers = container._glBuffers[renderer.CONTEXT_UID] = this.generate_buffers(container);
        }

        // @ts-ignore
        const base_texture = children[0]._texture.base_texture;

        // if the uvs have not updated then no point rendering just yet!
        this.renderer.set_blend_mode(correct_blend_mode(container.blend_mode, base_texture.premultiplied_alpha));

        const gl = renderer.gl;

        const m = container.world_transform.copy(this.temp_matrix);

        m.prepend(renderer._active_render_target.projection_matrix);

        this.shader.uniforms.projection_matrix = m.to_array(true);

        this.shader.uniforms.u_color = premultiply_rgba(container.tint_rgb,
            container.world_alpha, this.shader.uniforms.u_color, base_texture.premultiplied_alpha);

        // make sure the texture is bound..
        this.shader.uniforms.u_sampler = renderer.bind_texture(base_texture);

        let updateStatic = false;

        // now lets upload and render the buffers..
        for (let i = 0, j = 0; i < totalChildren; i += batchSize, j += 1) {
            let amount = (totalChildren - i);

            if (amount > batchSize) {
                amount = batchSize;
            }

            if (j >= buffers.length) {
                if (!container.auto_resize) {
                    break;
                }
                buffers.push(this._generate_one_more_buffer(container));
            }

            const buffer = buffers[j];

            // we always upload the dynamic
            buffer.uploadDynamic(children, i, amount);

            const bid = container._buffer_update_ids[j] || 0;

            updateStatic = updateStatic || (buffer._update_id < bid);
            // we only upload the static content when we have to!
            if (updateStatic) {
                buffer._update_id = container._update_id;
                buffer.uploadStatic(children, i, amount);
            }

            // bind the buffer
            renderer.bind_vao(buffer.vao);
            buffer.vao.draw(gl.TRIANGLES, amount * 6);
        }
    }

    /**
     * Creates one particle buffer for each child in the container we want to render and updates internal properties
     *
     * @param {ParticleNode2D} container - The container to render using this ParticleRenderer
     * @return {ParticleBuffer[]} The buffers
     */
    generate_buffers(container) {
        const gl = this.renderer.gl;
        const buffers = [];
        const size = container._maxSize;
        const batchSize = container._batchSize;
        const dynamicPropertyFlags = container._properties;

        for (let i = 0; i < size; i += batchSize) {
            buffers.push(new ParticleBuffer(gl, this.properties, dynamicPropertyFlags, batchSize));
        }

        return buffers;
    }

    /**
     * Creates one more particle buffer, because container has autoResize feature
     *
     * @param {ParticleNode2D} container - The container to render using this ParticleRenderer
     * @return {ParticleBuffer} generated buffer
     * @private
     */
    _generate_one_more_buffer(container) {
        const gl = this.renderer.gl;
        const batchSize = container._batchSize;
        const dynamicPropertyFlags = container._properties;

        return new ParticleBuffer(gl, this.properties, dynamicPropertyFlags, batchSize);
    }

    /**
     * Uploads the verticies.
     *
     * @param {Sprite[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their vertices uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    upload_vertices(children, startIndex, amount, array, stride, offset) {
        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;

        for (let i = 0; i < amount; ++i) {
            const sprite = children[startIndex + i];
            const texture = sprite._texture;
            const sx = sprite.scale.x;
            const sy = sprite.scale.y;
            const trim = texture.trim;
            const orig = texture.orig;

            if (trim) {
                // if the sprite is trimmed and is not a tilingsprite then we need to add the
                // extra space before transforming the sprite coords..
                w1 = trim.x - (sprite.anchor.x * orig.width);
                w0 = w1 + trim.width;

                h1 = trim.y - (sprite.anchor.y * orig.height);
                h0 = h1 + trim.height;
            }
            else {
                w0 = (orig.width) * (1 - sprite.anchor.x);
                w1 = (orig.width) * -sprite.anchor.x;

                h0 = orig.height * (1 - sprite.anchor.y);
                h1 = orig.height * -sprite.anchor.y;
            }

            array[offset] = w1 * sx;
            array[offset + 1] = h1 * sy;

            array[offset + stride] = w0 * sx;
            array[offset + stride + 1] = h1 * sy;

            array[offset + (stride * 2)] = w0 * sx;
            array[offset + (stride * 2) + 1] = h0 * sy;

            array[offset + (stride * 3)] = w1 * sx;
            array[offset + (stride * 3) + 1] = h0 * sy;

            offset += stride * 4;
        }
    }

    /**
     *
     * @param {Sprite[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their positions uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    upload_position(children, startIndex, amount, array, stride, offset) {
        for (let i = 0; i < amount; i++) {
            const spritePosition = children[startIndex + i].position;

            array[offset] = spritePosition.x;
            array[offset + 1] = spritePosition.y;

            array[offset + stride] = spritePosition.x;
            array[offset + stride + 1] = spritePosition.y;

            array[offset + (stride * 2)] = spritePosition.x;
            array[offset + (stride * 2) + 1] = spritePosition.y;

            array[offset + (stride * 3)] = spritePosition.x;
            array[offset + (stride * 3) + 1] = spritePosition.y;

            offset += stride * 4;
        }
    }

    /**
     *
     * @param {Sprite[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their rotation uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    upload_rotation(children, startIndex, amount, array, stride, offset) {
        for (let i = 0; i < amount; i++) {
            const spriteRotation = children[startIndex + i].rotation;

            array[offset] = spriteRotation;
            array[offset + stride] = spriteRotation;
            array[offset + (stride * 2)] = spriteRotation;
            array[offset + (stride * 3)] = spriteRotation;

            offset += stride * 4;
        }
    }

    /**
     *
     * @param {Sprite[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their rotation uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    upload_uvs(children, startIndex, amount, array, stride, offset) {
        for (let i = 0; i < amount; ++i) {
            const textureUvs = children[startIndex + i]._texture._uvs;

            if (textureUvs) {
                array[offset] = textureUvs.x0;
                array[offset + 1] = textureUvs.y0;

                array[offset + stride] = textureUvs.x1;
                array[offset + stride + 1] = textureUvs.y1;

                array[offset + (stride * 2)] = textureUvs.x2;
                array[offset + (stride * 2) + 1] = textureUvs.y2;

                array[offset + (stride * 3)] = textureUvs.x3;
                array[offset + (stride * 3) + 1] = textureUvs.y3;

                offset += stride * 4;
            }
            else {
                // TODO you know this can be easier!
                array[offset] = 0;
                array[offset + 1] = 0;

                array[offset + stride] = 0;
                array[offset + stride + 1] = 0;

                array[offset + (stride * 2)] = 0;
                array[offset + (stride * 2) + 1] = 0;

                array[offset + (stride * 3)] = 0;
                array[offset + (stride * 3) + 1] = 0;

                offset += stride * 4;
            }
        }
    }

    /**
     *
     * @param {Sprite[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their rotation uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    upload_tint(children, startIndex, amount, array, stride, offset) {
        for (let i = 0; i < amount; ++i) {
            const sprite = children[startIndex + i];
            const premultiplied = sprite._texture.base_texture.premultiplied_alpha;
            const alpha = sprite.alpha;
            // we dont call extra function if alpha is 1.0, that's faster
            const argb = alpha < 1.0 && premultiplied ? premultiply_tint(sprite._tint_rgb, alpha)
                : sprite._tint_rgb + (alpha * 255 << 24);

            array[offset] = argb;
            array[offset + stride] = argb;
            array[offset + (stride * 2)] = argb;
            array[offset + (stride * 3)] = argb;

            offset += stride * 4;
        }
    }

    /**
     * Destroys the ParticleRenderer.
     *
     */
    destroy() {
        if (this.renderer.gl) {
            this.renderer.gl.deleteBuffer(this.index_buffer);
        }

        super.destroy();

        this.shader.destroy();

        this.indices = null;
        this.temp_matrix = null;
    }

}
