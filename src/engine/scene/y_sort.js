import Node2D from './node_2d';
import { node_class_map } from 'engine/registry';

/**
 * @param {{ y: number }} a
 * @param {{ y: number }} b
 */
const SortByY = (a, b) => a.y - b.y;

export default class YSort extends Node2D {
    constructor() {
        super();

        this.type = 'YSort';

        this.sort_enabled = true;
    }

    _load_data(data) {
        super._load_data(data);

        if (data.sort_enabled !== undefined) {
            this.sort_enabled = data.sort_enabled;
        }

        return this;
    }

    /**
     * @private
     * @param {number} delta
     */
    _propagate_process(delta) {
        super._propagate_process(delta);

        if (this.sort_enabled) {
            this.children.sort(SortByY);
        }
    }
}

node_class_map['YSort'] = YSort;
