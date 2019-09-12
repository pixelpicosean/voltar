import { VObject } from "engine/core/v_object";


let CONTEXT_UID = 0;

export class ContextManager extends VObject {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {WebGLRenderingContext} gl
     */
    constructor(canvas, gl) {
        super();

        this.canvas = canvas;
        this.gl = gl;

        this.CONTEXT_UID = CONTEXT_UID;

        // Bind functions
        this.handleContextLost = this.handleContextLost.bind(this);
        this.handleContextRestored = this.handleContextRestored.bind(this);

        canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
    }

    /**
     * `true` if the context is lost
     * @member {boolean}
     * @readonly
     */
    get isLost()
    {
        return (!this.gl || this.gl.isContextLost());
    }

    /**
     * Handle the context change event
     * @param {WebGLRenderingContext} gl new webgl context
     */
    contextChange(gl)
    {
        this.gl = gl;
        this.CONTEXT_UID = CONTEXT_UID++;

        // restore a context if it was previously lost
        if (gl.isContextLost() && gl.getExtension('WEBGL_lose_context'))
        {
            gl.getExtension('WEBGL_lose_context').restoreContext();
        }
    }

    /**
     * Handles a lost webgl context
     *
     * @protected
     * @param {WebGLContextEvent} event - The context lost event.
     */
    handleContextLost(event)
    {
        event.preventDefault();
    }

    /**
     * Handles a restored webgl context
     *
     * @protected
     */
    handleContextRestored()
    {
        this.emit_signal('context_change', this.gl);
    }

    destroy()
    {
        // remove listeners
        this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
        this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

        this.gl.useProgram(null);
    }

    /**
     * Handle the post-render runner event
     *
     * @protected
     */
    postrender()
    {
        this.gl.flush();
    }

    /**
     * Validate context
     *
     * @protected
     * @param {WebGLRenderingContext} gl - Render context
     */
    validateContext(gl)
    {
        const attributes = gl.getContextAttributes();

        // this is going to be fairly simple for now.. but at least we have room to grow!
        if (!attributes.stencil)
        {
            /* eslint-disable max-len */

            /* eslint-disable no-console */
            console.warn('Provided WebGL context does not have a stencil buffer, masks may not render correctly');
            /* eslint-enable no-console */

            /* eslint-enable max-len */
        }
    }
}
