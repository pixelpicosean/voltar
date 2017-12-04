import Plane from './Plane';

const DEFAULT_BORDER_SIZE = 10;

/**
 * The NineSlicePlane allows you to stretch a texture using 9-slice scaling. The corners will remain unscaled (useful
 * for buttons with rounded corners for example) and the other areas will be scaled horizontally and or vertically
 *
 *```js
 * let Plane9 = new V.NineSlicePlane(V.Texture.from_image('BoxWithRoundedCorners.png'), 15, 15, 15, 15);
 *  ```
 * <pre>
 *      A                          B
 *    +---+----------------------+---+
 *  C | 1 |          2           | 3 |
 *    +---+----------------------+---+
 *    |   |                      |   |
 *    | 4 |          5           | 6 |
 *    |   |                      |   |
 *    +---+----------------------+---+
 *  D | 7 |          8           | 9 |
 *    +---+----------------------+---+

 *  When changing this objects width and/or height:
 *     areas 1 3 7 and 9 will remain unscaled.
 *     areas 2 and 8 will be stretched horizontally
 *     areas 4 and 6 will be stretched vertically
 *     area 5 will be stretched both horizontally and vertically
 * </pre>
 *
 * @class
 * @extends V.mesh.Plane
 * @memberof V.mesh
 *
 */
export default class NineSlicePlane extends Plane
{
    /**
     * @param {Texture|string} texture - The texture to use on the NineSlicePlane.
     * @param {number} [top_height=10] size of the top horizontal bar (C)
     * @param {number} [right_width=10] size of the right vertical bar (B)
     * @param {number} [bottom_height=10] size of the bottom horizontal bar (D)
     * @param {number} [left_width=10] size of the left vertical bar (A)
     */
    constructor(texture, top_height, right_width, bottom_height, left_width)
    {
        super(texture, 4, 4);

        this.type = 'NineSlicePlane';

        this._origWidth = texture.orig.width;
        this._origHeight = texture.orig.height;

        /**
         * The width of the NineSlicePlane, setting this will actually modify the vertices and UV's of this plane
         *
         * @member {number}
         * @memberof V.NineSlicePlane#
         * @override
         */
        this._width = this._origWidth;

        /**
         * The height of the NineSlicePlane, setting this will actually modify the vertices and UV's of this plane
         *
         * @member {number}
         * @memberof V.NineSlicePlane#
         * @override
         */
        this._height = this._origHeight;

        /**
         * The width of the left column (a)
         *
         * @member {number}
         * @memberof V.NineSlicePlane#
         * @override
         */
        this.left_width = typeof left_width !== 'undefined' ? left_width : DEFAULT_BORDER_SIZE;

        /**
         * The width of the right column (b)
         *
         * @member {number}
         * @memberof V.NineSlicePlane#
         * @override
         */
        this.right_width = typeof right_width !== 'undefined' ? right_width : DEFAULT_BORDER_SIZE;

        /**
         * The height of the top row (c)
         *
         * @member {number}
         * @memberof V.NineSlicePlane#
         * @override
         */
        this.top_height = typeof top_height !== 'undefined' ? top_height : DEFAULT_BORDER_SIZE;

        /**
         * The height of the bottom row (d)
         *
         * @member {number}
         * @memberof V.NineSlicePlane#
         * @override
         */
        this.bottom_height = typeof bottom_height !== 'undefined' ? bottom_height : DEFAULT_BORDER_SIZE;

        this.refresh(true);
    }

    /**
     * Updates the horizontal vertices.
     *
     */
    update_horizontal_vertices()
    {
        const vertices = this.vertices;

        vertices[9] = vertices[11] = vertices[13] = vertices[15] = this._top_height;
        vertices[17] = vertices[19] = vertices[21] = vertices[23] = this._height - this._bottom_height;
        vertices[25] = vertices[27] = vertices[29] = vertices[31] = this._height;
    }

