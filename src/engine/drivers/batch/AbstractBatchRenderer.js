import BatchDrawCall from './BatchDrawCall';
import BaseTexture from '../textures/BaseTexture';
import ObjectRenderer from './ObjectRenderer';
import State from '../state/State';
import ViewableBuffer from '../geometry/ViewableBuffer';

import checkMaxIfStatementsInShader from '../shader/utils/checkMaxIfStatementsInShader';

import * as settings from '../settings';
import BatchShaderGenerator from './BatchShaderGenerator';
import Shader from '../shader/Shader';
import Geometry from '../geometry/Geometry';
import { nextPow2, log2 } from '../utils/pow2';
import { OS, VIDEO_DRIVER_GLES2_LEGACY } from 'engine/core/os/os';
import { premultiplyBlendMode, premultiplyTint } from '../utils/color/premultiply';


/**
 * Renderer dedicated to drawing and batching sprites.
 *
 * This is the default batch renderer. It buffers objects
 * with texture-based geometries and renders them in
 * batches. It uploads multiple textures to the GPU to
 * reduce to the number of draw calls.
 */
export default class AbstractBatchRenderer extends ObjectRenderer
{
    /**
     * This will hook onto the renderer's `contextChange`
     * and `prerender` signals.
     *
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this works for.
     */
    constructor(renderer)
    {
        super(renderer);

        /**
         * This is used to generate a shader that can
         * color each vertex based on a `aTextureId`
         * attribute that points to an texture in `uSampler`.
         *
         * This enables the objects with different textures
         * to be drawn in the same draw call.
         *
         * You can customize your shader by creating your
         * custom shader generator.
         *
         * @type {BatchShaderGenerator}
         * @protected
         */
        this.shaderGenerator = null;

        /**
         * The class that represents the geometry of objects
         * that are going to be batched with this.
         *
         * @type {object}
         * @default BatchGeometry
         * @protected
         */
        this.geometryClass = null;

        /**
         * Size of data being buffered per vertex in the
         * attribute buffers (in floats). By default, the
         * batch-renderer plugin uses 6:
         *
         * | aVertexPosition | 2 |
         * |-----------------|---|
         * | aTextureCoords  | 2 |
         * | aColor          | 1 |
         * | aTextureId      | 1 |
         *
         * @type {number}
         * @readonly
         */
        this.vertexSize = null;

        /**
         * The WebGL state in which this renderer will work.
         *
         * @type {State}
         * @readonly
         */
        this.state = State.for2d();

        /**
         * The number of bufferable objects before a flush
         * occurs automatically.
         *
         * @type {number}
         * @default settings.SPRITE_MAX_TEXTURES
         */
        this.size = 2000 * 4;// settings.SPRITE_BATCH_SIZE, 2000 is a nice balance between mobile/desktop

        /**
         * Total count of all vertices used by the currently
         * buffered objects.
         *
         * @type {number}
         * @private
         */
        this._vertexCount = 0;

        /**
         * Total count of all indices used by the currently
         * buffered objects.
         *
         * @type {number}
         * @private
         */
        this._indexCount = 0;

        /**
         * Buffer of objects that are yet to be rendered.
         *
         * @type {any[]}
         * @private
         */
        this._bufferedElements = [];

        /**
         * Number of elements that are buffered and are
         * waiting to be flushed.
         *
         * @type {number}
         * @private
         */
        this._bufferSize = 0;

        /**
         * This shader is generated by `this.shaderGenerator`.
         *
         * It is generated specifically to handle the required
         * number of textures being batched together.
         *
         * @type {Shader}
         * @protected
         */
        this._shader = null;

        /**
         * Pool of `this.geometryClass` geometry objects
         * that store buffers. They are used to pass data
         * to the shader on each draw call.
         *
         * These are never re-allocated again, unless a
         * context change occurs; however, the pool may
         * be expanded if required.
         *
         * @type {Geometry[]}
         * @private
         * @see AbstractBatchRenderer.contextChange
         */
        this._packedGeometries = [];

        /**
         * Size of `this._packedGeometries`. It can be expanded
         * if more than `this._packedGeometryPoolSize` flushes
         * occur in a single frame.
         *
         * @type {number}
         * @private
         */
        this._packedGeometryPoolSize = 2;

        /**
         * A flush may occur multiple times in a single
         * frame. On iOS devices or when
         * `settings.CAN_UPLOAD_SAME_BUFFER` is false, the
         * batch renderer does not upload data to the same
         * `WebGLBuffer` for performance reasons.
         *
         * This is the index into `packedGeometries` that points to
         * geometry holding the most recent buffers.
         *
         * @type {number}
         * @private
         */
        this._flushId = 0;

        /**
         * Pool of `BatchDrawCall` objects that `flush` used
         * to create "batches" of the objects being rendered.
         *
         * These are never re-allocated again.
         *
         * @type BatchDrawCall[]
         * @private
         */
        this._drawCalls = [];

        for (let k = 0; k < this.size / 4; k++)
        { // initialize the draw-calls pool to max size.
            this._drawCalls[k] = new BatchDrawCall();
        }

        /**
         * Pool of `ViewableBuffer` objects that are sorted in
         * order of increasing size. The flush method uses
         * the buffer with the least size above the amount
         * it requires. These are used for passing attributes.
         *
         * The first buffer has a size of 8; each subsequent
         * buffer has double capacity of its previous.
         *
         * @type {ViewableBuffer[]}
         * @private
         */
        this._aBuffers = [];

        /**
         * Pool of `Uint16Array` objects that are sorted in
         * order of increasing size. The flush method uses
         * the buffer with the least size above the amount
         * it requires. These are used for passing indices.
         *
         * The first buffer has a size of 12; each subsequent
         * buffer has double capacity of its previous.
         *
         * @type {Uint16Array[]}
         * @private
         */
        this._iBuffers = [];

        /**
         * Maximum number of textures that can be uploaded to
         * the GPU under the current context. It is initialized
         * properly in `this.contextChange`.
         *
         * @type {number}
         * @readonly
         */
        this.MAX_TEXTURES = 1;

        this.renderer.connect('prerender', this.onPrerender, this);
        this.renderer.runners.contextChange.add(this);
    }

