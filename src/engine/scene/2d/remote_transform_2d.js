import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';

import { NOTIFICATION_ENTER_TREE } from '../main/node';
import { Node2D } from './node_2d';
import { NOTIFICATION_TRANSFORM_CHANGED } from './canvas_item';
import { Vector2 } from 'engine/core/math/vector2';


export class RemoteTransform2D extends Node2D {
    get class() { return 'RemoteTransform2D' }

    get remote_path() { return this._remote_path }
    set remote_path(value) { this.set_remote_path(value) }

    get update_position() { return this._update_position }
    set update_position(value) { this.set_update_position(value) }

    get update_rotation() { return this._update_rotation }
    set update_rotation(value) { this.set_update_rotation(value) }

    get update_scale() { return this._update_scale }
    set update_scale(value) { this.set_update_scale(value) }

    get use_global_coordinates() { return this._use_global_coordinates }
    set use_global_coordinates(value) { this.set_use_global_coordinates(value) }

    constructor() {
        super();

        /**
         * @type {string}
         */
        this._remote_path = null;

        this._update_position = true;
        this._update_rotation = true;
        this._update_scale = true;

        this._use_global_coordinates = true;

        /**
         * @type {Node2D}
         */
        this.cache = null;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.remote_path !== undefined) {
            this.set_remote_path(data.remote_path);
        }
        if (data.update_position !== undefined) {
            this.set_update_position(data.update_position);
        }
        if (data.update_rotation !== undefined) {
            this.set_update_rotation(data.update_rotation);
        }
        if (data.update_scale !== undefined) {
            this.set_update_scale(data.update_scale);
        }
        if (data.use_global_coordinates !== undefined) {
            this.set_use_global_coordinates(data.use_global_coordinates);
        }

        return this;
    }

    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this._update_cache();
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                if (!this.is_inside_tree()) {
                    break;
                }
                if (this.cache) {
                    this._update_remote();
                }
            } break;
        }
    }

    /* public */

    /**
     * @param {string} value
     */
    set_remote_path(value) {
        this._remote_path = value;
        if (this.is_inside_tree()) {
            this._update_cache();
            this._update_remote();
        }
    }

    /**
     * @param {boolean} value
     */
    set_update_position(value) {
        this._update_position = value;
        this._update_remote();
    }

    /**
     * @param {boolean} value
     */
    set_update_rotation(value) {
        this._update_rotation = value;
        this._update_remote();
    }

    /**
     * @param {boolean} value
     */
    set_update_scale(value) {
        this._update_scale = value;
        this._update_remote();
    }

    /**
     * @param {boolean} value
     */
    set_use_global_coordinates(value) {
        this._use_global_coordinates = value;
        this._update_remote();
    }

    /* private */

    _update_remote() {
        if (!this.is_inside_tree()) {
            return;
        }

        if (!this.cache) {
            return;
        }

        const n = this.cache;

        if (!n.is_node_2d || !n.is_inside_tree()) {
            return;
        }

        if (this._use_global_coordinates) {
            if (this._update_position && this._update_rotation && this._update_scale) {
                n.set_global_transform(this.get_global_transform());
            } else {
                const n_trans = n.get_global_transform();
                const our_trans = this.get_global_transform();
                const n_scale = n.get_scale();

                if (!this._update_position) {
                    const origin = our_trans.get_origin();
                    n_trans.set_origin(origin);
                    Vector2.free(origin);
                }
                if (!this._update_rotation) {
                    n_trans.set_rotation(our_trans.get_rotation());
                }

                n.set_global_transform(our_trans);

                if (this._update_scale) {
                    n.set_scale(this.get_global_scale());
                } else {
                    n.set_scale(n_scale);
                }
            }
        } else {
            if (this._update_position && this._update_rotation && this._update_scale) {
                n.set_transform(this.get_transform());
            } else {
                const n_trans = n.get_transform();
                const our_trans = this.get_transform();
                const n_scale = n.get_scale();

                if (!this._update_position) {
                    const origin = our_trans.get_origin();
                    n_trans.set_origin(origin);
                    Vector2.free(origin);
                }
                if (!this._update_rotation) {
                    n_trans.set_rotation(our_trans.get_rotation());
                }

                n.set_transform(our_trans);

                if (this._update_scale) {
                    n.set_scale(this.get_scale());
                } else {
                    n.set_scale(n_scale);
                }
            }
        }
    }

    _update_cache() {
        this.cache = null;

        const node = /** @type {Node2D} */(this.get_node(this._remote_path));
        if (!node || this === node || node.is_a_parent_of(this) || this.is_a_parent_of(node)) {
            return;
        }

        this.cache = node;
    }
}
node_class_map['RemoteTransform2D'] = GDCLASS(RemoteTransform2D, Node2D)
