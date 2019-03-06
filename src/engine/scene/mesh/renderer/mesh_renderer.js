import { Matrix } from 'engine/core/math/index';
import GLBuffer from 'engine/drivers/webgl/gl_buffer';
import GLShader from 'engine/drivers/webgl/gl_shader';
import VertexArrayObject from 'engine/drivers/webgl/vao';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import ObjectRenderer from 'engine/servers/visual/utils/object_renderer';

import { correct_blend_mode, premultiply_rgba } from 'engine/utils/index';

import Mesh from '../mesh';

import Vert from './mesh.vert';
import Frag from './mesh.frag';

const matrix_identity_array = Matrix.new().to_array(true);

/**
 * WebGL renderer plugin for tiling sprites
 */
export default class MeshRenderer extends ObjectRenderer {
    /**
     * constructor for renderer
     *
     * @param {WebGLRenderer} renderer The renderer this tiling awesomeness works for.
     */
    constructor(renderer) {
        super(renderer);

        this.shader = null;
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    on_context_change() {
        const gl = this.renderer.gl;

        this.shader = new GLShader(gl, Vert, Frag);
    }

    /**
     * renders mesh
     *
     * @param {Mesh} mesh mesh instance
     */
    render(mesh) {
        const renderer = this.renderer;
        const gl = renderer.gl;
        const texture = mesh._texture;

        if (!texture.valid) {
            return;
        }

        let gl_data = mesh._gl_datas[renderer.CONTEXT_UID];

        if (!gl_data) {
            renderer.bind_vao(null);

            gl_data = {
                shader: this.shader,
                vertexBuffer: GLBuffer.create_vertex_buffer(gl, mesh.vertices, gl.STREAM_DRAW),
                uvBuffer: GLBuffer.create_vertex_buffer(gl, mesh.uvs, gl.STREAM_DRAW),
                index_buffer: GLBuffer.create_index_buffer(gl, mesh.indices, gl.STATIC_DRAW),
                // build the vao object that will render..
                vao: null,
                dirty: mesh.dirty,
                index_dirty: mesh.index_dirty,
                vertex_dirty: mesh.vertex_dirty,
            };

            // build the vao object that will render..
            gl_data.vao = new VertexArrayObject(gl)
                .add_index(gl_data.index_buffer)
                .add_attribute(gl_data.vertexBuffer, gl_data.shader.attributes.a_vertex_position, gl.FLOAT, false, 2 * 4, 0)
                .add_attribute(gl_data.uvBuffer, gl_data.shader.attributes.a_texture_coord, gl.FLOAT, false, 2 * 4, 0);

            mesh._gl_datas[renderer.CONTEXT_UID] = gl_data;
        }

        renderer.bind_vao(gl_data.vao);

        if (mesh.dirty !== gl_data.dirty) {
            gl_data.dirty = mesh.dirty;
            gl_data.uvBuffer.upload(mesh.uvs);
        }

        if (mesh.index_dirty !== gl_data.index_dirty) {
            gl_data.index_dirty = mesh.index_dirty;
            gl_data.index_buffer.upload(mesh.indices);
        }

        if (mesh.vertex_dirty !== gl_data.vertex_dirty) {
            gl_data.vertex_dirty = mesh.vertex_dirty;
            gl_data.vertexBuffer.upload(mesh.vertices);
        }

        renderer.bind_shader(gl_data.shader);

        gl_data.shader.uniforms.u_sampler = renderer.bind_texture(texture);

        renderer.state.set_blend_mode(correct_blend_mode(mesh.blend_mode, texture.base_texture.premultiplied_alpha));

        if (gl_data.shader.uniforms.uTransform) {
            if (mesh.upload_uv_transform) {
                gl_data.shader.uniforms.uTransform = mesh._uv_transform.map_coord.to_array(true);
            }
            else {
                gl_data.shader.uniforms.uTransform = matrix_identity_array;
            }
        }
        gl_data.shader.uniforms.translation_matrix = mesh.world_transform.to_array(true);

        gl_data.shader.uniforms.u_color = premultiply_rgba(mesh.tint_rgb,
            mesh.world_alpha, gl_data.shader.uniforms.u_color, texture.base_texture.premultiplied_alpha);

        const draw_mode = mesh.draw_mode === Mesh.DRAW_MODES.TRIANGLE_MESH ? gl.TRIANGLE_STRIP : gl.TRIANGLES;

        gl_data.vao.draw(draw_mode, mesh.indices.length, 0);
    }
}
