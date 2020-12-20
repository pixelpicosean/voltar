import { node_class_map } from 'engine/registry.js';
import { GDCLASS } from 'engine/core/v_object.js';
import { Vector2 } from 'engine/core/math/vector2.js';
import { Rect2 } from 'engine/core/math/rect2.js';
import { MessageQueue } from 'engine/core/message_queue.js';

import {
    NOTIFICATION_ENTER_TREE,
} from '../main/node.js';
import {
    NOTIFICATION_VISIBILITY_CHANGED,
} from '../2d/canvas_item.js';

import {
    SIZE_FILL,
    SIZE_SHRINK_END,
    SIZE_SHRINK_CENTER,
    ANCHOR_BEGIN,
} from './const.js';
import {
    Control,
    NOTIFICATION_RESIZED,
    NOTIFICATION_THEME_CHANGED,
} from './control.js';


export const NOTIFICATION_SORT_CHILDREN = 50;

export class Container extends Control {
    get class() { return 'Container' }

    constructor() {
        super();

        this.pending_sort = false;
    }

    /* virtual */

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.pending_sort = false;
                this.queue_sort();
            } break;
            case NOTIFICATION_RESIZED: {
                this.queue_sort();
            } break;
            case NOTIFICATION_THEME_CHANGED: {
                this.queue_sort();
            } break;
            case NOTIFICATION_VISIBILITY_CHANGED: {
                if (this.is_visible_in_tree()) {
                    this.queue_sort();
                }
            } break;
        }
    }

    /**
     * @param {Control} child
     */
    add_child_notify(child) {
        super.add_child_notify(child);

        if (!child.is_control) return;

        child.connect('size_flags_changed', this.queue_sort, this);
        child.connect('minimum_size_changed', this._child_minsize_changed, this);
        child.connect('visibility_changed', this._child_minsize_changed, this);

        this.minimum_size_changed();
        this.queue_sort();
    }
    /**
     * @param {Control} child
     */
    move_child_notify(child) {
        super.move_child_notify(child);

        if (!child.is_control) return;

        this.minimum_size_changed();
        this.queue_sort();
    }
    /**
     * @param {Control} child
     */
    remove_child_notify(child) {
        super.remove_child_notify(child);

        if (!child.is_control) return;

        child.disconnect('size_flags_changed', this.queue_sort, this);
        child.disconnect('minimum_size_changed', this._child_minsize_changed, this);
        child.disconnect('visibility_changed', this._child_minsize_changed, this);

        this.minimum_size_changed();
        this.queue_sort();
    }

    /* public */

    /**
     * @param {Control} child
     * @param {Rect2} rect
     */
    fit_child_in_rect(child, rect) {
        const minsize = child.get_combined_minimum_size();
        const r = rect.clone();

        if (!(child.size_flags_horizontal & SIZE_FILL)) {
            r.width = minsize.x;
            if (child.size_flags_horizontal & SIZE_SHRINK_END) {
                r.x += (rect.width - minsize.x);
            } else if (child.size_flags_horizontal & SIZE_SHRINK_CENTER) {
                r.x += Math.floor((rect.width - minsize.x) * 0.5);
            } else {
                r.x += 0;
            }
        }

        if (!(child.size_flags_vertical & SIZE_FILL)) {
            r.height = minsize.y;
            if (child.size_flags_vertical & SIZE_SHRINK_END) {
                r.y += (rect.height - minsize.y);
            } else if (child.size_flags_vertical & SIZE_SHRINK_CENTER) {
                r.y += Math.floor((rect.height - minsize.y) * 0.5);
            } else {
                r.y += 0;
            }
        }

        for (let i = 0; i < 4; i++) {
            child.set_anchor(i, ANCHOR_BEGIN);
        }

        child.set_rect_position_n(r.x, r.y);
        child.set_rect_size_n(r.width, r.height);
        child.set_rect_rotation(0);
        child.set_rect_scale_n(1, 1);

        Rect2.free(r);
        Vector2.free(minsize);
    }

    queue_sort() {
        if (!this.is_inside_tree()) {
            return;
        }

        if (this.pending_sort) {
            return;
        }

        MessageQueue.get_singleton().push_call(this, '_sort_children');
        this.pending_sort = true;
    }

    /* private */

    _sort_children() {
        if (!this.is_inside_tree()) {
            return;
        }

        this.notification(NOTIFICATION_SORT_CHILDREN);
        this.emit_signal('sort_children');
        this.pending_sort = false;
    }

    _child_minsize_changed() {
        this.minimum_size_changed();
        this.queue_sort();
    }
}
node_class_map['Container'] = GDCLASS(Container, Control)
