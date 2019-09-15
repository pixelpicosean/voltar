import BatchShaderGenerator from './BatchShaderGenerator';
import BatchGeometry from './BatchGeometry';
import AbstractBatchRenderer from './AbstractBatchRenderer';

import defaultVertex from './texture.vert';
import defaultFragment from './texture.frag';


export default class BatchPluginFactory
{
    /**
     * Create a new BatchRenderer plugin for Renderer. this convenience can provide an easy way
     * to extend BatchRenderer with all the necessary pieces.
     * @example
     * const fragment = `
     * varying vec2 vTextureCoord;
     * varying vec4 vColor;
     * varying float vTextureId;
     * uniform sampler2D uSamplers[%count%];
     *
     * void main(void){
     *     vec4 color;
     *     %forloop%
     *     gl_FragColor = vColor * vec4(color.a - color.rgb, color.a);
     * }
     * `;
     * const InvertBatchRenderer = BatchPluginFactory.create({ fragment });
     * Renderer.registerPlugin('invert', InvertBatchRenderer);
     * const sprite = new Sprite();
     * sprite.pluginName = 'invert';
     *
     * @static
     * @param {object} [options]
     * @param {string} [options.vertex=defaultVertexSrc] - Vertex shader source
     * @param {string} [options.fragment=defaultFragmentTemplate] - Fragment shader template
     * @param {number} [options.vertexSize=6] - Vertex size
     * @param {object} [options.geometryClass=BatchGeometry]
     */
    static create(options)
    {
        const { vertex, fragment, vertexSize, geometryClass } = Object.assign({
            vertex: defaultVertex,
            fragment: defaultFragment,
            geometryClass: BatchGeometry,
            vertexSize: 6,
        }, options);

        return class BatchPlugin extends AbstractBatchRenderer
        {
            constructor(renderer)
            {
                super(renderer);

                this.shaderGenerator = new BatchShaderGenerator(vertex, fragment);
                this.geometryClass = geometryClass;
                this.vertexSize = vertexSize;
            }
        };
    }

    /**
     * The default vertex shader source
     *
     * @static
     * @type {string}
     * @constant
     */
    static get defaultVertexSrc()
    {
        return defaultVertex;
    }

    /**
     * The default fragment shader source
     *
     * @static
     * @type {string}
     * @constant
     */
    static get defaultFragmentTemplate()
    {
        return defaultFragment;
    }
}

// Setup the default BatchRenderer plugin, this is what
// we'll actually export at the root level
export const BatchRenderer = BatchPluginFactory.create();
