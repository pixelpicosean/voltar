import Node2D from './node_2d';
import { node_class_map } from 'engine/registry';

export default class RemoteTransform2D extends Node2D {
    /**
     * @param {string} value
     */
    set remote_path(value) {
        this._remote_path = value;
        if (this.scene_tree) {
            this._update_cache();
            this._update_remote();
        }
    }
    get remote_path() {
        return this._remote_path;
    }
    set_remote_path(value) {
        this.remote_path = value;
        return this;
    }

    /**
     * @param {boolean} value
     */
    set update_position(value) {
        this._update_position = value;
        this._update_remote();
    }
    get update_position() {
        return this._update_position;
    }
    set_update_position(value) {
        this.update_position = value;
        return this;
    }

    /**
     * @param {boolean} value
     */
    set update_rotation(value) {
        this._update_rotation = value;
        this._update_remote();
    }
    get update_rotation() {
        return this._update_rotation;
    }
    set_update_rotation(value) {
        this.update_rotation = value;
        return this;
    }

    /**
     * @param {boolean} value
     */
    set update_scale(value) {
        this._update_scale = value;
        this._update_remote();
    }
    get update_scale() {
        return this._update_scale;
    }
    set_update_scale(value) {
        this.update_scale = value;
        return this;
    }

    /**
     * @param {boolean} value
     */
    set use_global_coordinates(value) {
        this._use_global_coordinates = value;
        this._update_remote();
    }
    get use_global_coordinates() {
        return this._use_global_coordinates;
    }
    set_use_global_coordinates(value) {
        this.use_global_coordinates = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'RemoteTransform2D';

        /**
         * @type {string}
         */
        this._remote_path = null;

        /**
         * @type {boolean}
         */
        this._update_position = true;

        /**
         * @type {boolean}
         */
        this._update_rotation = true;

        /**
         * @type {boolean}
         */
        this._update_scale = true;

        /**
         * @type {boolean}
         */
        this._use_global_coordinates = true;

        /**
         * @type {Node2D}
         */
        this.cache = null;
    }

    _load_data(data) {
        super._load_data(data);

        if (data.remote_path !== undefined) {
            this.remote_path = data.remote_path;
        }
        if (data.update_position !== undefined) {
            this.update_position = data.update_position;
        }
        if (data.update_rotation !== undefined) {
            this.update_rotation = data.update_rotation;
        }
        if (data.update_scale !== undefined) {
            this.update_scale = data.update_scale;
        }
        if (data.use_global_coordinates !== undefined) {
            this.use_global_coordinates = data.use_global_coordinates;
        }

        return this;
    }

    _propagate_ready() {
        super._propagate_ready();

        this._update_cache();
    }
    /**
     * @param {number} delta
     */
    _propagate_process(delta) {
        super._propagate_process(delta);
        this._notify_transform_changed();
    }
    _notify_transform_changed() {
        if (!this.scene_tree) {
            return;
        }
        if (this.cache) {
            this._update_remote();
        }
    }

    _update_remote() {
        if (!this.scene_tree) {
            return;
        }

        if (!this.cache) {
            return;
        }

        const n = this.cache;

        if (!n.scene_tree) {
            return;
        }

        if (this._use_global_coordinates) {
            if (this._update_position && this._update_rotation && this._update_scale) {
                n.set_global_transform(this.get_global_transform());
            } else {
                const n_trans = n.get_global_transform();
                const our_trans = this.get_global_transform();
                if (this._update_position) {
                    n_trans.set_origin(our_trans.origin);
                }
                if (this._update_rotation) {
                    n_trans.set_rotation(our_trans.rotation);
                }
                if (this._update_scale) {
                    n.set_scale(this.get_global_scale());
                }
            }
        } else {
            if (this._update_position && this._update_rotation && this._update_scale) {
                n.transform.set_from_matrix(this.transform.local_transform);
                n.node2d_update_transform();
            } else {
                if (this._update_position) {
                    n.position.copy(this.position);
                }
                if (this._update_rotation) {
                    n.rotation = this.rotation;
                }
                if (this._update_scale) {
                    n.scale.copy(this.scale);
                }
            }
        }
    }

    _update_cache() {
        this.cache = null;

        const node = this.get_node(this._remote_path);
        if (!node || this === node) {
            return;
        }

        this.cache = node;
    }
}

node_class_map['RemoteTransform2D'] = RemoteTransform2D;
