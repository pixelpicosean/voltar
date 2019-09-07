import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import { Node2D } from './node_2d';


export class YSort extends Node2D {
    /**
     * @property {boolean}
     */
    get sort_enabled() {
        return this._sort_enabled;
    }
    set sort_enabled(p_enabled) {
        this._sort_enabled = p_enabled;
        VSG.canvas.canvas_item_set_sort_children_by_y(this.canvas_item, this._sort_enabled);
    }

    constructor() {
        super();

        this.class = 'YSort';

        this._sort_enabled = true;
    }

    _load_data(data) {
        super._load_data(data);

        if (data.sort_enabled !== undefined) {
            this.sort_enabled = data.sort_enabled;
        }

        return this;
    }
}
node_class_map['YSort'] = GDCLASS(YSort, Node2D)
