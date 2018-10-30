import Control, { SizeFlag, Anchor } from './Control';
import { Rectangle, Vector2 } from 'engine/math/index';
import MessageQueue from 'engine/MessageQueue';

const tmp_vec = new Vector2();
const tmp_rect = new Rectangle();

export default class Container extends Control {
    constructor() {
        super();

        this.pending_sort = false;
    }
    _propagate_enter_tree() {
        this.pending_sort = false;
        this.queue_sort();

        super._propagate_enter_tree();
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
        tmp_rect.x = tmp_rect.y = tmp_rect.width = tmp_rect.height = 0;

        if (!(child.size_flags_horizontal & SizeFlag.FILL)) {
            tmp_rect.width = minsize.x;
            if (child.size_flags_horizontal & SizeFlag.SHRINK_END) {
                tmp_rect.x += (rect.width - minsize.x);
            } else if (child.size_flags_horizontal & SizeFlag.SHRINK_CENTER) {
                tmp_rect.x += Math.floor((rect.width - minsize.x) * 0.5);
            } else {
                tmp_rect.x += 0;
            }
        }

        if (!(child.size_flags_vertical & SizeFlag.FILL)) {
            tmp_rect.height = minsize.y;
            if (child.size_flags_vertical & SizeFlag.SHRINK_END) {
                tmp_rect.y += (rect.height - minsize.y);
            } else if (child.size_flags_vertical & SizeFlag.SHRINK_CENTER) {
                tmp_rect.y += Math.floor((rect.height - minsize.y) * 0.5);
            } else {
                tmp_rect.y += 0;
            }
        }

        for (let i = 0; i < 4; i++) {
            child.set_anchor(i, Anchor.BEGIN);
        }

        child.set_rect_position(tmp_rect.x, tmp_rect.y);
        child.set_rect_size(tmp_rect.width, tmp_rect.height);
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

    _sort_chilren() {
        if (!this.is_inside_tree) {
            return;
        }

        this._children_sorted();
        this.emit('sort_children');
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

        child.on('size_flags_changed', this.queue_sort, this);
        child.on('minimum_size_changed', this._child_minsize_changed, this);

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
        child.off('size_flags_changed', this.queue_sort, this);
        child.off('minimum_size_changed', this._child_minsize_changed, this);

        this.minimum_size_changed();
        this.queue_sort();
    }
}
