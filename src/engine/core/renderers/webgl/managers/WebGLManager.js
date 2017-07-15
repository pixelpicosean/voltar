/**
 * @class
 * @memberof V
 */
export default class WebGLManager
{
    /**
     * @param {V.WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer)
    {
        /**
         * The renderer this manager works for.
         *
         * @member {V.WebGLRenderer}
         */
        this.renderer = renderer;

        this.renderer.on('context', this.onContextChange, this);
    }

    /**
     * Generic method called when there is a WebGL context change.
     *
     */
    onContextChange()
    {
        // do some codes init!
    }

    /**
     * Generic destroy methods to be overridden by the subclass
     *
     */
    destroy()
    {
        this.renderer.off('context', this.onContextChange, this);

        this.renderer = null;
    }
}
