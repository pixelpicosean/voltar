import CollisionObject2D, { CollisionObjectTypes } from './CollisionObject2D';
import { Signal } from 'engine/dep/index';
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

        this.area_entered = new Signal();
        this.area_exited = new Signal();
        this.body_entered = new Signal();
        this.body_exited = new Signal();
    }
    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                case 'gravity_point':
                case 'gravity_distance_scale':
                case 'gravity':
                case 'linear_damp':
                case 'angular_damp': {
                    this[k] = data[k];
                } break;
                case 'gravity_vec': {
                    this[k].copy(data[k]);
                } break;
            }
        }

        return this;
    }

    _area_inout(is_in, area) {
        if (is_in) {
            this.area_entered.dispatch(area);
        } else {
            this.area_exited.dispatch(area);
        }
    }
    _body_inout(is_in, body) {
        if (is_in) {
            this.body_entered.dispatch(body);
        } else {
            this.body_exited.dispatch(body);
        }
    }
}

node_class_map['Area2D'] = Area2D;
