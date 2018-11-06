import Control from './Control';
import { SizeFlag, Anchor } from "./const";
import { Rectangle, Vector2 } from 'engine/math/index';
import MessageQueue from 'engine/MessageQueue';
import { node_class_map } from 'engine/registry';

const tmp_vec = new Vector2();
const tmp_rect = new Rectangle();

export default class Container extends Control {
    constructor() {
        super();

        this.type = 'Container';

        this.pending_sort = false;
    }
    _propagate_enter_tree() {
        super._propagate_enter_tree();

        this.pending_sort = false;
        this.queue_sort();
    }
    _resized() {
        this.queue_sort();
    }
    _visibility_changed() {
        if (this.world_visible) {
            this.queue_sort();
        }
    }

    /**
     * @param {Control} child
     * @param {Rectangle} rect
     */
    fit_child_in_rect(child, rect) {
        const minsize = child.get_combined_minimum_size(tmp_vec);
        const r = tmp_rect.copy(rect);

        if (!(child.size_flags_horizontal & SizeFlag.FILL)) {
            r.width = minsize.x;
            if (child.size_flags_horizontal & SizeFlag.SHRINK_END) {
                r.x += (rect.width - minsize.x);
            } else if (child.size_flags_horizontal & SizeFlag.SHRINK_CENTER) {
                r.x += Math.floor((rect.width - minsize.x) * 0.5);
            } else {
                r.x += 0;
            }
        }

        if (!(child.size_flags_vertical & SizeFlag.FILL)) {
            r.height = minsize.y;
            if (child.size_flags_vertical & SizeFlag.SHRINK_END) {
                r.y += (rect.height - minsize.y);
            } else if (child.size_flags_vertical & SizeFlag.SHRINK_CENTER) {
                r.y += Math.floor((rect.height - minsize.y) * 0.5);
            } else {
                r.y += 0;
            }
        }

        for (let i = 0; i < 4; i++) {
            child.set_anchor(i, Anchor.BEGIN);
        }

        child.set_rect_position(r.x, r.y);
        child.set_rect_size(r.width, r.height);
        child.set_rect_rotation(0);
        child.set_rect_scale(1, 1);
    }

    queue_sort() {
        if (!this.is_inside_tree) {
            return;
        }

        if (this.pending_sort) {
            return;
        }

        MessageQueue.get_singleton().push_call(this, '_sort_children');
        this.pending_sort = true;
    }

    _sort_children() {
        if (!this.is_inside_tree) {
            return;
        }

        this._children_sorted();
        this.emit_signal('sort_children');
        this.pending_sort = false;
    }

    _child_minsize_changed() {
        this.minimum_size_changed();
        this.queue_sort();
    }

    /**
     * @param {Control} child
     */
    add_child_notify(child) {
        super.add_child_notify(child);

        child.connect('size_flags_changed', this.queue_sort, this);
        child.connect('minimum_size_changed', this._child_minsize_changed, this);

        this.minimum_size_changed();
        this.queue_sort();
    }
    /**
     * @param {Control} child
     */
    move_child_notify(child) {
        super.move_child_notify(child);

        this.minimum_size_changed();
        this.queue_sort();
    }
    /**
     * @param {Control} child
     */
    remove_child_notify(child) {
        child.disconnect('size_flags_changed', this.queue_sort, this);
        child.disconnect('minimum_size_changed', this._child_minsize_changed, this);

        this.minimum_size_changed();
        this.queue_sort();
    }
}

node_class_map['Container'] = Container;
