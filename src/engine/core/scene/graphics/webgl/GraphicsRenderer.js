import { hex2rgb } from '../../../utils';
import { SHAPES } from '../../../const';
import ObjectRenderer from '../../../renderers/webgl/utils/ObjectRenderer';
import WebGLRenderer from '../../../renderers/webgl/WebGLRenderer';
import WebGLGraphicsData from './WebGLGraphicsData';
import PrimitiveShader from './shaders/PrimitiveShader';

import buildPoly from './utils/buildPoly';
import buildRectangle from './utils/buildRectangle';
import buildRoundedRectangle from './utils/buildRoundedRectangle';
import buildCircle from './utils/buildCircle';

/**
 * Renders the graphics object.
 *
 * @class
 * @memberof V
 * @extends V.ObjectRenderer
 */
export default class GraphicsRenderer extends ObjectRenderer
{
    /**
     * @param {V.WebGLRenderer} renderer - The renderer this object renderer works for.
     */
    constructor(renderer)
    {
        super(renderer);

        this.graphics_dataPool = [];

        this.primitiveShader = null;

        this.gl = renderer.gl;

        // easy access!
        this.CONTEXT_UID = 0;
    }

    /**
     * Called when there is a WebGL context change
     *
     * @private
     *
     */
    onContextChange()
    {
        this.gl = this.renderer.gl;
        this.CONTEXT_UID = this.renderer.CONTEXT_UID;
        this.primitiveShader = new PrimitiveShader(this.gl);
    }

    /**
     * Destroys this renderer.
     *
     */
    destroy()
    {
        ObjectRenderer.prototype.destroy.call(this);

        for (let i = 0; i < this.graphics_dataPool.length; ++i)
        {
            this.graphics_dataPool[i].destroy();
        }

        this.graphics_dataPool = null;
    }

    /**
     * Renders a graphics object.
     *
     * @param {V.Graphics} graphics - The graphics object to render.
     */
    render(graphics)
    {
        const renderer = this.renderer;
        const gl = renderer.gl;

        let webGLData;
        let webGL = graphics._webGL[this.CONTEXT_UID];

        if (!webGL || graphics.dirty !== webGL.dirty)
        {
            this.updateGraphics(graphics);

            webGL = graphics._webGL[this.CONTEXT_UID];
        }

        // This  could be speeded up for sure!
        const shader = this.primitiveShader;

        renderer.bindShader(shader);
        renderer.state.setBlendMode(graphics.blend_mode);

        for (let i = 0, n = webGL.data.length; i < n; i++)
        {
            webGLData = webGL.data[i];
            const shaderTemp = webGLData.shader;

            renderer.bindShader(shaderTemp);
            shaderTemp.uniforms.translationMatrix = graphics.transform.world_transform.to_array(true);
            shaderTemp.uniforms.tint = hex2rgb(graphics.tint);
            shaderTemp.uniforms.alpha = graphics.world_alpha;

            renderer.bindVao(webGLData.vao);

            if (webGLData.native_lines)
            {
                gl.drawArrays(gl.LINES, 0, webGLData.points.length / 6);
            }
            else
            {
                webGLData.vao.draw(gl.TRIANGLE_STRIP, webGLData.indices.length);
            }
        }
    }

    /**
     * Updates the graphics object
     *
     * @private
     * @param {V.Graphics} graphics - The graphics object to update
     */
    updateGraphics(graphics)
    {
        const gl = this.renderer.gl;

         // get the contexts graphics object
        let webGL = graphics._webGL[this.CONTEXT_UID];

        // if the graphics object does not exist in the webGL context time to create it!
        if (!webGL)
        {
            webGL = graphics._webGL[this.CONTEXT_UID] = { lastIndex: 0, data: [], gl, clear_dirty: -1, dirty: -1 };
        }

        // flag the graphics as not dirty as we are about to update it...
        webGL.dirty = graphics.dirty;

        // if the user cleared the graphics object we will need to clear every object
        if (graphics.clear_dirty !== webGL.clear_dirty)
        {
            webGL.clear_dirty = graphics.clear_dirty;

            // loop through and return all the webGLDatas to the object pool so than can be reused later on
            for (let i = 0; i < webGL.data.length; i++)
            {
                this.graphics_dataPool.push(webGL.data[i]);
            }

            // clear the array and reset the index..
            webGL.data.length = 0;
            webGL.lastIndex = 0;
        }

        let webGLData;
        let webGLDataNativeLines;

        // loop through the graphics datas and construct each one..
        // if the object is a complex fill then the new stencil buffer technique will be used
        // other wise graphics objects will be pushed into a batch..
        for (let i = webGL.lastIndex; i < graphics.graphics_data.length; i++)
        {
            const data = graphics.graphics_data[i];

            // TODO - this can be simplified
            webGLData = this.getWebGLData(webGL, 0);

            if (data.native_lines && data.line_width)
            {
                webGLDataNativeLines = this.getWebGLData(webGL, 0, true);
                webGL.lastIndex++;
            }

            if (data.type === SHAPES.POLY)
            {
                buildPoly(data, webGLData, webGLDataNativeLines);
            }
            if (data.type === SHAPES.RECT)
            {
                buildRectangle(data, webGLData, webGLDataNativeLines);
            }
            else if (data.type === SHAPES.CIRC || data.type === SHAPES.ELIP)
            {
                buildCircle(data, webGLData, webGLDataNativeLines);
            }
            else if (data.type === SHAPES.RREC)
            {
                buildRoundedRectangle(data, webGLData, webGLDataNativeLines);
            }

            webGL.lastIndex++;
        }

        this.renderer.bindVao(null);

        // upload all the dirty data...
        for (let i = 0; i < webGL.data.length; i++)
        {
            webGLData = webGL.data[i];

            if (webGLData.dirty)
            {
                webGLData.upload();
            }
        }
    }

    /**
     *
     * @private
     * @param {WebGLRenderingContext} gl - the current WebGL drawing context
     * @param {number} type - TODO @Alvin
     * @param {number} native_lines - indicate whether the webGLData use for native_lines.
     * @return {*} TODO
     */
    getWebGLData(gl, type, native_lines)
    {
        let webGLData = gl.data[gl.data.length - 1];

        if (!webGLData || webGLData.native_lines !== native_lines || webGLData.points.length > 320000)
        {
            webGLData = this.graphics_dataPool.pop()
                || new WebGLGraphicsData(this.renderer.gl, this.primitiveShader, this.renderer.state.attribsState);
            webGLData.native_lines = native_lines;
            webGLData.reset(type);
            gl.data.push(webGLData);
        }

        webGLData.dirty = true;

        return webGLData;
    }
}

WebGLRenderer.registerPlugin('graphics', GraphicsRenderer);
