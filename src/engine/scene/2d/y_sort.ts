import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import { Node2D } from './node_2d';


export class YSort extends Node2D {
    get class() { return 'YSort' }

    sort_enabled = true;

    constructor() {
        super();

        VSG.canvas.canvas_item_set_sort_children_by_y(this.canvas_item, this.sort_enabled);
    }

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.sort_enabled !== undefined) {
            this.set_sort_enabled(data.sort_enabled);
        }

        return this;
    }

    /* public */

    set_sort_enabled(p_enabled: boolean) {
        this.sort_enabled = p_enabled;
        VSG.canvas.canvas_item_set_sort_children_by_y(this.canvas_item, this.sort_enabled);
    }
}
node_class_map['YSort'] = GDCLASS(YSort, Node2D)
