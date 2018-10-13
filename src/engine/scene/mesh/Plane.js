import Mesh from './Mesh';

/**
 * The Plane allows you to draw a texture across several points and them manipulate these points
 *
 *```js
 * for (let i = 0; i < 20; i++) {
 *     points.push(new Point(i * 50, 0));
 * };
 * let Plane = new Plane(Texture.from_image("snake.png"), points);
 *  ```
 *
 * @class
 * @extends Mesh
 *
 */
export default class Plane extends Mesh
{
    /**
     * @param {Texture} texture - The texture to use on the Plane.
     * @param {number} [vertices_x=10] - The number of vertices in the x-axis
     * @param {number} [vertices_y=10] - The number of vertices in the y-axis
     */
    constructor(texture, vertices_x, vertices_y)
    {
        super(texture);

        this.type = 'Plane';

        /**
         * Tracker for if the Plane is ready to be drawn. Needed because Mesh ctor can
         * call _onTextureUpdated which could call refresh too early.
         *
         * @member {boolean}
         * @private
         */
        this._ready_to_draw = true;

        this.vertices_x = vertices_x || 10;
        this.vertices_y = vertices_y || 10;

        this.draw_mode = Mesh.DRAW_MODES.TRIANGLES;
        this.refresh();
    }

    /**
     * Refreshes plane coordinates
     *
     */
    _refresh()
    {
        const texture = this._texture;
        const total = this.vertices_x * this.vertices_y;
        const verts = [];
        const colors = [];
        const uvs = [];
        const indices = [];

        const segmentsX = this.vertices_x - 1;
        const segmentsY = this.vertices_y - 1;

        const sizeX = texture.width / segmentsX;
        const sizeY = texture.height / segmentsY;

        for (let i = 0; i < total; i++)
        {
            const x = (i % this.vertices_x);
            const y = ((i / this.vertices_x) | 0);

            verts.push(x * sizeX, y * sizeY);

            uvs.push(x / segmentsX, y / segmentsY);
        }

        //  cons

        const totalSub = segmentsX * segmentsY;

        for (let i = 0; i < totalSub; i++)
        {
            const xpos = i % segmentsX;
            const ypos = (i / segmentsX) | 0;

            const value = (ypos * this.vertices_x) + xpos;
            const value2 = (ypos * this.vertices_x) + xpos + 1;
            const value3 = ((ypos + 1) * this.vertices_x) + xpos;
            const value4 = ((ypos + 1) * this.vertices_x) + xpos + 1;

            indices.push(value, value2, value3);
            indices.push(value2, value4, value3);
        }

        // console.log(indices)
        this.vertices = new Float32Array(verts);
        this.uvs = new Float32Array(uvs);
        this.colors = new Float32Array(colors);
        this.indices = new Uint16Array(indices);

        this.dirty++;
        this.index_dirty++;

        this.multiply_uvs();
    }

    /**
     * Clear texture UVs when new texture is set
     *
     * @private
     */
    _on_texture_update()
    {
        Mesh.prototype._on_texture_update.call(this);

        // wait for the Plane ctor to finish before calling refresh
        if (this._ready_to_draw)
        {
            this.refresh();
        }
    }

}
