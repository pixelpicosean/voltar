import { Point, Polygon } from '../../math';
import settings from '../../settings';
import Texture from '../../textures/Texture';
import TextureMatrix from '../../textures/TextureMatrix';
import { BLEND_MODES } from '../../const';
import * as utils from '../../utils';
import Node2D from '../Node2D';

const tempPoint = new Point();
const tempPolygon = new Polygon();

/**
 * Base mesh class
 * @class
 * @extends v.Node2D
 * @memberof v.mesh
 */
export default class Mesh extends Node2D
{
    /**
     * @param {v.Texture} texture - The texture to use
     * @param {Float32Array} [vertices] - if you want to specify the vertices
     * @param {Float32Array} [uvs] - if you want to specify the uvs
     * @param {Uint16Array} [indices] - if you want to specify the indices
     * @param {number} [draw_mode] - the draw_mode, can be any of the Mesh.DRAW_MODES consts
     */
    constructor(texture, vertices, uvs, indices, draw_mode)
    {
        super();

        this.type = 'Mesh';

        /**
         * The texture of the Mesh
         *
         * @member {Texture}
         * @private
         */
        this._texture = texture || Texture.EMPTY;

        /**
         * The Uvs of the Mesh
         *
         * @member {Float32Array}
         */
        this.uvs = uvs || new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1]);

        /**
         * An array of vertices
         *
         * @member {Float32Array}
         */
        this.vertices = vertices || new Float32Array([
            0, 0,
            100, 0,
            100, 100,
            0, 100]);

        /**
         * An array containing the indices of the vertices
         *
         * @member {Uint16Array}
         */
        //  TODO auto generate this based on draw mode!
        this.indices = indices || new Uint16Array([0, 1, 3, 2]);

        /**
         * Version of mesh uvs are dirty or not
         *
         * @member {number}
         */
        this.dirty = 0;

        /**
         * Version of mesh indices
         *
         * @member {number}
         */
        this.index_dirty = 0;

        /**
         * Version of mesh verticies array
         *
         * @member {number}
         */
        this.vertex_dirty = 0;

        /**
         * For backwards compatibility the default is to re-upload verticies each render call.
         * Set this to `false` and increase `vertex_dirty` to manually re-upload the buffer.
         *
         * @member {boolean}
         */
        this.auto_update = true;

        /**
         * The blend mode to be applied to the sprite. Set to `v.BLEND_MODES.NORMAL` to remove
         * any blend mode.
         *
         * @member {number}
         * @default V.BLEND_MODES.NORMAL
         * @see v.BLEND_MODES
         */
        this.blend_mode = BLEND_MODES.NORMAL;

        /**
         * Triangles in canvas mode are automatically antialiased, use this value to force triangles
         * to overlap a bit with each other.
         *
         * @member {number}
         */
        this.canvas_padding = settings.MESH_CANVAS_PADDING;

        /**
         * The way the Mesh should be drawn, can be any of the {@link V.mesh.Mesh.DRAW_MODES} consts
         *
         * @member {number}
         * @see V.mesh.Mesh.DRAW_MODES
         */
        this.draw_mode = draw_mode || Mesh.DRAW_MODES.TRIANGLE_MESH;

        /**
         * The default shader that is used if a mesh doesn't have a more specific one.
         *
         * @member {V.Shader}
         */
        this.shader = null;

        /**
         * The tint applied to the mesh. This is a [r,g,b] value. A value of [1,1,1] will remove any
         * tint effect.
         *
         * @member {number}
         */
        this.tint_rgb = new Float32Array([1, 1, 1]);

        /**
         * A map of renderer IDs to webgl render data
         *
         * @private
         * @member {object<number, object>}
         */
        this._glDatas = {};

        /**
         * transform that is applied to UV to get the texture coords
         * its updated independently from texture uv_transform
         * updates of uvs are tied to that thing
         *
         * @member {V.extras.TextureMatrix}
         * @private
         */
        this._uv_transform = new TextureMatrix(this._texture);

        /**
         * whether or not upload uv_transform to shader
         * if its false, then uvs should be pre-multiplied
         * if you change it for generated mesh, please call 'refresh(true)'
         * @member {boolean}
         * @default false
         */
        this.upload_uv_transform = false;

        /**
         * Plugin that is responsible for rendering this element.
         * Allows to customize the rendering process without overriding '_render_webgl' & '_render_canvas' methods.
         * @member {string}
         * @default 'mesh'
         */
        this.renderer_plugin = 'mesh';
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {V.WebGLRenderer} renderer - a reference to the WebGL renderer
     */
    _render_webgl(renderer)
    {
        this.refresh();
        renderer.set_object_renderer(renderer.plugins[this.renderer_plugin]);
        renderer.plugins[this.renderer_plugin].render(this);
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @private
     * @param {V.CanvasRenderer} renderer - The canvas renderer.
     */
    _render_canvas(renderer)
    {
        this.refresh();
        renderer.plugins[this.renderer_plugin].render(this);
    }

    /**
     * When the texture is updated, this event will fire to update the scale and frame
     *
     * @private
     */
    _on_texture_update()
    {
        this._uv_transform.texture = this._texture;
        this.refresh();
    }

    /**
     * multiplies uvs only if upload_uv_transform is false
     * call it after you change uvs manually
     * make sure that texture is valid
     */
    multiply_uvs()
    {
        if (!this.upload_uv_transform)
        {
            this._uv_transform.multiply_uvs(this.uvs);
        }
    }

    /**
     * Refreshes uvs for generated meshes (rope, plane)
     * sometimes refreshes vertices too
     *
     * @param {boolean} [forceUpdate=false] if true, matrices will be updated any case
     */
    refresh(forceUpdate)
    {
        if (this.auto_update)
        {
            this.vertex_dirty++;
        }
        if (this._uv_transform.update(forceUpdate))
        {
            this._refresh();
        }
    }

    /**
     * re-calculates mesh coords
     * @protected
     */
    _refresh()
    {
        /* empty */
    }

    /**
     * Returns the bounds of the mesh as a rectangle. The bounds calculation takes the world_transform into account.
     *
     */
    _calculate_bounds()
    {
        // TODO - we can cache local bounds and use them if they are dirty (like graphics)
        this._bounds.add_vertices(this.transform, this.vertices, 0, this.vertices.length);
    }

    /**
     * Tests if a point is inside this mesh. Works only for TRIANGLE_MESH
     *
     * @param {V.Point} point - the point to test
     * @return {boolean} the result of the test
     */
    contains_point(point)
    {
        if (!this.get_bounds().contains(point.x, point.y))
        {
            return false;
        }

        this.world_transform.apply_inverse(point, tempPoint);

        const vertices = this.vertices;
        const points = tempPolygon.points;
        const indices = this.indices;
        const len = this.indices.length;
        const step = this.draw_mode === Mesh.DRAW_MODES.TRIANGLES ? 3 : 1;

        for (let i = 0; i + 2 < len; i += step)
        {
            const ind0 = indices[i] * 2;
            const ind1 = indices[i + 1] * 2;
            const ind2 = indices[i + 2] * 2;

            points[0] = vertices[ind0];
            points[1] = vertices[ind0 + 1];
            points[2] = vertices[ind1];
            points[3] = vertices[ind1 + 1];
            points[4] = vertices[ind2];
            points[5] = vertices[ind2 + 1];

            if (tempPolygon.contains(tempPoint.x, tempPoint.y))
            {
                return true;
            }
        }

        return false;
    }

    /**
     * The texture that the mesh uses.
     *
     * @member {V.Texture}
     */
    get texture()
    {
        return this._texture;
    }

    set texture(value) // eslint-disable-line require-jsdoc
    {
        if (this._texture === value)
        {
            return;
        }

        this._texture = value;

        if (value)
        {
            // wait for the texture to load
            if (value.base_texture.has_loaded)
            {
                this._on_texture_update();
            }
            else
            {
                value.once('update', this._on_texture_update, this);
            }
        }
    }

    /**
     * The tint applied to the mesh. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
     *
     * @member {number}
     * @default 0xFFFFFF
     */
    get tint()
    {
        return utils.rgb2hex(this.tint_rgb);
    }

    set tint(value) // eslint-disable-line require-jsdoc
    {
        this.tint_rgb = utils.hex2rgb(value, this.tint_rgb);
    }

    /**
     * Destroys the Mesh object.
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all
     *  options have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have
     *  their destroy method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the texture of the child sprite
     * @param {boolean} [options.baseTexture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the base texture of the child sprite
     */
    destroy(options) {
        // for each webgl data entry, destroy the WebGLGraphicsData
        for (const id in this._glDatas) {
            const data = this._glDatas[id];

            if (data.destroy) {
                data.destroy();
            }
            else {
                if (data.vertexBuffer) {
                    data.vertexBuffer.destroy();
                    data.vertexBuffer = null;
                }
                if (data.index_buffer) {
                    data.index_buffer.destroy();
                    data.index_buffer = null;
                }
                if (data.uvBuffer) {
                    data.uvBuffer.destroy();
                    data.uvBuffer = null;
                }
                if (data.vao) {
                    data.vao.destroy();
                    data.vao = null;
                }
            }
        }

        this._glDatas = null;

        super.destroy(options);
    }
}

/**
 * Different drawing buffer modes supported
 *
 * @static
 * @constant
 * @type {object}
 * @property {number} TRIANGLE_MESH
 * @property {number} TRIANGLES
 */
Mesh.DRAW_MODES = {
    TRIANGLE_MESH: 0,
    TRIANGLES: 1,
};
