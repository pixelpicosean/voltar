import { Matrix } from '../../../math';
import ObjectRenderer from '../../../renderers/webgl/ObjectRenderer';
import WebGLRenderer from '../../../renderers/webgl/WebGLRenderer';
import Shader from '../../../Shader';
import * as utils from '../../../utils';
import glCore from 'pixi-gl-core';
import Mesh from '../Mesh';

const matrixIdentity = Matrix.IDENTITY;

/**
 * WebGL renderer plugin for tiling sprites
 *
 * @class
 * @memberof V
 * @extends V.ObjectRenderer
 */
export default class MeshRenderer extends ObjectRenderer
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
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    onContextChange()
    {
        const gl = this.renderer.gl;

        this.shader = new Shader(gl,
            require('./mesh.vert'),
            require('./mesh.frag'));
    }

    /**
     * renders mesh
     *
     * @param {V.mesh.Mesh} mesh mesh instance
     */
    render(mesh)
    {
        const renderer = this.renderer;
        const gl = renderer.gl;
        const texture = mesh._texture;

        if (!texture.valid)
        {
            return;
        }

        let glData = mesh._glDatas[renderer.CONTEXT_UID];

        if (!glData)
        {
            renderer.bindVao(null);

            glData = {
                shader: this.shader,
                vertexBuffer: glCore.GLBuffer.createVertexBuffer(gl, mesh.vertices, gl.STREAM_DRAW),
                uvBuffer: glCore.GLBuffer.createVertexBuffer(gl, mesh.uvs, gl.STREAM_DRAW),
                indexBuffer: glCore.GLBuffer.createIndexBuffer(gl, mesh.indices, gl.STATIC_DRAW),
                // build the vao object that will render..
                vao: null,
                dirty: mesh.dirty,
                index_dirty: mesh.index_dirty,
            };

            // build the vao object that will render..
            glData.vao = new glCore.VertexArrayObject(gl)
                .addIndex(glData.indexBuffer)
                .addAttribute(glData.vertexBuffer, glData.shader.attributes.aVertexPosition, gl.FLOAT, false, 2 * 4, 0)
                .addAttribute(glData.uvBuffer, glData.shader.attributes.aTextureCoord, gl.FLOAT, false, 2 * 4, 0);

            mesh._glDatas[renderer.CONTEXT_UID] = glData;
        }

        renderer.bindVao(glData.vao);

        if (mesh.dirty !== glData.dirty)
        {
            glData.dirty = mesh.dirty;
            glData.uvBuffer.upload(mesh.uvs);
        }

        if (mesh.index_dirty !== glData.index_dirty)
        {
            glData.index_dirty = mesh.index_dirty;
            glData.indexBuffer.upload(mesh.indices);
        }

        glData.vertexBuffer.upload(mesh.vertices);

        renderer.bindShader(glData.shader);

        glData.shader.uniforms.uSampler = renderer.bindTexture(texture);

        renderer.state.setBlendMode(utils.correctBlendMode(mesh.blend_mode, texture.base_texture.premultipliedAlpha));

        if (glData.shader.uniforms.uTransform)
        {
            if (mesh.upload_uv_transform)
            {
                glData.shader.uniforms.uTransform = mesh._uv_transform.mapCoord.toArray(true);
            }
            else
            {
                glData.shader.uniforms.uTransform = matrixIdentity.toArray(true);
            }
        }
        glData.shader.uniforms.translationMatrix = mesh.world_transform.toArray(true);

        glData.shader.uniforms.uColor = utils.premultiplyRgba(mesh.tint_rgb,
            mesh.world_alpha, glData.shader.uniforms.uColor, texture.base_texture.premultipliedAlpha);

        const draw_mode = mesh.draw_mode === Mesh.DRAW_MODES.TRIANGLE_MESH ? gl.TRIANGLE_STRIP : gl.TRIANGLES;

        glData.vao.draw(draw_mode, mesh.indices.length, 0);
    }
}

WebGLRenderer.registerPlugin('mesh', MeshRenderer);