    /**
     * Handles the `contextChange` signal.
     *
     * It calculates `this.MAX_TEXTURES` and allocating the
     * packed-geometry object pool.
     */
    contextChange()
    {
        const gl = this.renderer.gl;

        if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2_LEGACY)
        {
            this.MAX_TEXTURES = 1;
        }
        else
        {
            // step 1: first check max textures the GPU can handle.
            this.MAX_TEXTURES = Math.min(
                gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
                settings.SPRITE_MAX_TEXTURES
            );

            // step 2: check the maximum number of if statements the shader can have too..
            this.MAX_TEXTURES = Math.min(
                checkMaxIfStatementsInShader(this.MAX_TEXTURES, gl),
                this.MAX_TEXTURES
            );
        }

        this._shader = this.shaderGenerator.generateShader(this.MAX_TEXTURES);

        // we use the second shader as the first one depending on your browser
        // may omit aTextureId as it is not used by the shader so is optimized out.
        for (let i = 0; i < this._packedGeometryPoolSize; i++)
        {
            /* eslint-disable max-len */
            this._packedGeometries[i] = new (this.geometryClass)();
        }
    }

    /**
     * Handles the `prerender` signal.
     *
     * It ensures that flushes start from the first geometry
     * object again.
     */
    onPrerender()
    {
        this._flushId = 0;
    }

    /**
     * Buffers the "batchable" object. It need not be rendered
     * immediately.
     *
     * @param {any} element - the sprite to render when
     *    using this spritebatch
     */
    render(element)
    {
        if (!element._texture.valid)
        {
            return;
        }

        if (this._vertexCount + (element.vertex_data.length / 2) > this.size)
        {
            this.flush();
        }

        this._vertexCount += element.vertex_data.length / 2;
        this._indexCount += element.indices.length;
        this._bufferedElements[this._bufferSize++] = element;
    }

    /**
     * Renders the content _now_ and empties the current batch.
     */
    flush()
    {
        if (this._vertexCount === 0)
        {
            return;
        }

        const attributeBuffer = this.getAttributeBuffer(this._vertexCount);
        const indexBuffer = this.getIndexBuffer(this._indexCount);
        const gl = this.renderer.gl;

        const {
            _bufferedElements: elements,
            _drawCalls: drawCalls,
            MAX_TEXTURES,
            _packedGeometries: packedGeometries,
            vertexSize,
        } = this;

        const touch = this.renderer.textureGC.count;

        let index = 0;
        let _indexCount = 0;

        let nextTexture;
        let currentTexture;
        let textureCount = 0;

        let currentGroup = drawCalls[0];
        let groupCount = 0;

        let blendMode = -1;// blend-mode of previous element/sprite/object!

        currentGroup.textureCount = 0;
        currentGroup.start = 0;
        currentGroup.blend = blendMode;

        let TICK = ++BaseTexture._globalBatch;
        let i;

        for (i = 0; i < this._bufferSize; ++i)
        {
            const sprite = elements[i];

            elements[i] = null;
            nextTexture = sprite._texture.baseTexture;

            const spriteBlendMode = premultiplyBlendMode[
                nextTexture.premultiplyAlpha ? 1 : 0][sprite.blendMode];

            if (blendMode !== spriteBlendMode)
            {
                blendMode = spriteBlendMode;

                // force the batch to break!
                currentTexture = null;
                textureCount = MAX_TEXTURES;
                TICK++;
            }

            if (currentTexture !== nextTexture)
            {
                currentTexture = nextTexture;

                if (nextTexture._batchEnabled !== TICK)
                {
                    if (textureCount === MAX_TEXTURES)
                    {
                        TICK++;

                        textureCount = 0;

                        currentGroup.size = _indexCount - currentGroup.start;

                        currentGroup = drawCalls[groupCount++];
                        currentGroup.textureCount = 0;
                        currentGroup.blend = blendMode;
                        currentGroup.start = _indexCount;
                    }

                    nextTexture.touched = touch;
                    nextTexture._batchEnabled = TICK;
                    nextTexture._id = textureCount;

                    currentGroup.textures[currentGroup.textureCount++] = nextTexture;
                    textureCount++;
                }
            }

            this.packInterleavedGeometry(sprite, attributeBuffer,
                indexBuffer, index, _indexCount);

            // push a graphics..
            index += (sprite.vertex_data.length / 2) * vertexSize;
            _indexCount += sprite.indices.length;
        }

        BaseTexture._globalBatch = TICK;
        currentGroup.size = _indexCount - currentGroup.start;

        if (!settings.CAN_UPLOAD_SAME_BUFFER)
        { /* Usually on iOS devices, where the browser doesn't
            like uploads to the same buffer in a single frame. */
            if (this._packedGeometryPoolSize <= this._flushId)
            {
                this._packedGeometryPoolSize++;
                packedGeometries[this._flushId] = new (this.geometryClass)();
            }

            packedGeometries[this._flushId]._buffer.update(attributeBuffer.rawBinaryData, 0);
            packedGeometries[this._flushId]._indexBuffer.update(indexBuffer, 0);

            this.renderer.geometry.bind(packedGeometries[this._flushId]);
            this.renderer.geometry.updateBuffers();
            this._flushId++;
        }
        else
        {
            // lets use the faster option, always use buffer number 0
            packedGeometries[this._flushId]._buffer.update(attributeBuffer.rawBinaryData, 0);
            packedGeometries[this._flushId]._indexBuffer.update(indexBuffer, 0);

            this.renderer.geometry.updateBuffers();
        }

        const textureSystem = this.renderer.texture;
        const stateSystem = this.renderer.state;

        // Upload textures and do the draw calls
        for (i = 0; i < groupCount; i++)
        {
            const group = drawCalls[i];
            const groupTextureCount = group.textureCount;

            for (let j = 0; j < groupTextureCount; j++)
            {
                textureSystem.bind(group.textures[j], j);
                group.textures[j] = null;
            }

            stateSystem.setBlendMode(group.blend);
            gl.drawElements(group.type, group.size, gl.UNSIGNED_SHORT, group.start * 2);
        }

        // reset elements for the next flush
        this._bufferSize = 0;
        this._vertexCount = 0;
        this._indexCount = 0;
    }

    /**
     * Starts a new sprite batch.
     */
    start()
    {
        this.renderer.state.set(this.state);

        this.renderer.shader.bind(this._shader);

        if (settings.CAN_UPLOAD_SAME_BUFFER)
        {
            // bind buffer #0, we don't need others
            this.renderer.geometry.bind(this._packedGeometries[this._flushId]);
        }
    }

    /**
     * Stops and flushes the current batch.
     */
    stop()
    {
        this.flush();
    }

    /**
     * Destroys this `AbstractBatchRenderer`. It cannot be used again.
     */
    destroy()
    {
        for (let i = 0; i < this._packedGeometryPoolSize; i++)
        {
            if (this._packedGeometries[i])
            {
                this._packedGeometries[i].destroy();
            }
        }

        this.renderer.disconnect('prerender', this.onPrerender, this);

        this._aBuffers = null;
        this._iBuffers = null;
        this._packedGeometries = null;
        this._drawCalls = null;

        if (this._shader)
        {
            this._shader.destroy();
            this._shader = null;
        }

        super.destroy();
    }

    /**
     * Fetches an attribute buffer from `this._aBuffers` that
     * can hold atleast `size` floats.
     *
     * @param {number} size - minimum capacity required
     * @return {ViewableBuffer} - buffer than can hold atleast `size` floats
     * @private
     */
    getAttributeBuffer(size)
    {
        // 8 vertices is enough for 2 quads
        const roundedP2 = nextPow2(Math.ceil(size / 8));
        const roundedSizeIndex = log2(roundedP2);
        const roundedSize = roundedP2 * 8;

        if (this._aBuffers.length <= roundedSizeIndex)
        {
            this._iBuffers.length = roundedSizeIndex + 1;
        }

        let buffer = this._aBuffers[roundedSize];

        if (!buffer)
        {
            this._aBuffers[roundedSize] = buffer = new ViewableBuffer(roundedSize * this.vertexSize * 4);
        }

        return buffer;
    }

    /**
     * Fetches an index buffer from `this._iBuffers` that can
     * has atleast `size` capacity.
     *
     * @param {number} size - minimum required capacity
     * @return {Uint16Array} - buffer that can fit `size`
     *    indices.
     * @private
     */
    getIndexBuffer(size)
    {
        // 12 indices is enough for 2 quads
        const roundedP2 = nextPow2(Math.ceil(size / 12));
        const roundedSizeIndex = log2(roundedP2);
        const roundedSize = roundedP2 * 12;

        if (this._iBuffers.length <= roundedSizeIndex)
        {
            this._iBuffers.length = roundedSizeIndex + 1;
        }

        let buffer = this._iBuffers[roundedSizeIndex];

        if (!buffer)
        {
            this._iBuffers[roundedSizeIndex] = buffer = new Uint16Array(roundedSize);
        }

        return buffer;
    }

    /**
     * Takes the four batching parameters of `element`, interleaves
     * and pushes them into the batching attribute/index buffers given.
     *
     * It uses these properties: `vertex_data` `uvs`, `textureId` and
     * `indicies`. It also uses the "tint" of the base-texture, if
     * present.
     *
     * @param {any} element - element being rendered
     * @param {ViewableBuffer} attributeBuffer - attribute buffer.
     * @param {Uint16Array} indexBuffer - index buffer
     * @param {number} aIndex - number of floats already in the attribute buffer
     * @param {number} iIndex - number of indices already in `indexBuffer`
     */
    packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex)
    {
        const {
            uint32View,
            float32View,
        } = attributeBuffer;

        const packedVertices = aIndex / this.vertexSize;
        const uvs = element.uvs;
        const indicies = element.indices;
        const vertex_data = element.vertex_data;
        const textureId = element._texture.baseTexture._id;

        const alpha = Math.min(element.worldAlpha, 1.0);
        const argb = (alpha < 1.0
          && element._texture.baseTexture.premultiplyAlpha)
            ? premultiplyTint(element._tintRGB, alpha)
            : element._tintRGB + (alpha * 255 << 24);

        // lets not worry about tint! for now..
        for (let i = 0; i < vertex_data.length; i += 2)
        {
            float32View[aIndex++] = vertex_data[i];
            float32View[aIndex++] = vertex_data[i + 1];
            float32View[aIndex++] = uvs[i];
            float32View[aIndex++] = uvs[i + 1];
            uint32View[aIndex++] = argb;
            float32View[aIndex++] = textureId;
        }

        for (let i = 0; i < indicies.length; i++)
        {
            indexBuffer[iIndex++] = packedVertices + indicies[i];
        }
    }
}
