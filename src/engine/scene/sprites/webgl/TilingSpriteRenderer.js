import ObjectRenderer from '../../../renderers/webgl/utils/ObjectRenderer';
import WebGLRenderer from '../../../renderers/webgl/WebGLRenderer';
import { WRAP_MODES } from '../../../const';
import { join } from 'path';
import { Matrix } from '../../../math';
import * as utils from '../../../utils';
import Shader from '../../../Shader';
import Quad from '../../../renderers/webgl/utils/Quad';


const tempMat = new Matrix();


/**
 * WebGL renderer plugin for tiling sprites
 *
 * @class
 * @memberof V.extras
 * @extends V.ObjectRenderer
 */
export default class TilingSpriteRenderer extends ObjectRenderer
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
    on_context_change()
    {
        const gl = this.renderer.gl;

        this.shader = new Shader(gl,
            require('./tilingSprite.vert'),
            require('./tilingSprite.frag'));
        this.simpleShader = new Shader(gl,
            require('./tilingSprite.vert'),
            require('./tilingSprite_simple.frag'));

        this.renderer.bindVao(null);
        this.quad = new Quad(gl, this.renderer.state.attribState);
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
        const baseTex = tex.base_texture;
        const lt = ts.tile_transform.local_transform;
        const uv = ts.uv_transform;
        let isSimple = baseTex.is_power_of_two
            && tex.frame.width === baseTex.width && tex.frame.height === baseTex.height;

        // auto, force repeat wrap_mode for big tiling textures
        if (isSimple)
        {
            if (!baseTex._gl_textures[renderer.CONTEXT_UID])
            {
                if (baseTex.wrap_mode === WRAP_MODES.CLAMP)
                {
                    baseTex.wrap_mode = WRAP_MODES.REPEAT;
                }
            }
            else
            {
                isSimple = baseTex.wrap_mode !== WRAP_MODES.CLAMP;
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
            tempMat.prepend(uv.map_coord);
        }
        else
        {
            shader.uniforms.uMapCoord = uv.map_coord.to_array(true);
            shader.uniforms.u_clamp_frame = uv.u_clamp_frame;
            shader.uniforms.u_clamp_offset = uv.u_clamp_offset;
        }

        shader.uniforms.uTransform = tempMat.to_array(true);
        shader.uniforms.uColor = utils.premultiply_tint_to_rgba(ts.tint, ts.world_alpha,
            shader.uniforms.uColor, baseTex.premultiplied_alpha);
        shader.uniforms.translationMatrix = ts.transform.world_transform.to_array(true);

        shader.uniforms.uSampler = renderer.bind_texture(tex);

        renderer.setBlendMode(utils.correct_blend_mode(ts.blend_mode, baseTex.premultiplied_alpha));

        quad.vao.draw(this.renderer.gl.TRIANGLES, 6, 0);
    }
}

WebGLRenderer.register_plugin('tilingSprite', TilingSpriteRenderer);
