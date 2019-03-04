import map_web_gl_blend_modes_to_voltar from './utils/map_web_gl_blend_modes_to_voltar';

const BLEND = 0;
const DEPTH_TEST = 1;
const FRONT_FACE = 2;
const CULL_FACE = 3;
const BLEND_FUNC = 4;

/**
 * A WebGL state machines
 */
export default class WebGLState {
    /**
     * @param {WebGLRenderingContext} gl - The current WebGL rendering context
     */
    constructor(gl) {
        /**
         * The current active state
         *
         * @type {Uint8Array}
         */
        this.active_state = new Uint8Array(16);

        /**
         * The default state
         *
         * @type {Uint8Array}
         */
        this.default_state = new Uint8Array(16);

        // default blend mode..
        this.default_state[0] = 1;

        /**
         * The current state index in the stack
         *
         * @type {number}
         */
        this.stack_index = 0;

        /**
         * The stack holding all the different states
         *
         * @type {Array<*>}
         */
        this.stack = [];

        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        this.max_attribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

        this.attribState = {
            tempAttribState: new Array(this.max_attribs),
            attribState: new Array(this.max_attribs),
        };

        this.blend_modes = map_web_gl_blend_modes_to_voltar(gl);

        // check we have vao..
        this.nativeVaoExtension = (
            gl.getExtension('OES_vertex_array_object')
            ||
            gl.getExtension('MOZ_OES_vertex_array_object')
            ||
            gl.getExtension('WEBKIT_OES_vertex_array_object')
        );
    }

    /**
     * Pushes a new active state
     */
    push() {
        // next state..
        let state = this.stack[this.stack_index];

        if (!state) {
            state = this.stack[this.stack_index] = new Uint8Array(16);
        }

        ++this.stack_index;

        // copy state..
        // set active state so we can force overrides of gl state
        for (let i = 0; i < this.active_state.length; i++) {
            state[i] = this.active_state[i];
        }
    }

    /**
     * Pops a state out
     */
    pop() {
        const state = this.stack[--this.stack_index];

        this.set_state(state);
    }

    /**
     * Sets the current state
     *
     * @param {*} state - The state to set.
     */
    set_state(state) {
        this.set_blend(state[BLEND]);
        this.set_depth_test(state[DEPTH_TEST]);
        this.set_front_face(state[FRONT_FACE]);
        this.set_cull_face(state[CULL_FACE]);
        this.set_blend_mode(state[BLEND_FUNC]);
    }

    /**
     * Enables or disabled blending.
     *
     * @param {boolean} value_p - Turn on or off webgl blending.
     */
    set_blend(value_p) {
        const value = value_p ? 1 : 0;

        if (this.active_state[BLEND] === value) {
            return;
        }

        this.active_state[BLEND] = value;
        this.gl[value ? 'enable' : 'disable'](this.gl.BLEND);
    }

    /**
     * Sets the blend mode.
     *
     * @param {number} value - The blend mode to set to.
     */
    set_blend_mode(value) {
        if (value === this.active_state[BLEND_FUNC]) {
            return;
        }

        this.active_state[BLEND_FUNC] = value;

        const mode = this.blend_modes[value];

        if (mode.length === 2) {
            this.gl.blendFunc(mode[0], mode[1]);
        } else {
            this.gl.blendFuncSeparate(mode[0], mode[1], mode[2], mode[3]);
        }
    }

    /**
     * Sets whether to enable or disable depth test.
     *
     * @param {boolean} value_p - Turn on or off webgl depth testing.
     */
    set_depth_test(value_p) {
        const value = value_p ? 1 : 0;

        if (this.active_state[DEPTH_TEST] === value) {
            return;
        }

        this.active_state[DEPTH_TEST] = value;
        this.gl[value_p ? 'enable' : 'disable'](this.gl.DEPTH_TEST);
    }

    /**
     * Sets whether to enable or disable cull face.
     *
     * @param {boolean} value_p - Turn on or off webgl cull face.
     */
    set_cull_face(value_p) {
        const value = value_p ? 1 : 0;

        if (this.active_state[CULL_FACE] === value) {
            return;
        }

        this.active_state[CULL_FACE] = value;
        this.gl[value_p ? 'enable' : 'disable'](this.gl.CULL_FACE);
    }

    /**
     * Sets the gl front face.
     *
     * @param {boolean} value_p - true is clockwise and false is counter-clockwise
     */
    set_front_face(value_p) {
        const value = value_p ? 1 : 0;

        if (this.active_state[FRONT_FACE] === value) {
            return;
        }

        this.active_state[FRONT_FACE] = value;
        this.gl.frontFace(this.gl[value_p ? 'CW' : 'CCW']);
    }

    /**
     * Disables all the vaos in use
     *
     */
    reset_attributes() {
        for (let i = 0; i < this.attribState.tempAttribState.length; i++) {
            this.attribState.tempAttribState[i] = 0;
        }

        for (let i = 0; i < this.attribState.attribState.length; i++) {
            this.attribState.attribState[i] = 0;
        }

        // im going to assume one is always active for performance reasons.
        for (let i = 1; i < this.max_attribs; i++) {
            this.gl.disableVertexAttribArray(i);
        }
    }

    // used
    /**
     * Resets all the logic and disables the vaos
     */
    reset_to_default() {
        // unbind any VAO if they exist..
        if (this.nativeVaoExtension) {
            this.nativeVaoExtension.bindVertexArrayOES(null);
        }

        // reset all attributes..
        this.reset_attributes();

        // set active state so we can force overrides of gl state
        for (let i = 0; i < this.active_state.length; ++i) {
            this.active_state[i] = 32;
        }

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);

        this.set_state(this.default_state);
    }
}
