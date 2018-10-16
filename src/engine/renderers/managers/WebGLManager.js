import WebGLRenderer from "../WebGLRenderer";

export default class WebGLManager {
    /**
     * @param {WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        /**
         * The renderer this manager works for.
         *
         * @type {WebGLRenderer}
         */
        this.renderer = renderer;

        this.renderer.on('context', this.on_context_change, this);
    }

    /**
     * Generic method called when there is a WebGL context change.
     */
    on_context_change() {
        // do some codes init!
    }

    /**
     * Generic destroy methods to be overridden by the subclass
     */
    destroy() {
        this.renderer.off('context', this.on_context_change, this);

        this.renderer = null;
    }
}
