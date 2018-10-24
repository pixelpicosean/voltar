import { Vector2 } from 'engine/math/index';
import CollisionShape2D from './CollisionShape2D';

const tmp_point = new Vector2(0, 0);
const tmp_point2 = new Vector2(0, 0);

export default class RectangleShape2D extends CollisionShape2D {
    constructor(extent_x = 4, extent_y = 4) {
        super();

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
    update_transform(position, rotation, scale) {
        const c = Math.cos(rotation);
        const s = Math.sin(rotation);
        const w = this.extents.x;
        const h = this.extents.y;

        this.vertices[2].set(w * c + h * s, h * c - w * s).multiply(scale);
        this.vertices[3].set(w * c - h * s, -h * c - w * s).multiply(scale);
        this.vertices[0].set(-w * c - h * s, -h * c + w * s).multiply(scale);
        this.vertices[1].set(-w * c + h * s, h * c + w * s).multiply(scale);

        this.normals[0]
            .copy(this.vertices[3]).subtract(this.vertices[2])
            .perp()
            .normalize()
        this.normals[1]
            .copy(this.vertices[2]).subtract(this.vertices[1])
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
