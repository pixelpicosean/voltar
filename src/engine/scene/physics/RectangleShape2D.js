import { Vector2 } from 'engine/math/index';
import CollisionShape2D from './CollisionShape2D';
import { res_class_map } from 'engine/registry';

const tmp_point = new Vector2(0, 0);
const tmp_point2 = new Vector2(0, 0);

export default class RectangleShape2D extends CollisionShape2D {
    constructor(extent_x = 4, extent_y = 4) {
        super();

        this.position = new Vector2(0, 0);

        this.extents = new Vector2(extent_x, extent_y);
        this.vertices = [
            new Vector2(0, 0),    // top-left
            new Vector2(0, 0),    // bottom-left
            new Vector2(0, 0),    // bottom-right
            new Vector2(0, 0),    // top-right
        ];
        this.normals = [
            new Vector2(1, 0),    // right
            new Vector2(0, 1),    // down
        ];

        this.update_transform(tmp_point.set(0, 0), 0, tmp_point2.set(1, 1));
    }
    _load_data(data) {
        this.extents.copy(data.extents);
        if (data.position) {
            this.set_position(data.position);
        }
        return this;
    }
    /**
     * @param {import('engine/math/Vector2').Vector2Like|number} x
     * @param {number} [y]
     * @returns this
     */
    set_position(x, y) {
        if (y === undefined) {
            // @ts-ignore
            this.position.set(x.x, x.y);
        } else {
            // @ts-ignore
            this.position.set(x, y);
        }
        this.update_transform(tmp_point.set(0, 0), 0, tmp_point2.set(1, 1));
        return this;
    }
    update_transform(position, rotation, scale) {
        const c = Math.cos(rotation);
        const s = Math.sin(rotation);
        const w = this.extents.x;
        const h = this.extents.y;

        this.vertices[2].set((w * c - h * s) * scale.x, (w * s + h * c) * scale.y)
        this.vertices[3].set((w * c + h * s) * scale.x, (w * s - h * c) * scale.y)
        this.vertices[0].set((-w * c + h * s) * scale.x, (-w * s - h * c) * scale.y)
        this.vertices[1].set((-w * c - h * s) * scale.x, (-w * s + h * c) * scale.y)

        this.normals[0]
            .copy(this.vertices[2]).subtract(this.vertices[3])
            .perp()
            .normalize()
        this.normals[1]
            .copy(this.vertices[1]).subtract(this.vertices[2])
            .perp()
            .normalize()

        let min_x = Number.POSITIVE_INFINITY,
            min_y = Number.POSITIVE_INFINITY;
        let max_x = Number.NEGATIVE_INFINITY,
            max_y = Number.NEGATIVE_INFINITY;
        for (let vert of this.vertices) {
            min_x = Math.min(min_x, vert.x);
            max_x = Math.max(max_x, vert.x);

            min_y = Math.min(min_y, vert.y);
            max_y = Math.max(max_y, vert.y);
        }
        this.aabb.width = Math.round(max_x - min_x);
        this.aabb.height = Math.round(max_y - min_y);
        this.aabb.x = Math.round(position.x - this.aabb.width * 0.5);
        this.aabb.y = Math.round(position.y - this.aabb.height * 0.5);
    }
}

res_class_map['RectangleShape2D'] = RectangleShape2D;
