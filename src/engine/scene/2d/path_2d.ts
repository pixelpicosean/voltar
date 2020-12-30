import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2 } from 'engine/core/math/vector2';

import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from '../main/node';
import { Curve2D } from '../resources/curve';
import { Node2D } from './node_2d';


export class Path2D extends Node2D {
    get class() { return 'Path2D' }

    curve = new Curve2D;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.curve !== undefined) {
            this.curve = data.curve;
        }

        return this;
    }
}
node_class_map['Path2D'] = GDCLASS(Path2D, Node2D)


export class PathFollow2D extends Node2D {
    get class() { return 'PathFollow2D' }

    path: Path2D = null;
    offset = 0;
    h_offset = 0;
    v_offset = 0;
    lookahead = 4;
    cubic_interp = true;
    loop = true;
    rotating = true;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.offset !== undefined) {
            this.set_offset(data.offset);
        }

        if (data.v_offset !== undefined) {
            this.set_v_offset(data.v_offset);
        }

        if (data.h_offset !== undefined) {
            this.set_h_offset(data.h_offset);
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
            this.set_rotating(data.rotating);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                let path = this.get_parent() as Path2D;
                if (path && path instanceof Path2D) {
                    this.path = path;
                    this._update_transform_with_path();
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.path = null;
            } break;
        }
    }

    /* public */

    /**
     * @param {number} p_h_offset
     */
    set_h_offset(p_h_offset: number) {
        this.h_offset = p_h_offset;
        if (this.path) {
            this._update_transform_with_path();
        }
    }

    /**
     * @param {number} p_offset
     */
    set_offset(p_offset: number) {
        this.offset = p_offset;
        if (this.path) {
            this._update_transform_with_path();
        }
    }

    /**
     * @param {number} p_unit_offset
     */
    set_unit_offset(p_unit_offset: number) {
        if (this.path && this.path.curve && this.path.curve.get_baked_length()) {
            this.offset = p_unit_offset * this.path.curve.get_baked_length();
        }
    }
    get_unit_offset() {
        if (this.path && this.path.curve && this.path.curve.get_baked_length()) {
            return this.offset / this.path.curve.get_baked_length();
        } else {
            return 0;
        }
    }

    /**
     * @param {number} p_v_offset
     */
    set_v_offset(p_v_offset: number) {
        this.v_offset = p_v_offset;
        if (this.path) {
            this._update_transform_with_path();
        }
    }

    /**
     * @param {boolean} p_rotate
     */
    set_rotating(p_rotate: boolean) {
        this.rotating = p_rotate;
        this._update_transform_with_path();
    }


    /* private */

    _update_transform_with_path() {
        if (!this.path) {
            return;
        }

        let c = this.path.curve;
        if (!c) {
            return;
        }

        let path_length = c.get_baked_length();
        if (path_length === 0) {
            return;
        }
        let pos = c.interpolate_baked(this.offset, this.cubic_interp).clone();

        if (this.rotating) {
            let ahead = this.offset + this.lookahead;

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

            const tangent_to_curve = Vector2.create();
            if (ahead_pos.equals(pos)) {
                tangent_to_curve.copy(pos)
                    .subtract(c.interpolate_baked(this.offset - this.lookahead, this.cubic_interp))
                    .normalize();
            } else {
                tangent_to_curve.copy(ahead_pos)
                    .subtract(pos)
                    .normalize();
            }

            const negated = tangent_to_curve.clone().negate();
            const normal_of_curve = negated.tangent();

            this.set_rotation(tangent_to_curve.angle());

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
