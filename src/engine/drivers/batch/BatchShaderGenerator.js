import Shader from '../shader/Shader';
import Program from '../shader/Program';
import UniformGroup from '../shader/UniformGroup';
import { Transform2D } from 'engine/core/math/transform_2d';


/**
 * Helper that generates batching multi-texture shader. Use it with your new BatchRenderer
 */
export default class BatchShaderGenerator
{
    /**
     * @param {string} vertexSrc - Vertex shader
     * @param {string} fragTemplate - Fragment shader template
     */
    constructor(vertexSrc, fragTemplate)
    {
        /**
         * Reference to the vertex shader source.
         *
         * @type {string}
         */
        this.vertexSrc = vertexSrc;

        /**
         * Reference to the fragement shader template. Must contain "%count%" and "%forloop%".
         *
         * @type {string}
         */
        this.fragTemplate = fragTemplate;

        this.programCache = {};
        this.defaultGroupCache = {};

        if (fragTemplate.indexOf('%count%') < 0)
        {
            throw new Error('Fragment template must contain "%count%".');
        }

        if (fragTemplate.indexOf('%forloop%') < 0)
        {
            throw new Error('Fragment template must contain "%forloop%".');
        }
    }

    generateShader(maxTextures)
    {
        if (!this.programCache[maxTextures])
        {
            const sampleValues = new Int32Array(maxTextures);

            for (let i = 0; i < maxTextures; i++)
            {
                sampleValues[i] = i;
            }

            this.defaultGroupCache[maxTextures] = UniformGroup.from({ uSamplers: sampleValues }, true);

            let fragmentSrc = this.fragTemplate;

            fragmentSrc = fragmentSrc.replace(/%count%/gi, `${maxTextures}`);
            fragmentSrc = fragmentSrc.replace(/%forloop%/gi, this.generateSampleSrc(maxTextures));

            this.programCache[maxTextures] = new Program(this.vertexSrc, fragmentSrc);
        }

        const uniforms = {
            tint: new Float32Array([1, 1, 1, 1]),
            translationMatrix: new Transform2D(),
            default: this.defaultGroupCache[maxTextures],
        };

        return new Shader(this.programCache[maxTextures], uniforms);
    }

    generateSampleSrc(maxTextures)
    {
        let src = '';

        src += '\n';
        src += '\n';

        for (let i = 0; i < maxTextures; i++)
        {
            if (i > 0)
            {
                src += '\nelse ';
            }

            if (i < maxTextures - 1)
            {
                src += `if(vTextureId < ${i}.5)`;
            }

            src += '\n{';
            src += `\n\tcolor = texture2D(uSamplers[${i}], vTextureCoord);`;
            src += '\n}';
        }

        src += '\n';
        src += '\n';

        return src;
    }
}
