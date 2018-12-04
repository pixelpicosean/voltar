import CollisionObject2D, { CollisionObjectTypes } from './collision_object_2d';
import { node_class_map } from 'engine/registry';
import PhysicsServer from 'engine/servers/physics_2d/physics_server';
import { AreaSpaceOverrideMode } from 'engine/physics/const';
import { Vector2 } from 'engine/math/index';

export default class Area2D extends CollisionObject2D {
    get monitoring() {
        return this._monitoring;
    }
    /**
     * @param {boolean} value
     */
    set monitoring(value) {
        this._monitoring = value;

        if (this._monitoring) {
            // this.set_monitor_callback(this, this._body_inout);
            // this.set_area_monitor_callback(this, this._area_inout);
        }
    }
    /**
     * @param {boolean} value
     */
    set_monitoring(value) {
        this._monitoring = value;
        return this;
    }

    get monitorable() {
        return this._monitorable;
    }
    /**
     * @param {boolean} value
     */
    set monitorable(value) {
        this._monitorable = value;
    }
    /**
     * @param {boolean} value
     */
    set_monitorable(value) {
        this._monitorable = value;
        return this;
    }

    constructor() {
        super(PhysicsServer.singleton.area_create(), true);

        this.type = 'Area2D';

        this.space_override = AreaSpaceOverrideMode.DISABLED;
        this.gravity_vec = new Vector2();
        this.gravity = 9.0866;
        this.gravity_is_point = false;
        this.gravity_distance_scale = 0;
        this.linear_damp = 0;
        this.angular_damp = 0;
        this.collision_mask = 1;
        this.collision_layer = 1;
        this.priority = 0;
        this.monitoring = false;
        this.monitorable = false;
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

    call_queries() {
    }
}

node_class_map['Area2D'] = Area2D;
