import Node2D from './node_2d';
import { Curve2D } from './resources/curve';
import { node_class_map } from 'engine/registry';
import {
    Vector2,
    posmod,
    clamp,
} from 'engine/core/math/index';

export class Path2D extends Node2D {
    constructor() {
        super();

        this.type = 'Path2D';

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

export class PathFollow2D extends Node2D {
    set h_offset(p_h_offset) {
        this._h_offset = p_h_offset;
        if (this.path) {
            this._update_transform();
        }
    }
    get h_offset() {
        return this._h_offset;
    }

    set offset(p_offset) {
        this._offset = p_offset;
        if (this.path) {
            this._update_transform();
        }
    }
    get offset() {
        return this._offset;
    }

    set unit_offset(p_unit_offset) {
        if (this.path && this.path.curve && this.path.curve.get_baked_length()) {
            this.offset = p_unit_offset * this.path.curve.get_baked_length();
        }
    }
    get unit_offset() {
        if (this.path && this.path.curve && this.path.curve.get_baked_length()) {
            return this.offset / this.path.curve.get_baked_length();
        }
    }

    set v_offset(p_v_offset) {
        this._v_offset = p_v_offset;
        if (this.path) {
            this._update_transform();
        }
    }
    get v_offset() {
        return this._v_offset;
    }

    constructor() {
        super();

        this.type = 'PathFollow2D'

        /**
         * @type {Path2D}
         */
        this.path = null;

        /**
         * @type {number}
         */
        this._offset = 0;

        /**
         * @type {number}
         */
        this._h_offset = 0;

        /**
         * @type {number}
         */
        this._v_offset = 0;

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
        this.rotate = true;
    }

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

        if (data.rotate !== undefined) {
            this.rotate = data.rotate;
        }

        return this;
    }

    _propagate_enter_tree() {
        super._propagate_enter_tree();

        // @ts-ignore
        this.path = (this.parent.type === 'Path2D') ? this.parent : null;
        if (this.path) {
            this._update_transform();
        }
    }

    _update_transform() {
        if (!this.path) {
            super._update_transform();
            return;
        }

        const c = this.path.curve;
        if (!c) {
            super._update_transform();
            return;
        }

        let path_length = c.get_baked_length();
        let bounded_offset = this._offset;
        if (this.loop) {
            bounded_offset = posmod(bounded_offset, path_length);
        } else {
            bounded_offset = clamp(bounded_offset, 0, path_length);
        }

        const pos = c.interpolate_baked(bounded_offset, this.cubic_interp);

        if (this.rotate) {
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

            pos.add(tangent_to_curve.scale(this._h_offset));
            pos.add(normal_of_curve.scale(this._v_offset));

            Vector2.free(ahead_pos);
            Vector2.free(tangent_to_curve);
            Vector2.free(negated);
            Vector2.free(normal_of_curve);
        } else {
            pos.x += this._h_offset;
            pos.y += this._v_offset;
        }

        this.position.copy(pos);

        Vector2.free(pos);

        super._update_transform();
    }
}

node_class_map['Path2D'] = Path2D;
node_class_map['PathFollow2D'] = PathFollow2D;
