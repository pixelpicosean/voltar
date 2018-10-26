import { CollisionObjectTypes } from './CollisionObject2D';
import PhysicsBody2D from './PhysicsBody2D';

export default class StaticBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.STATIC;
    }
}
