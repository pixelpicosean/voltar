import WebGLManager from '../managers/WebGLManager';

/**
 * Base for a common object renderer that can be used as a system renderer plugin.
 */
export default class ObjectRenderer extends WebGLManager {
    /**
     * Starts the renderer and sets the shader
     *
     */
    start() {
        // set the shader..
    }

    /**
     * Stops the renderer
     *
     */
    stop() {
        this.flush();
    }

    /**
     * Stub method for rendering content and emptying the current batch.
     *
     */
    flush() {
        // flush!
    }

    /**
     * Renders an object
     *
     * @param {Node2D} object - The object to render.
     */
    render(object) // eslint-disable-line no-unused-vars
    {
        // render the object
    }
}
