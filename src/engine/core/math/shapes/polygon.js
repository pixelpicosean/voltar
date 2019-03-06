import { SHAPES } from 'engine/const';

export default class Polygon {
    /**
     * @param {import('../vector2').Vector2Like[]|number[]} [points] - This can be an array of Points
     *  that form the polygon, a flat array of numbers that will be interpreted as [x,y, x,y, ...], or
     *  the arguments passed can be all the points of the polygon e.g.
     *  `new Polygon(new Vector2(), new Vector2(), ...)`, or the arguments passed can be flat
     *  x,y values e.g. `new Polygon(x,y, x,y, x,y, ...)` where `x` and `y` are Numbers.
     */
    constructor(points) {
        /**
         * An array of the points of this polygon
         *
         * @type {number[]}
         */
        this.points = [];

        // if passed points is an array of points, convert it to a flat array of numbers
        if (points) {
            if (typeof (points[0]) === 'number') {
                this.points = this.points.concat(/** @type {number[]} */(points));
            } else {
                for (let i = 0, il = points.length; i < il; i++) {
                    // @ts-ignore
                    this.points.push(points[i].x, points[i].y);
                }
            }
        }

        this.closed = true;

        /**
         * The type of the object, mainly used to avoid `instanceof` checks
         *
         * @type {number}
         * @readOnly
         */
        this.type = SHAPES.POLY;
    }

    /**
     * Creates a clone of this polygon
     */
    clone() {
        return new Polygon(this.points.slice());
    }

    /**
     * Closes the polygon, adding points if necessary.
     */
    close() {
        const points = this.points;

        // close the poly if the value is true!
        if (points[0] !== points[points.length - 2] || points[1] !== points[points.length - 1]) {
            points.push(points[0], points[1]);
        }
    }

    /**
     * Checks whether the x and y coordinates passed to this function are contained within this polygon
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
     */
    contains(x, y) {
        let inside = false;

        // use some raycasting to test hits
        // https://github.com/substack/point-in-polygon/blob/master/index.js
        const length = this.points.length / 2;

        for (let i = 0, j = length - 1; i < length; j = i++) {
            const xi = this.points[i * 2];
            const yi = this.points[(i * 2) + 1];
            const xj = this.points[j * 2];
            const yj = this.points[(j * 2) + 1];
            const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * ((y - yi) / (yj - yi))) + xi);

            if (intersect) {
                inside = !inside;
            }
        }

        return inside;
    }
}
