import CollisionObject2D, { CollisionObjectTypes } from './CollisionObject2D';

export default class RigidBody2D extends CollisionObject2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.RIGID;
    }
}
