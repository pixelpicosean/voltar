import { Vector, ObservablePoint } from '../../math/index';

export default class RectangleShape2D {
    constructor(extent_x = 4, extent_y = 4) {
        this._dirty = true;

        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;

        this.extents = new ObservablePoint(function() {
            this._dirty = true;

            this.points[0].set(-this.extents._x, -this.extents._y);
            this.points[1].set( this.extents._x, -this.extents._y);
            this.points[2].set( this.extents._x,  this.extents._y);
            this.points[3].set(-this.extents._x,  this.extents._y);
        }, this, extent_x, extent_y);

        this.points = [
            new Vector(-extent_x, -extent_y),
            new Vector( extent_x, -extent_y),
            new Vector( extent_x,  extent_y),
            new Vector(-extent_x,  extent_y),
        ];
        this.calc_points =
            [new Vector(), new Vector(), new Vector(), new Vector()];
        this.edges =
            [new Vector(), new Vector(), new Vector(), new Vector()];
        this.normals =
            [new Vector(), new Vector(), new Vector(), new Vector()];
    }

    calculate_points(node) {
        if (this._dirty) {
            this._calc_points(node);
            this._dirty = false;
        }
    }
    _calc_points(node) {
        // Calculated points - this is what is used for underlying collisions and takes into account
        // the rotation set on the polygon.
        let calcPoints = this.calc_points;
        // The edges here are the direction of the `n`th edge of the polygon, relative to
        // the `n`th point. If you want to draw a given edge from the edge value, you must
        // first translate to the position of the starting point.
        let edges = this.edges;
        // The normals here are the direction of the normal for the `n`th edge of the polygon, relative
        // to the position of the `n`th point. If you want to draw an edge normal, you must first
        // translate to the position of the starting point.
        let normals = this.normals;
        // Copy the original points array and apply the rotation
        let points = this.points;
        let rotation = node.get_global_rotation();
        let i, calcPoint;
        let left = 0, top = 0, right = 0, bottom = 0;
        for (i = 0; i < 4; i++) {
            calcPoint = calcPoints[i].copy(points[i]);
            if (rotation !== 0) {
                calcPoint.rotate(rotation);
            }

            // Update AABB info
            left = Math.min(left, calcPoint.x);
            top = Math.min(top, calcPoint.y);
            right = Math.max(right, calcPoint.x);
            bottom = Math.max(bottom, calcPoint.y);
        }

        // Calculate the edges/normals
        let p1, p2, e;
        for (i = 0; i < 4; i++) {
            p1 = calcPoints[i];
            p2 = i < 3 ? calcPoints[i + 1] : calcPoints[0];
            e = edges[i].copy(p2).subtract(p1);
            normals[i].copy(e).perp().normalize();
        }

        // Calculate the bounding box
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }
}
