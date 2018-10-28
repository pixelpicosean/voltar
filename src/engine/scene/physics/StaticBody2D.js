import { CollisionObjectTypes } from './CollisionObject2D';
import PhysicsBody2D from './PhysicsBody2D';
import { node_class_map } from 'engine/registry';

export default class StaticBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.STATIC;
    }
}

node_class_map['StaticBody2D'] = StaticBody2D;
