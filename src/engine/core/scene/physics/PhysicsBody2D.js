import remove_items from 'remove-array-items';
import CollisionObject2D from './CollisionObject2D';
import { Vector } from '../../math';


export default class PhysicsBody2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'PhysicsBody2D';

        this.collision_exceptions = [];
    }
    _collide_body(body, res) {
        return true;
    }
    _collide_map(res) {
        this.position.copy(res.position);
    }

    move(vec) {
        if (this.scene_tree) {
            let res = this.scene_tree.physics_server.test_node_against_map(this, vec);
            if (res) {
                this._collide_map(res);
            }
            else {
                this.position.add(vec);
            }
        }
        else {
            this.position.add(vec);
        }
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
