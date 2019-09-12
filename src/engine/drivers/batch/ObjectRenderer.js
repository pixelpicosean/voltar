/**
 * Base for a common object renderer that can be used as a
 * system renderer plugin.
 */
export default class ObjectRenderer {
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this manager works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;
    }

    /**
     * Stub method that should be used to empty the current
     * batch by rendering objects now.
     */
    flush()
    {
        // flush!
    }

    /**
     * Generic destruction method that frees all resources. This
     * should be called by subclasses.
     */
    destroy()
    {
        this.renderer = null;
    }

    /**
     * Stub method that initializes any state required before
     * rendering starts. It is different from the `prerender`
     * signal, which occurs every frame, in that it is called
     * whenever an object requests _this_ renderer specifically.
     */
    start()
    {
        // set the shader..
    }

    /**
     * Stops the renderer. It should free up any state and
     * become dormant.
     */
    stop()
    {
        this.flush();
    }

    /**
     * Keeps the object to render. It doesn't have to be
     * rendered immediately.
     *
     * @param {any} object - The object to render.
     */
    render(object) // eslint-disable-line no-unused-vars
    {
        // render the object
    }
}