    /**
     * Updates the vertical vertices.
     *
     */
    update_vertical_vertices()
    {
        const vertices = this.vertices;

        vertices[2] = vertices[10] = vertices[18] = vertices[26] = this._left_width;
        vertices[4] = vertices[12] = vertices[20] = vertices[28] = this._width - this._right_width;
        vertices[6] = vertices[14] = vertices[22] = vertices[30] = this._width;
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @private
     * @param {V.CanvasRenderer} renderer - The canvas renderer to render with.
     */
    _render_canvas(renderer)
    {
        const context = renderer.context;

        context.globalAlpha = this.world_alpha;

        const transform = this.world_transform;
        const res = renderer.resolution;

        if (renderer.pixel_snap)
        {
            context.setTransform(
                transform.a * res,
                transform.b * res,
                transform.c * res,
                transform.d * res,
                (transform.tx * res) | 0,
                (transform.ty * res) | 0
            );
        }
        else
        {
            context.setTransform(
                transform.a * res,
                transform.b * res,
                transform.c * res,
                transform.d * res,
                transform.tx * res,
                transform.ty * res
            );
        }

        const base = this._texture.base_texture;
        const textureSource = base.source;
        const w = base.width * base.resolution;
        const h = base.height * base.resolution;

        this.draw_segment(context, textureSource, w, h, 0, 1, 10, 11);
        this.draw_segment(context, textureSource, w, h, 2, 3, 12, 13);
        this.draw_segment(context, textureSource, w, h, 4, 5, 14, 15);
        this.draw_segment(context, textureSource, w, h, 8, 9, 18, 19);
        this.draw_segment(context, textureSource, w, h, 10, 11, 20, 21);
        this.draw_segment(context, textureSource, w, h, 12, 13, 22, 23);
        this.draw_segment(context, textureSource, w, h, 16, 17, 26, 27);
        this.draw_segment(context, textureSource, w, h, 18, 19, 28, 29);
        this.draw_segment(context, textureSource, w, h, 20, 21, 30, 31);
    }

    /**
     * Renders one segment of the plane.
     * to mimic the exact drawing behavior of stretching the image like WebGL does, we need to make sure
     * that the source area is at least 1 pixel in size, otherwise nothing gets drawn when a slice size of 0 is used.
     *
     * @private
     * @param {CanvasRenderingContext2D} context - The context to draw with.
     * @param {CanvasImageSource} textureSource - The source to draw.
     * @param {number} w - width of the texture
     * @param {number} h - height of the texture
     * @param {number} x1 - x index 1
     * @param {number} y1 - y index 1
     * @param {number} x2 - x index 2
     * @param {number} y2 - y index 2
     */
    draw_segment(context, textureSource, w, h, x1, y1, x2, y2)
    {
        // otherwise you get weird results when using slices of that are 0 wide or high.
        const uvs = this.uvs;
        const vertices = this.vertices;

        let sw = (uvs[x2] - uvs[x1]) * w;
        let sh = (uvs[y2] - uvs[y1]) * h;
        let dw = vertices[x2] - vertices[x1];
        let dh = vertices[y2] - vertices[y1];

        // make sure the source is at least 1 pixel wide and high, otherwise nothing will be drawn.
        if (sw < 1)
        {
            sw = 1;
        }

        if (sh < 1)
        {
            sh = 1;
        }

        // make sure destination is at least 1 pixel wide and high, otherwise you get
        // lines when rendering close to original size.
        if (dw < 1)
        {
            dw = 1;
        }

        if (dh < 1)
        {
            dh = 1;
        }

        context.drawImage(textureSource, uvs[x1] * w, uvs[y1] * h, sw, sh, vertices[x1], vertices[y1], dw, dh);
    }

    /**
     * The width of the NineSlicePlane, setting this will actually modify the vertices and UV's of this plane
     *
     * @member {number}
     */
    get width()
    {
        return this._width;
    }

    set width(value) // eslint-disable-line require-jsdoc
    {
        this._width = value;
        this._refresh();
    }

    /**
     * The height of the NineSlicePlane, setting this will actually modify the vertices and UV's of this plane
     *
     * @member {number}
     */
    get height()
    {
        return this._height;
    }

    set height(value) // eslint-disable-line require-jsdoc
    {
        this._height = value;
        this._refresh();
    }

    /**
     * The width of the left column
     *
     * @member {number}
     */
    get left_width()
    {
        return this._left_width;
    }

    set left_width(value) // eslint-disable-line require-jsdoc
    {
        this._left_width = value;
        this._refresh();
    }

    /**
     * The width of the right column
     *
     * @member {number}
     */
    get right_width()
    {
        return this._right_width;
    }

    set right_width(value) // eslint-disable-line require-jsdoc
    {
        this._right_width = value;
        this._refresh();
    }

    /**
     * The height of the top row
     *
     * @member {number}
     */
    get top_height()
    {
        return this._top_height;
    }

    set top_height(value) // eslint-disable-line require-jsdoc
    {
        this._top_height = value;
        this._refresh();
    }

    /**
     * The height of the bottom row
     *
     * @member {number}
     */
    get bottom_height()
    {
        return this._bottom_height;
    }

    set bottom_height(value) // eslint-disable-line require-jsdoc
    {
        this._bottom_height = value;
        this._refresh();
    }

    /**
     * Refreshes NineSlicePlane coords. All of them.
     */
    _refresh()
    {
        super._refresh();

        const uvs = this.uvs;
        const texture = this._texture;

        this._origWidth = texture.orig.width;
        this._origHeight = texture.orig.height;

        const _uvw = 1.0 / this._origWidth;
        const _uvh = 1.0 / this._origHeight;

        uvs[0] = uvs[8] = uvs[16] = uvs[24] = 0;
        uvs[1] = uvs[3] = uvs[5] = uvs[7] = 0;
        uvs[6] = uvs[14] = uvs[22] = uvs[30] = 1;
        uvs[25] = uvs[27] = uvs[29] = uvs[31] = 1;

        uvs[2] = uvs[10] = uvs[18] = uvs[26] = _uvw * this._left_width;
        uvs[4] = uvs[12] = uvs[20] = uvs[28] = 1 - (_uvw * this._right_width);
        uvs[9] = uvs[11] = uvs[13] = uvs[15] = _uvh * this._top_height;
        uvs[17] = uvs[19] = uvs[21] = uvs[23] = 1 - (_uvh * this._bottom_height);

        this.update_horizontal_vertices();
        this.update_vertical_vertices();

        this.dirty++;

        this.multiply_uvs();
    }
}
