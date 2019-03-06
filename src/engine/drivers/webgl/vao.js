import set_vertex_attrib_arrays from './set_vertex_attrib_arrays';
import GLBuffer from './gl_buffer';

/**
 * @typedef Attribute
 * @property {GLBuffer} buffer
 * @property {import('./shader/extract_attributes').AttributeObject} attribute
 * @property {number} location
 * @property {number} type
 * @property {boolean} normalized
 * @property {number} stride
 * @property {number} start
 */

/**
 * @typedef VertexArrayObjectDesc
 * @property {number[]} temp_attrib_state
 * @property {number[]} attrib_state
 */

export default class VertexArrayObject {
    /**
     * Helper class to work with WebGL VertexArrayObjects (vaos)
     * Only works if WebGL extensions are enabled (they usually are)
     *
     * @param {WebGLRenderingContext} gl The current WebGL rendering context
     * @param {VertexArrayObjectDesc} [state]
     */
    constructor(gl, state = null) {
        this.native_vao_extension = null;

        if (!VertexArrayObject.FORCE_NATIVE) {
            this.native_vao_extension =
                gl.getExtension('OES_vertex_array_object')
                ||
                gl.getExtension('MOZ_OES_vertex_array_object')
                ||
                gl.getExtension('WEBKIT_OES_vertex_array_object')
        }

        this.native_state = state;

        if (this.native_vao_extension) {
            this.native_vao = this.native_vao_extension.createVertexArrayOES();

            var max_attribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

            // VAO - overwrite the state..
            this.native_state = {
                temp_attrib_state: /** @type {number[]} */(new Array(max_attribs)),
                attrib_state: /** @type {number[]} */(new Array(max_attribs))
            };
        }

        /**
         * The current WebGL rendering context
         */
        this.gl = gl;

        /**
         * An array of attributes
         *
         * @type {Attribute[]}
         */
        this.attributes = [];

        /**
         * @type {GLBuffer}
         */
        this.index_buffer = null;

        /**
         * A boolean flag
         */
        this.dirty = false;
    }

    /**
     * Binds the buffer
     */
    bind() {
        if (this.native_vao) {
            this.native_vao_extension.bindVertexArrayOES(this.native_vao);

            if (this.dirty) {
                this.dirty = false;
                this.activate();
                return this;
            }
            if (this.index_buffer) {
                this.index_buffer.bind();
            }
        } else {
            this.activate();
        }

        return this;
    }

    /**
     * Unbinds the buffer
     */
    unbind() {
        if (this.native_vao) {
            this.native_vao_extension.bindVertexArrayOES(null);
        }

        return this;
    }

    /**
     * Uses this vao
     */
    activate() {

        const gl = this.gl;
        let last_buffer = null;

        for (let i = 0; i < this.attributes.length; i++) {
            const attrib = this.attributes[i];

            if (last_buffer !== attrib.buffer) {
                attrib.buffer.bind();
                last_buffer = attrib.buffer;
            }

            gl.vertexAttribPointer(attrib.attribute.location,
                attrib.attribute.size,
                attrib.type || gl.FLOAT,
                attrib.normalized || false,
                attrib.stride || 0,
                attrib.start || 0
            );
        }

        set_vertex_attrib_arrays(gl, this.attributes, this.native_state);

        if (this.index_buffer) {
            this.index_buffer.bind();
        }

        return this;
    }

    /**
     * @param {GLBuffer} buffer
     * @param {import('./shader/extract_attributes').AttributeObject} attribute
     * @param {number} [type]
     * @param {boolean} [normalized]
     * @param {number} [stride]
     * @param {number} [start]
     */
    add_attribute(buffer, attribute, type, normalized = false, stride = 0, start = 0) {
        this.attributes.push({
            buffer: buffer,
            attribute: attribute,
            location: attribute.location,
            type: type || this.gl.FLOAT,
            normalized: normalized,
            stride: stride,
            start: start,
        });

        this.dirty = true;

        return this;
    }

    /**
     * @param {GLBuffer} buffer
     */
    add_index(buffer) {
        this.index_buffer = buffer;

        this.dirty = true;

        return this;
    }

    /**
     * Unbinds this vao and disables it
     */
    clear() {
        // TODO - should this function unbind after clear?
        // for now, no but lets see what happens in the real world!
        if (this.native_vao) {
            this.native_vao_extension.bindVertexArrayOES(this.native_vao);
        }

        this.attributes.length = 0;
        this.index_buffer = null;

        return this;
    }

    /**
     * @param type  {number}
     * @param size  {number}
     * @param [start] {number}
     */
    draw(type, size, start = 0) {
        const gl = this.gl;

        if (this.index_buffer) {
            gl.drawElements(type, size || /** @type {SharedArrayBuffer} */(this.index_buffer.data).length, gl.UNSIGNED_SHORT, start * 2);
        } else {
            // TODO need a better way to calculate size..
            gl.drawArrays(type, start, size || this.get_size());
        }

        return this;
    }

    /**
     * Destroy this vao
     */
    destroy() {
        // lose references
        this.gl = null;
        this.index_buffer = null;
        this.attributes = null;
        this.native_state = null;

        if (this.native_vao) {
            this.native_vao_extension.deleteVertexArrayOES(this.native_vao);
        }

        this.native_vao_extension = null;
        this.native_vao = null;
    }

    get_size() {
        var attrib = this.attributes[0];
        return /** @type {SharedArrayBuffer} */(attrib.buffer.data).length / ((attrib.stride / 4) || attrib.attribute.size);
    }
}

/**
* Some devices behave a bit funny when using the newer extensions (im looking at you ipad 2!)
* If you find on older devices that things have gone a bit weird then set this to true.
*/
/**
 * Lets the VAO know if you should use the WebGL extension or the native methods.
 * Some devices behave a bit funny when using the newer extensions (im looking at you ipad 2!)
 * If you find on older devices that things have gone a bit weird then set this to true.
 * @type {boolean}
 */
VertexArrayObject.FORCE_NATIVE = false;
