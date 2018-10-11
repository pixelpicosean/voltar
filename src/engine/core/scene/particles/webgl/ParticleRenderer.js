import ObjectRenderer from '../../../renderers/webgl/utils/ObjectRenderer';
import WebGLRenderer from '../../../renderers/webgl/WebGLRenderer';
import * as utils from '../../../utils';
import { Matrix } from '../../../math';
import ParticleShader from './ParticleShader';
import ParticleBuffer from './ParticleBuffer';

const premultiplyTint = utils.premultiplyTint;


/**
 * @author Mat Groves
 *
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original pixi version!
 * Also a thanks to https://github.com/bchevalier for tweaking the tint and alpha so that they now
 * share 4 bytes on the vertex buffer
 *
 * Heavily inspired by LibGDX's ParticleRenderer:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/ParticleRenderer.java
 */

/**
 *
 * @class
 * @private
 * @memberof V
 */
export default class ParticleRenderer extends ObjectRenderer
{
    /**
     * @param {V.WebGLRenderer} renderer - The renderer this sprite batch works for.
     */
    constructor(renderer)
    {
        super(renderer);

        // 65535 is max vertex index in the index buffer (see ParticleRenderer)
        // so max number of particles is 65536 / 4 = 16384
        // and max number of element in the index buffer is 16384 * 6 = 98304
        // Creating a full index buffer, overhead is 98304 * 2 = 196Ko
        // let numIndices = 98304;

        /**
         * The default shader that is used if a sprite doesn't have a more specific one.
         *
         * @member {V.Shader}
         */
        this.shader = null;

        this.indexBuffer = null;

        this.properties = null;

        this.tempMatrix = new Matrix();

        this.CONTEXT_UID = 0;
    }

    /**
     * When there is a WebGL context change
     *
     * @private
     */
    onContextChange()
    {
        const gl = this.renderer.gl;

        this.CONTEXT_UID = this.renderer.CONTEXT_UID;

        // setup default shader
        this.shader = new ParticleShader(gl);

        this.properties = [
            // verticesData
            {
                attribute: this.shader.attributes.aVertexPosition,
                size: 2,
                uploadFunction: this.uploadVertices,
                offset: 0,
            },
            // positionData
            {
                attribute: this.shader.attributes.aPositionCoord,
                size: 2,
                uploadFunction: this.uploadPosition,
                offset: 0,
            },
            // rotationData
            {
                attribute: this.shader.attributes.aRotation,
                size: 1,
                uploadFunction: this.uploadRotation,
                offset: 0,
            },
            // uvsData
            {
                attribute: this.shader.attributes.aTextureCoord,
                size: 2,
                uploadFunction: this.uploadUvs,
                offset: 0,
            },
            // tintData
            {
                attribute: this.shader.attributes.aColor,
                size: 1,
                unsignedByte: true,
                uploadFunction: this.uploadTint,
                offset: 0,
            },
        ];
    }

    /**
     * Starts a new particle batch.
     *
     */
    start()
    {
        this.renderer.bindShader(this.shader);
    }

    /**
     * Renders the particle container object.
     *
     * @param {V.ParticleNode2D} container - The container to render using this ParticleRenderer
     */
    render(container)
    {
        const children = container.children;
        const maxSize = container._maxSize;
        const batchSize = container._batchSize;
        const renderer = this.renderer;
        let totalChildren = children.length;

        if (totalChildren === 0)
        {
            return;
        }
        else if (totalChildren > maxSize)
        {
            totalChildren = maxSize;
        }

        let buffers = container._glBuffers[renderer.CONTEXT_UID];

        if (!buffers)
        {
            buffers = container._glBuffers[renderer.CONTEXT_UID] = this.generateBuffers(container);
        }

        const base_texture = children[0]._texture.base_texture;

        // if the uvs have not updated then no point rendering just yet!
        this.renderer.setBlendMode(utils.correctBlendMode(container.blend_mode, base_texture.premultiplied_alpha));

        const gl = renderer.gl;

        const m = container.world_transform.copy(this.tempMatrix);

        m.prepend(renderer._activeRenderTarget.projectionMatrix);

        this.shader.uniforms.projectionMatrix = m.to_array(true);

        this.shader.uniforms.uColor = utils.premultiplyRgba(container.tint_rgb,
            container.world_alpha, this.shader.uniforms.uColor, base_texture.premultiplied_alpha);

        // make sure the texture is bound..
        this.shader.uniforms.uSampler = renderer.bindTexture(base_texture);

        let updateStatic = false;

        // now lets upload and render the buffers..
        for (let i = 0, j = 0; i < totalChildren; i += batchSize, j += 1)
        {
            let amount = (totalChildren - i);

            if (amount > batchSize)
            {
                amount = batchSize;
            }

            if (j >= buffers.length)
            {
                if (!container.autoResize)
                {
                    break;
                }
                buffers.push(this._generateOneMoreBuffer(container));
            }

            const buffer = buffers[j];

            // we always upload the dynamic
            buffer.uploadDynamic(children, i, amount);

            const bid = container._bufferUpdateIDs[j] || 0;

            updateStatic = updateStatic || (buffer._updateID < bid);
            // we only upload the static content when we have to!
            if (updateStatic) {
                buffer._updateID = container._updateID;
                buffer.uploadStatic(children, i, amount);
            }

            // bind the buffer
            renderer.bindVao(buffer.vao);
            buffer.vao.draw(gl.TRIANGLES, amount * 6);
        }
    }

