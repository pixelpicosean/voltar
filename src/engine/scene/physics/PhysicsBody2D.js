import { remove_items } from 'engine/dep/index';
import { Vector2 } from 'engine/math/index';
import CollisionObject2D from './CollisionObject2D';

export default class PhysicsBody2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'PhysicsBody2D';

        this.collision_exceptions = [];
    }

    add_collision_exception_with(body) {
        if (this.collision_exceptions.indexOf(body) < 0) {
            this.collision_exceptions.push(body);
            body.tree_exited.once(this._collision_exception_freed.bind(this, this.collision_exceptions.length - 1));
        }
    }

    _collision_exception_freed(idx) {
        remove_items(this.collision_exceptions, idx, 1);
    }
}
