import { WRAP_MODES } from 'engine/const';

import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import ObjectRenderer from 'engine/renderers/utils/ObjectRenderer';

import GLShader from 'engine/drivers/webgl/gl_shader';

import Quad from 'engine/renderers/utils/Quad';

import { Matrix } from 'engine/core/math/index';
import { premultiply_tint_to_rgba, correct_blend_mode } from 'engine/utils/index';

import TilingSprite from '../tiling_sprite';

import Vert from './tiling_sprite.vert';
import Frag from './tiling_sprite.frag';
import SimpleFrag from './tiling_sprite_simple.frag';

const temp_mat = new Matrix();

/**
 * WebGL renderer plugin for tiling sprites
 */
export default class TilingSpriteRenderer extends ObjectRenderer {

    /**
     * constructor for renderer
     *
     * @param {WebGLRenderer} renderer The renderer this tiling awesomeness works for.
     */
    constructor(renderer) {
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
    on_context_change() {
        const gl = this.renderer.gl;

        this.shader = new GLShader(gl, Vert, Frag);
        this.simpleShader = new GLShader(gl, Vert, SimpleFrag);

        this.renderer.bind_vao(null);
        this.quad = new Quad(gl, this.renderer.state.attrib_state);
        this.quad.init_vao(this.shader);
    }

    /**
     *
     * @param {TilingSprite} ts tilingSprite to be rendered
     */
    render(ts) {
        const renderer = this.renderer;
        const quad = this.quad;

        renderer.bind_vao(quad.vao);

        let vertices = quad.vertices;

        vertices[0] = vertices[6] = (ts._width) * -ts.anchor.x;
        vertices[1] = vertices[3] = ts._height * -ts.anchor.y;

        vertices[2] = vertices[4] = (ts._width) * (1.0 - ts.anchor.x);
        vertices[5] = vertices[7] = ts._height * (1.0 - ts.anchor.y);

        if (ts.uv_respect_anchor) {
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
        if (isSimple) {
            if (!baseTex._gl_textures[renderer.CONTEXT_UID]) {
                if (baseTex.wrap_mode === WRAP_MODES.CLAMP) {
                    baseTex.wrap_mode = WRAP_MODES.REPEAT;
                }
            }
            else {
                isSimple = baseTex.wrap_mode !== WRAP_MODES.CLAMP;
            }
        }

        const shader = isSimple ? this.simpleShader : this.shader;

        renderer.bind_shader(shader);

        const w = tex.width;
        const h = tex.height;
        const W = ts._width;
        const H = ts._height;

        temp_mat.set(lt.a * w / W,
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

        temp_mat.affine_inverse();
        if (isSimple) {
            temp_mat.prepend(uv.map_coord);
        }
        else {
            shader.uniforms.uMapCoord = uv.map_coord.to_array(true);
            shader.uniforms.u_clamp_frame = uv.u_clamp_frame;
            shader.uniforms.u_clamp_offset = uv.u_clamp_offset;
        }

        shader.uniforms.uTransform = temp_mat.to_array(true);
        shader.uniforms.u_color = premultiply_tint_to_rgba(ts.tint, ts.world_alpha,
            shader.uniforms.u_color, baseTex.premultiplied_alpha);
        shader.uniforms.translation_matrix = ts.transform.world_transform.to_array(true);

        shader.uniforms.u_sampler = renderer.bind_texture(tex);

        renderer.set_blend_mode(correct_blend_mode(ts.blend_mode, baseTex.premultiplied_alpha));

        quad.vao.draw(this.renderer.gl.TRIANGLES, 6, 0);
    }
}
