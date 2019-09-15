import ObjectRenderer from './ObjectRenderer';
import { BatchRenderer } from './BatchPluginFactory';
import AbstractBatchRenderer from './AbstractBatchRenderer';

/**
 * System plugin to the renderer to manage batching.
 */
export default class BatchSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        /**
         * An empty renderer.
         *
         * @type {ObjectRenderer}
         */
        this.emptyRenderer = new ObjectRenderer(renderer);

        /**
         * The currently active ObjectRenderer.
         *
         * @type {ObjectRenderer}
         */
        this.currentRenderer = new BatchRenderer(this.renderer);
    }

    /**
     * Changes the current renderer to the one given in parameter
     *
     * @param {ObjectRenderer} objectRenderer - The object renderer to use.
     */
    setObjectRenderer(objectRenderer)
    {
        if (this.currentRenderer === objectRenderer)
        {
            return;
        }

        this.currentRenderer.stop();
        this.currentRenderer = objectRenderer;

        this.currentRenderer.start();
    }

    /**
     * This should be called if you wish to do some custom rendering
     * It will basically render anything that may be batched up such as sprites
     */
    flush()
    {
        this.setObjectRenderer(this.emptyRenderer);
    }

    /**
     * Reset the system to an empty renderer
     */
    reset()
    {
        this.setObjectRenderer(this.emptyRenderer);
    }
}
