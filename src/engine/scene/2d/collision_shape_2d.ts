import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Rect2 } from "engine/core/math/rect2";

import { Shape2D } from "../resources/shape_2d";
import {
    NOTIFICATION_PARENTED,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_UNPARENTED,
} from "../main/node";

import {
    NOTIFICATION_LOCAL_TRANSFORM_CHANGED,
} from "./canvas_item";
import { Node2D } from "./node_2d";

type CollisionObject2D = import('./collision_object_2d').CollisionObject2D;


export class CollisionShape2D extends Node2D {
    get class() { return "CollisionShape2D" }

    shape: Shape2D = null;
    disabled = false;
    one_way_collision = false;
    one_way_collision_margin = 1.0;
    parent: CollisionObject2D = null;
    rect = new Rect2(-10, -10, 20, 20);

    shape_owner: Node2D = null;

    /* virtual */

    _load_data(p_data: any) {
        super._load_data(p_data);

        if (p_data.shape !== undefined) {
            this.set_shape(p_data.shape);
        }
        if (p_data.disabled !== undefined) {
            this.set_disabled(p_data.disabled);
        }
        if (p_data.one_way_collision !== undefined) {
            this.set_one_way_collision(p_data.one_way_collision);
        }
        if (p_data.one_way_collision_margin !== undefined) {
            this.set_one_way_collision_margin(p_data.one_way_collision_margin);
        }

        return this;
    }

    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_PARENTED: {
                this.parent = this.get_parent() as CollisionObject2D;
                if (this.parent.is_collision_object) {
                    // owner is also self
                    this.shape_owner = this.parent.create_shape_owner(this);
                    if (this.shape) {
                        this.parent.shape_owner_add_shape(this.shape_owner, this.shape);
                    }
                    this._update_in_shape_owner();
                } else {
                    this.parent = null;
                }
            } break;
            case NOTIFICATION_ENTER_TREE: {
                if (this.parent) {
                    this._update_in_shape_owner();
                }
            } break;
            case NOTIFICATION_LOCAL_TRANSFORM_CHANGED: {
                if (this.parent) {
                    this._update_in_shape_owner(true);
                }
            } break;
            case NOTIFICATION_UNPARENTED: {
                if (this.parent) {
                    this.parent.remove_shape_owner(this);
                }
                this.shape_owner = null;
                this.parent = null;
            } break;
        }
    }

    /* public */

    set_shape(p_shape: Shape2D) {
        this.shape = p_shape;
        this.update();
        if (this.parent) {
            this.parent.shape_owner_clear_shapes(this.shape_owner);
            if (this.shape) {
                this.parent.shape_owner_add_shape(this.shape_owner, this.shape);
            }
        }
    }

    set_disabled(p_disabled: boolean) {
        this.disabled = p_disabled;
        this.update();
        if (this.parent) {
            this.parent.shape_owner_set_disabled(this.shape_owner, p_disabled);
        }
    }

    set_one_way_collision(p_one_way_collision: boolean) {
        this.one_way_collision = p_one_way_collision;
        this.update();
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision(this.shape_owner, p_one_way_collision);
        }
    }

    set_one_way_collision_margin(p_one_way_collision_margin: number) {
        this.one_way_collision_margin = p_one_way_collision_margin;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision_margin(this.shape_owner, p_one_way_collision_margin);
        }
    }

    /* private */

    _update_in_shape_owner(p_xform_only: boolean = false) {
        this.parent.shape_owner_set_transform(this.shape_owner, this.get_transform());
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this.shape_owner, this.disabled);
        this.parent.shape_owner_set_one_way_collision(this.shape_owner, this.one_way_collision);
        this.parent.shape_owner_set_one_way_collision_margin(this.shape_owner, this.one_way_collision_margin);
    }
}
node_class_map['CollisionShape2D'] = GDCLASS(CollisionShape2D, Node2D)
