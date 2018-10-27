import { remove_items } from 'engine/dep/index';
import CollisionObject2D, { CollisionObjectTypes } from './CollisionObject2D';
import { Vector2 } from 'engine/math/index';

export default class PhysicsBody2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'PhysicsBody2D';
        this.collision_object_type = CollisionObjectTypes.NONE;

        this.collision_exceptions = [];
        this.linear_velocity = new Vector2();
    }

    add_collision_exception_with(body) {
        if (this.collision_exceptions.indexOf(body) < 0) {
            this.collision_exceptions.push(body);
            body.tree_exited.once(this._collision_exception_freed.bind(this, body));
        }
    }

    _collision_exception_freed(body) {
        remove_items(this.collision_exceptions, this.collision_exceptions.indexOf(body), 1);
    }
}
