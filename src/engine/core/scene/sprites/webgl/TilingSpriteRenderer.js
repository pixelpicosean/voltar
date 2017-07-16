import * as core from '../../core';
import { WRAP_MODES } from '../../core/const';
import { join } from 'path';

const tempMat = new core.Matrix();

/**
 * WebGL renderer plugin for tiling sprites
 *
 * @class
 * @memberof V.extras
 * @extends V.ObjectRenderer
 */
export default class TilingSpriteRenderer extends core.ObjectRenderer
{

    /**
     * constructor for renderer
     *
     * @param {WebGLRenderer} renderer The renderer this tiling awesomeness works for.
     */
    constructor(renderer)
    {
        super(renderer);

        this.shader = null;
        this.simpleShader = null;
        this.quad = null;
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    onContextChange()
    {
        const gl = this.renderer.gl;

        this.shader = new core.Shader(gl,
            require('./tilingSprite.vert'),
            require('./tilingSprite.frag'));
        this.simpleShader = new core.Shader(gl,
            require('./tilingSprite.vert'),
            require('./tilingSprite_simple.frag'));

        this.renderer.bindVao(null);
        this.quad = new core.Quad(gl, this.renderer.state.attribState);
        this.quad.initVao(this.shader);
    }

    /**
     *
     * @param {V.extras.TilingSprite} ts tilingSprite to be rendered
     */
    render(ts)
    {
        const renderer = this.renderer;
        const quad = this.quad;

        renderer.bindVao(quad.vao);

        let vertices = quad.vertices;

        vertices[0] = vertices[6] = (ts._width) * -ts.anchor.x;
        vertices[1] = vertices[3] = ts._height * -ts.anchor.y;

        vertices[2] = vertices[4] = (ts._width) * (1.0 - ts.anchor.x);
        vertices[5] = vertices[7] = ts._height * (1.0 - ts.anchor.y);

        if (ts.uv_respect_anchor)
        {
            vertices = quad.uvs;

            vertices[0] = vertices[6] = -ts.anchor.x;
            vertices[1] = vertices[3] = -ts.anchor.y;

            vertices[2] = vertices[4] = 1.0 - ts.anchor.x;
            vertices[5] = vertices[7] = 1.0 - ts.anchor.y;
        }

        quad.upload();

        const tex = ts._texture;
        const baseTex = tex.baseTexture;
        const lt = ts.tile_transform.local_transform;
        const uv = ts.uv_transform;
        let isSimple = baseTex.isPowerOfTwo
            && tex.frame.width === baseTex.width && tex.frame.height === baseTex.height;

        // auto, force repeat wrapMode for big tiling textures
        if (isSimple)
        {
            if (!baseTex._glTextures[renderer.CONTEXT_UID])
            {
                if (baseTex.wrapMode === WRAP_MODES.CLAMP)
                {
                    baseTex.wrapMode = WRAP_MODES.REPEAT;
                }
            }
            else
            {
                isSimple = baseTex.wrapMode !== WRAP_MODES.CLAMP;
            }
        }

        const shader = isSimple ? this.simpleShader : this.shader;

        renderer.bindShader(shader);

        const w = tex.width;
        const h = tex.height;
        const W = ts._width;
        const H = ts._height;

        tempMat.set(lt.a * w / W,
            lt.b * w / H,
            lt.c * h / W,
            lt.d * h / H,
            lt.tx / W,
            lt.ty / H);

        // that part is the same as above:
        // tempMat.identity();
        // tempMat.scale(tex.width, tex.height);
        // tempMat.prepend(lt);
        // tempMat.scale(1.0 / ts._width, 1.0 / ts._height);

        tempMat.invert();
        if (isSimple)
        {
            tempMat.prepend(uv.mapCoord);
        }
        else
        {
            shader.uniforms.uMapCoord = uv.mapCoord.toArray(true);
            shader.uniforms.uClampFrame = uv.uClampFrame;
            shader.uniforms.uClampOffset = uv.uClampOffset;
        }

        shader.uniforms.uTransform = tempMat.toArray(true);
        shader.uniforms.uColor = core.utils.premultiplyTintToRgba(ts.tint, ts.world_alpha,
            shader.uniforms.uColor, baseTex.premultipliedAlpha);
        shader.uniforms.translationMatrix = ts.transform.world_transform.toArray(true);

        shader.uniforms.uSampler = renderer.bindTexture(tex);

        renderer.setBlendMode(core.utils.correctBlendMode(ts.blend_mode, baseTex.premultipliedAlpha));

        quad.vao.draw(this.renderer.gl.TRIANGLES, 6, 0);
    }
}

core.WebGLRenderer.registerPlugin('tilingSprite', TilingSpriteRenderer);
