import { CollisionObjectTypes } from './CollisionObject2D';
import PhysicsBody2D from './PhysicsBody2D';

export default class KinematicBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.KINEMATIC;
    }
}
