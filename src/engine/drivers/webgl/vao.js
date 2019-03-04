import setVertexAttribArrays from './set_vertex_attrib_arrays';
import GLBuffer from './gl_buffer';

export default class VertexArrayObject {
    /**
     * Helper class to work with WebGL VertexArrayObjects (vaos)
     * Only works if WebGL extensions are enabled (they usually are)
     *
     * @param {WebGLRenderingContext} gl The current WebGL rendering context
     * @param {any} state
     */
    constructor(gl, state) {
        this.nativeVaoExtension = null;

        if (!VertexArrayObject.FORCE_NATIVE) {
            this.nativeVaoExtension = gl.getExtension('OES_vertex_array_object') ||
                gl.getExtension('MOZ_OES_vertex_array_object') ||
                gl.getExtension('WEBKIT_OES_vertex_array_object');
        }

        this.nativeState = state;

        if (this.nativeVaoExtension) {
            this.nativeVao = this.nativeVaoExtension.createVertexArrayOES();

            var maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

            // VAO - overwrite the state..
            this.nativeState = {
                tempAttribState: new Array(maxAttribs),
                attribState: new Array(maxAttribs)
            };
        }

        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        /**
         * An array of attributes
         *
         * @type {Array}
         */
        this.attributes = [];

        /**
         * @type {GLBuffer}
         */
        this.indexBuffer = null;

        /**
         * A boolean flag
         *
         * @type {boolean}
         */
        this.dirty = false;
    }

    /**
     * Binds the buffer
     */
    bind() {
        if (this.nativeVao) {
            this.nativeVaoExtension.bindVertexArrayOES(this.nativeVao);

            if (this.dirty) {
                this.dirty = false;
                this.activate();
                return this;
            }
            if (this.indexBuffer) {
                this.indexBuffer.bind();
            }
        }
        else {
            this.activate();
        }

        return this;
    }

    /**
     * Unbinds the buffer
     */
    unbind() {
        if (this.nativeVao) {
            this.nativeVaoExtension.bindVertexArrayOES(null);
        }

        return this;
    }

    /**
     * Uses this vao
     */
    activate() {

        var gl = this.gl;
        var lastBuffer = null;

        for (var i = 0; i < this.attributes.length; i++) {
            var attrib = this.attributes[i];

            if (lastBuffer !== attrib.buffer) {
                attrib.buffer.bind();
                lastBuffer = attrib.buffer;
            }

            gl.vertexAttribPointer(attrib.attribute.location,
                attrib.attribute.size,
                attrib.type || gl.FLOAT,
                attrib.normalized || false,
                attrib.stride || 0,
                attrib.start || 0);
        }

        setVertexAttribArrays(gl, this.attributes, this.nativeState);

        if (this.indexBuffer) {
            this.indexBuffer.bind();
        }

        return this;
    }

    /**
     * @param buffer     {GLBuffer}
     * @param attribute  {any}
     * @param type       {string}
     * @param normalized {boolean}
     * @param stride     {number}
     * @param start      {number}
     */
    addAttribute(buffer, attribute, type, normalized, stride, start) {
        this.attributes.push({
            buffer: buffer,
            attribute: attribute,

            location: attribute.location,
            type: type || this.gl.FLOAT,
            normalized: normalized || false,
            stride: stride || 0,
            start: start || 0
        });

        this.dirty = true;

        return this;
    }

    /**
     * @param buffer   {GLBuffer}
     */
    addIndex(buffer) {
        this.indexBuffer = buffer;

        this.dirty = true;

        return this;
    }

    /**
     * Unbinds this vao and disables it
     */
    clear() {
        // var gl = this.gl;

        // TODO - should this function unbind after clear?
        // for now, no but lets see what happens in the real world!
        if (this.nativeVao) {
            this.nativeVaoExtension.bindVertexArrayOES(this.nativeVao);
        }

        this.attributes.length = 0;
        this.indexBuffer = null;

        return this;
    }

    /**
     * @param type  {number}
     * @param size  {number}
     * @param start {number}
     */
    draw(type, size, start) {
        var gl = this.gl;

        if (this.indexBuffer) {
            gl.drawElements(type, size || this.indexBuffer.data.length, gl.UNSIGNED_SHORT, (start || 0) * 2);
        }
        else {
            // TODO need a better way to calculate size..
            gl.drawArrays(type, start, size || this.getSize());
        }

        return this;
    }

    /**
     * Destroy this vao
     */
    destroy() {
        // lose references
        this.gl = null;
        this.indexBuffer = null;
        this.attributes = null;
        this.nativeState = null;

        if (this.nativeVao) {
            this.nativeVaoExtension.deleteVertexArrayOES(this.nativeVao);
        }

        this.nativeVaoExtension = null;
        this.nativeVao = null;
    }

    getSize() {
        var attrib = this.attributes[0];
        return attrib.buffer.data.length / ((attrib.stride / 4) || attrib.attribute.size);
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
