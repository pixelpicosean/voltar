import { CollisionObjectTypes } from './CollisionObject2D';
import PhysicsBody2D from './PhysicsBody2D';
import { node_class_map } from 'engine/registry';
import { Vector2 } from 'engine/math/index';

export default class StaticBody2D extends PhysicsBody2D {
    get linear_velocity() {
        return this.constant_linear_velocity;
    }
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.STATIC;

        this.constant_linear_velocity = new Vector2();
        this.constant_angular_velocity = 0;
    }
    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                case 'constant_linear_velocity': {
                    this.constant_linear_velocity.copy(data[k]);
                } break;
                case 'constant_angular_velocity': {
                    this[k] = data[k];
                } break;
            }
        }

        return this;
    }
}

node_class_map['StaticBody2D'] = StaticBody2D;
