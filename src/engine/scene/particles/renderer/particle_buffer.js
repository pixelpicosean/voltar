import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import VertexArrayObject from 'engine/drivers/webgl/vao';
import create_indices_for_quads from 'engine/utils/create_indices_for_quads';

import Node2D from '../../node_2d';

/**
 * @author Mat Groves
 *
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original PixiJS version!
 * Also a thanks to https://github.com/bchevalier for tweaking the tint and alpha so that
 * they now share 4 bytes on the vertex buffer
 *
 * Heavily inspired by LibGDX's ParticleBuffer:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/ParticleBuffer.java
 */

/**
 * The particle buffer manages the static and dynamic buffers for a particle container.
 */
export default class ParticleBuffer {
    /**
     * @param {WebGLRenderingContext} gl - The rendering context.
     * @param {object} properties - The properties to upload.
     * @param {boolean[]} dynamicPropertyFlags - Flags for which properties are dynamic.
     * @param {number} size - The size of the batch.
     */
    constructor(gl, properties, dynamicPropertyFlags, size) {
        /**
         * The current WebGL drawing context.
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = gl;

        /**
         * The number of particles the buffer can hold
         *
         * @member {number}
         */
        this.size = size;

        /**
         * A list of the properties that are dynamic.
         *
         * @member {object[]}
         */
        this.dynamicProperties = [];

        /**
         * A list of the properties that are static.
         *
         * @member {object[]}
         */
        this.staticProperties = [];

        for (let i = 0; i < properties.length; ++i) {
            let property = properties[i];

            // Make copy of properties object so that when we edit the offset it doesn't
            // change all other instances of the object literal
            property = {
                attribute: property.attribute,
                size: property.size,
                uploadFunction: property.uploadFunction,
                unsignedByte: property.unsignedByte,
                offset: property.offset,
            };

            if (dynamicPropertyFlags[i]) {
                this.dynamicProperties.push(property);
            }
            else {
                this.staticProperties.push(property);
            }
        }

        this.staticStride = 0;
        this.staticBuffer = null;
        this.staticData = null;
        this.staticDataUint32 = null;

        this.dynamicStride = 0;
        this.dynamicBuffer = null;
        this.dynamicData = null;
        this.dynamicDataUint32 = null;

        this._update_id = 0;

        this.initBuffers();
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    initBuffers() {
        const gl = this.gl;
        let dynamicOffset = 0;

        /**
         * Holds the indices of the geometry (quads) to draw
         *
         * @member {Uint16Array}
         */
        this.indices = create_indices_for_quads(this.size);
        this.index_buffer = GLBuffer.create_index_buffer(gl, this.indices, gl.STATIC_DRAW);

        this.dynamicStride = 0;

        for (let i = 0; i < this.dynamicProperties.length; ++i) {
            const property = this.dynamicProperties[i];

            property.offset = dynamicOffset;
            dynamicOffset += property.size;
            this.dynamicStride += property.size;
        }

        const dynBuffer = new ArrayBuffer(this.size * this.dynamicStride * 4 * 4);

        this.dynamicData = new Float32Array(dynBuffer);
        this.dynamicDataUint32 = new Uint32Array(dynBuffer);
        this.dynamicBuffer = GLBuffer.create_vertex_buffer(gl, dynBuffer, gl.STREAM_DRAW);

        // static //
        let staticOffset = 0;

        this.staticStride = 0;

        for (let i = 0; i < this.staticProperties.length; ++i) {
            const property = this.staticProperties[i];

            property.offset = staticOffset;
            staticOffset += property.size;
            this.staticStride += property.size;
        }

        const statBuffer = new ArrayBuffer(this.size * this.staticStride * 4 * 4);

        this.staticData = new Float32Array(statBuffer);
        this.staticDataUint32 = new Uint32Array(statBuffer);
        this.staticBuffer = GLBuffer.create_vertex_buffer(gl, statBuffer, gl.STATIC_DRAW);

        this.vao = new VertexArrayObject(gl)
            .add_index(this.index_buffer);

        for (let i = 0; i < this.dynamicProperties.length; ++i) {
            const property = this.dynamicProperties[i];

            if (property.unsignedByte) {
                this.vao.add_attribute(
                    this.dynamicBuffer,
                    property.attribute,
                    gl.UNSIGNED_BYTE,
                    true,
                    this.dynamicStride * 4,
                    property.offset * 4
                );
            }
            else {
                this.vao.add_attribute(
                    this.dynamicBuffer,
                    property.attribute,
                    gl.FLOAT,
                    false,
                    this.dynamicStride * 4,
                    property.offset * 4
                );
            }
        }

        for (let i = 0; i < this.staticProperties.length; ++i) {
            const property = this.staticProperties[i];

            if (property.unsignedByte) {
                this.vao.add_attribute(
                    this.staticBuffer,
                    property.attribute,
                    gl.UNSIGNED_BYTE,
                    true,
                    this.staticStride * 4,
                    property.offset * 4
                );
            }
            else {
                this.vao.add_attribute(
                    this.staticBuffer,
                    property.attribute,
                    gl.FLOAT,
                    false,
                    this.staticStride * 4,
                    property.offset * 4
                );
            }
        }
    }

    /**
     * Uploads the dynamic properties.
     *
     * @param {Node2D[]} children - The children to upload.
     * @param {number} startIndex - The index to start at.
     * @param {number} amount - The number to upload.
     */
    uploadDynamic(children, startIndex, amount) {
        for (let i = 0; i < this.dynamicProperties.length; i++) {
            const property = this.dynamicProperties[i];

            property.uploadFunction(children, startIndex, amount,
                property.unsignedByte ? this.dynamicDataUint32 : this.dynamicData,
                this.dynamicStride, property.offset);
        }

        this.dynamicBuffer.upload();
    }

    /**
     * Uploads the static properties.
     *
     * @param {Node2D[]} children - The children to upload.
     * @param {number} startIndex - The index to start at.
     * @param {number} amount - The number to upload.
     */
    uploadStatic(children, startIndex, amount) {
        for (let i = 0; i < this.staticProperties.length; i++) {
            const property = this.staticProperties[i];

            property.uploadFunction(children, startIndex, amount,
                property.unsignedByte ? this.staticDataUint32 : this.staticData,
                this.staticStride, property.offset);
        }

        this.staticBuffer.upload();
    }

    /**
     * Destroys the ParticleBuffer.
     *
     */
    destroy() {
        this.dynamicProperties = null;
        this.dynamicBuffer.destroy();
        this.dynamicBuffer = null;
        this.dynamicData = null;
        this.dynamicDataUint32 = null;

        this.staticProperties = null;
        this.staticBuffer.destroy();
        this.staticBuffer = null;
        this.staticData = null;
        this.staticDataUint32 = null;
    }

}
