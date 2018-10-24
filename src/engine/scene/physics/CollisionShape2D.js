import { Vector2, Rectangle } from 'engine/math/index';
import Node2D from '../Node2D';

let uid = 0;

export default class CollisionShape2D {
    constructor() {
        this.id = uid++;

        this.disabled = false;
        this.one_way_collision = false;
        this.is_inside_tree = false;

        this.aabb = new Rectangle();

        /**
         * @type {Node2D}
         */
        this.owner = null;

        /**
         * @type {Vector2[]}
         */
        this.vertices = null;

        /**
         * @type {Vector2[]}
         */
        this.normals = null;
    }

    /**
     * @param {Vector2} position
     * @param {number} rotation
     * @param {Vector2} scale
     */
    update_transform(position, rotation, scale) { }
}
