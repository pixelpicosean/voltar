import removeItems from 'remove-array-items';
import CollisionObject2D from './CollisionObject2D';


export default class PhysicsBody2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'PhysicsBody2D';

        this.collision_exceptions = [];
    }
    _collide(body, res) {
        return true;
    }

    move(vec) {
        if (this.scene_tree) {
            let res = this.scene_tree.physics_server.trace_node(this, vec);
            if (res) {
                this.position.x = res.pos.x + this._shape.extents.x * this._world_scale.x;
                this.position.y = res.pos.y + this._shape.extents.y * this._world_scale.y;
            }
            else {
                this.position.x += vec.x;
                this.position.y += vec.y;
            }
        }
    }

    add_collision_exception_with(body) {
        if (this.collision_exceptions.indexOf(body) < 0) {
            this.collision_exceptions.push(body);
            body.tree_exited.once(this._collision_exception_freed.bind(this, this.collision_exceptions.length - 1));
        }
    }

    _collision_exception_freed(idx) {
        removeItems(this.collision_exceptions, idx, 1);
    }
}
