import WebGLManager from '../managers/webgl_manager';

/**
 * Base for a common object renderer that can be used as a system renderer plugin.
 */
export default class ObjectRenderer extends WebGLManager {
    /**
     * Starts the renderer and sets the shader
     */
    start() { }

    /**
     * Stops the renderer
     *
     */
    stop() {
        this.flush();
    }

    /**
     * Stub method for rendering content and emptying the current batch.
     */
    flush() { }

    /**
     * Renders an object
     *
     * @param {import('engine/scene/node_2d').default} node - The object to render.
     */
    render(node) { }
}
