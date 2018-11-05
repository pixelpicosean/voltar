import CollisionObject2D, { CollisionObjectTypes } from './CollisionObject2D';
import { node_class_map } from 'engine/registry';
import { Vector2 } from 'engine/math/index';

export default class Area2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'Area2D';

        this.collision_object_type = CollisionObjectTypes.AREA;

        this.gravity_point = false;
        this.gravity_distance_scale = 0;
        this.gravity_vec = new Vector2();
        this.gravity = 0;
        this.linear_damp = 0.1;
        this.angular_damp = 1;

        this.touched_areas = [];
        this.prev_touched_areas = [];

        this.touched_bodies = [];
        this.prev_touched_bodies = [];
    }
    _load_data(data) {
        super._load_data(data);

        if (data.gravity_point !== undefined) {
            this.gravity_point = data.gravity_point;
        }
        if (data.gravity_distance_scale !== undefined) {
            this.gravity_distance_scale = data.gravity_distance_scale;
        }
        if (data.gravity !== undefined) {
            this.gravity = data.gravity;
        }
        if (data.linear_damp !== undefined) {
            this.linear_damp = data.linear_damp;
        }
        if (data.angular_damp !== undefined) {
            this.angular_damp = data.angular_damp;
        }
        if (data.gravity_vec !== undefined) {
            this.gravity_vec.copy(data.gravity_vec);
        }

        return this;
    }

    _area_inout(is_in, area) {
        if (is_in) {
            this.emit_signal('area_entered', area);
        } else {
            this.emit_signal('area_exited', area);
        }
    }
    _body_inout(is_in, body) {
        if (is_in) {
            this.emit_signal('body_entered', body);
        } else {
            this.emit_signal('body_exited', body);
        }
    }
}

node_class_map['Area2D'] = Area2D;
