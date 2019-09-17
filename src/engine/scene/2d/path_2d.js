import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import {
    posmod,
    clamp,
} from 'engine/core/math/math_funcs';
import { Vector2 } from 'engine/core/math/vector2';

import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from '../main/node';
import { Curve2D } from '../resources/curve';
import { Node2D } from './node_2d';


export class Path2D extends Node2D {
    get class() { return 'Path2D' }

    constructor() {
        super();

        /**
         * @type {Curve2D}
         */
        this.curve = new Curve2D();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.curve !== undefined) {
            this.curve._load_data(data.curve);
        }

        return this;
    }
}
node_class_map['Path2D'] = GDCLASS(Path2D, Node2D)


export class PathFollow2D extends Node2D {
    get class() { return 'PathFollow2D' }

    /**
     * @param {number} p_h_offset
     */
    set_h_offset(p_h_offset) {
        this.h_offset = p_h_offset;
        if (this.path) {
            this._update_transform();
        }
    }

    /**
     * @param {number} p_offset
     */
    set_offset(p_offset) {
        this.offset = p_offset;
        if (this.path) {
            this._update_transform();
        }
    }

    /**
     * @param {number} p_unit_offset
     */
    set_unit_offset(p_unit_offset) {
        if (this.path && this.path.curve && this.path.curve.get_baked_length()) {
            this.offset = p_unit_offset * this.path.curve.get_baked_length();
        }
    }
    get_unit_offset() {
        if (this.path && this.path.curve && this.path.curve.get_baked_length()) {
            return this.offset / this.path.curve.get_baked_length();
        }
    }

    /**
     * @param {number} p_v_offset
     */
    set_v_offset(p_v_offset) {
        this.v_offset = p_v_offset;
        if (this.path) {
            this._update_transform();
        }
    }

    /**
     * @param {boolean} p_rotate
     */
    set_rotating(p_rotate) {
        this.rotating = p_rotate;
        this._update_transform();
    }

    constructor() {
        super();

        /**
         * @type {Path2D}
         */
        this.path = null;

        /**
         * @type {number}
         */
        this.offset = 0;

        /**
         * @type {number}
         */
        this.h_offset = 0;

        /**
         * @type {number}
         */
        this.v_offset = 0;

        /**
         * @type {number}
         */
        this.lookahead = 4;

        /**
         * @type {boolean}
         */
        this.cubic_interp = true;

        /**
         * @type {boolean}
         */
        this.loop = true;

        /**
         * @type {boolean}
         */
        this.rotating = true;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.offset !== undefined) {
            this.offset = data.offset;
        }

        if (data.v_offset !== undefined) {
            this.v_offset = data.v_offset;
        }

        if (data.h_offset !== undefined) {
            this.h_offset = data.h_offset;
        }

        if (data.lookahead !== undefined) {
            this.lookahead = data.lookahead;
        }

        if (data.cubic_interp !== undefined) {
            this.cubic_interp = data.cubic_interp;
        }

        if (data.loop !== undefined) {
            this.loop = data.loop;
        }

        if (data.rotating !== undefined) {
            this.rotating = data.rotating;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                const path = /** @type {Path2D} */(this.get_parent());
                if (path.class === 'Path2D') {
                    this._update_transform();
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.path = null;
            } break;
        }
    }

    /* private */

    _update_transform() {
        if (!this.path) {
            return;
        }

        const c = this.path.curve;
        if (!c) {
            return;
        }

        let path_length = c.get_baked_length();
        if (path_length === 0) {
            return;
        }
        let bounded_offset = this.offset;
        if (this.loop) {
            bounded_offset = posmod(bounded_offset, path_length);
        } else {
            bounded_offset = clamp(bounded_offset, 0, path_length);
        }

        const pos = c.interpolate_baked(bounded_offset, this.cubic_interp);

        if (this.rotating) {
            let ahead = bounded_offset + this.lookahead;

            if (this.loop && ahead >= path_length) {
                let point_count = c.get_point_count();
                if (point_count > 0) {
                    const start_point = c.get_point_position(0);
                    const end_point = c.get_point_position(point_count - 1);
                    if (start_point.equals(end_point)) {
                        ahead = ahead % path_length;
                    }
                }
            }

            const ahead_pos = c.interpolate_baked(ahead, this.cubic_interp);

            const tangent_to_curve = Vector2.new();
            if (ahead_pos.equals(pos)) {
                tangent_to_curve.copy(pos)
                    .subtract(c.interpolate_baked(bounded_offset - this.lookahead, this.cubic_interp))
                    .normalize();
            } else {
                tangent_to_curve.copy(ahead_pos)
                    .subtract(pos)
                    .normalize();
            }

            const negated = tangent_to_curve.clone().negate();
            const normal_of_curve = negated.tangent();

            this.rotation = tangent_to_curve.angle();

            pos.add(tangent_to_curve.scale(this.h_offset));
            pos.add(normal_of_curve.scale(this.v_offset));

            Vector2.free(ahead_pos);
            Vector2.free(tangent_to_curve);
            Vector2.free(negated);
            Vector2.free(normal_of_curve);
        } else {
            pos.x += this.h_offset;
            pos.y += this.v_offset;
        }

        this.set_position(pos);

        Vector2.free(pos);
    }
}
node_class_map['PathFollow2D'] = GDCLASS(PathFollow2D, Node2D)