    /**
     * Creates one particle buffer for each child in the container we want to render and updates internal properties
     *
     * @param {V.ParticleNode2D} container - The container to render using this ParticleRenderer
     * @return {V.ParticleBuffer[]} The buffers
     */
    generateBuffers(container)
    {
        const gl = this.renderer.gl;
        const buffers = [];
        const size = container._maxSize;
        const batchSize = container._batchSize;
        const dynamicPropertyFlags = container._properties;

        for (let i = 0; i < size; i += batchSize)
        {
            buffers.push(new ParticleBuffer(gl, this.properties, dynamicPropertyFlags, batchSize));
        }

        return buffers;
    }

    /**
     * Creates one more particle buffer, because container has autoResize feature
     *
     * @param {PIXI.ParticleContainer} container - The container to render using this ParticleRenderer
     * @return {PIXI.ParticleBuffer} generated buffer
     * @private
     */
    _generateOneMoreBuffer(container)
    {
        const gl = this.renderer.gl;
        const batchSize = container._batchSize;
        const dynamicPropertyFlags = container._properties;

        return new ParticleBuffer(gl, this.properties, dynamicPropertyFlags, batchSize);
    }

    /**
     * Uploads the verticies.
     *
     * @param {V.Node2D[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their vertices uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    uploadVertices(children, startIndex, amount, array, stride, offset)
    {
        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;

        for (let i = 0; i < amount; ++i)
        {
            const sprite = children[startIndex + i];
            const texture = sprite._texture;
            const sx = sprite.scale.x;
            const sy = sprite.scale.y;
            const trim = texture.trim;
            const orig = texture.orig;

            if (trim)
            {
                // if the sprite is trimmed and is not a tilingsprite then we need to add the
                // extra space before transforming the sprite coords..
                w1 = trim.x - (sprite.anchor.x * orig.width);
                w0 = w1 + trim.width;

                h1 = trim.y - (sprite.anchor.y * orig.height);
                h0 = h1 + trim.height;
            }
            else
            {
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
     * @param {V.Node2D[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their positions uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    uploadPosition(children, startIndex, amount, array, stride, offset)
    {
        for (let i = 0; i < amount; i++)
        {
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
     * @param {V.Node2D[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their rotation uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    uploadRotation(children, startIndex, amount, array, stride, offset)
    {
        for (let i = 0; i < amount; i++)
        {
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
     * @param {V.Node2D[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their rotation uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    uploadUvs(children, startIndex, amount, array, stride, offset)
    {
        for (let i = 0; i < amount; ++i)
        {
            const textureUvs = children[startIndex + i]._texture._uvs;

            if (textureUvs)
            {
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
            else
            {
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
     * @param {V.Node2D[]} children - the array of display objects to render
     * @param {number} startIndex - the index to start from in the children array
     * @param {number} amount - the amount of children that will have their rotation uploaded
     * @param {number[]} array - The vertices to upload.
     * @param {number} stride - Stride to use for iteration.
     * @param {number} offset - Offset to start at.
     */
    uploadTint(children, startIndex, amount, array, stride, offset)
    {
        for (let i = 0; i < amount; ++i)
        {
            const sprite = children[startIndex + i];
            const premultiplied = sprite._texture.base_texture.premultiplied_alpha;
            const alpha = sprite.alpha;
            // we dont call extra function if alpha is 1.0, that's faster
            const argb = alpha < 1.0 && premultiplied ? premultiplyTint(sprite._tintRGB, alpha)
                : sprite._tintRGB + (alpha * 255 << 24);

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
    destroy()
    {
        if (this.renderer.gl)
        {
            this.renderer.gl.deleteBuffer(this.indexBuffer);
        }

        super.destroy();

        this.shader.destroy();

        this.indices = null;
        this.tempMatrix = null;
    }

}

WebGLRenderer.registerPlugin('particle', ParticleRenderer);
