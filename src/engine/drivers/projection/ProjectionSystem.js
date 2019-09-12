import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';

/**
 * System plugin to the renderer to manage the projection matrix.
 */

export default class ProjectionSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        /**
         * Destination frame
         * @type {Rect2}
         * @readonly
         */
        this.destinationFrame = null;

        /**
         * Source frame
         * @type {Rect2}
         * @readonly
         */
        this.sourceFrame = null;

        /**
         * Default destination frame
         * @type {Rect2}
         * @readonly
         */
        this.defaultFrame = null;

        /**
         * Project matrix
         * @type {Transform2D}
         * @readonly
         */
        this.projectionMatrix = new Transform2D();

        /**
         * A transform that will be appended to the projection matrix
         * if null, nothing will be applied
         * @type {Transform2D}
         */
        this.transform = null;
    }

    /**
     * Updates the projection matrix based on a projection frame (which is a rectangle)
     *
     * @param {Rect2} destinationFrame - The destination frame.
     * @param {Rect2} sourceFrame - The source frame.
     * @param {Number} resolution - Resolution
     * @param {boolean} root - If is root
     */
    update(destinationFrame, sourceFrame, resolution, root)
    {
        this.destinationFrame = destinationFrame || this.destinationFrame || this.defaultFrame;
        this.sourceFrame = sourceFrame || this.sourceFrame || destinationFrame;

        this.calculateProjection(this.destinationFrame, this.sourceFrame, resolution, root);

        if (this.transform)
        {
            this.projectionMatrix.append(this.transform);
        }

        const renderer =  this.renderer;

        renderer.globalUniforms.uniforms.projectionMatrix = this.projectionMatrix;
        renderer.globalUniforms.update();

        // this will work for now
        // but would be sweet to stick and even on the global uniforms..
        if (renderer.shader.shader)
        {
            renderer.shader.syncUniformGroup(renderer.shader.shader.uniforms.globals);
        }
    }

    /**
     * Updates the projection matrix based on a projection frame (which is a rectangle)
     *
     * @param {Rect2} destinationFrame - The destination frame.
     * @param {Rect2} sourceFrame - The source frame.
     * @param {Number} resolution - Resolution
     * @param {boolean} root - If is root
     */
    calculateProjection(destinationFrame, sourceFrame, resolution, root)
    {
        const pm = this.projectionMatrix;

        // I don't think we will need this line..
        // pm.identity();

        if (!root)
        {
            pm.a = (1 / destinationFrame.width * 2) * resolution;
            pm.d = (1 / destinationFrame.height * 2) * resolution;

            pm.tx = -1 - (sourceFrame.x * pm.a);
            pm.ty = -1 - (sourceFrame.y * pm.d);
        }
        else
        {
            pm.a = (1 / destinationFrame.width * 2) * resolution;
            pm.d = (-1 / destinationFrame.height * 2) * resolution;

            pm.tx = -1 - (sourceFrame.x * pm.a);
            pm.ty = 1 - (sourceFrame.y * pm.d);
        }
    }

    /**
     * Sets the transform of the active render target to the given matrix
     * @param {Transform2D} matrix - The transformation matrix
     */
    setTransform(matrix)
    {
        // this._activeRenderTarget.transform = matrix;
    }
}
