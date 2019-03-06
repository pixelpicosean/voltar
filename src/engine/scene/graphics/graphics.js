import Texture from 'engine/scene/resources/textures/texture';
import Node2D from 'engine/scene/node_2d';
import Sprite from 'engine/scene/sprites/sprite';
import {
    PI2,
    Vector2,
    Bounds,
    Circle,
    Rectangle,
    RoundedRectangle,
    Ellipse,
    Polygon,
} from 'engine/core/math/index';
import { hex2rgb, rgb2hex } from 'engine/utils/index';
import { SHAPES, BLEND_MODES } from 'engine/const';

import bezier_curve_to from './utils/bezier_curve_to';
import WebGLGraphicsData from './renderer/webgl_graphics_data';
import GraphicsData from './graphics_data';

const temp_point = new Vector2();
const temp_color_1 = new Float32Array(4);
const temp_color_2 = new Float32Array(4);

const EMPTY_POINTS = [];

/**
 * @typedef GraphicRenderInfo
 * @property {number} last_index
 * @property {WebGLGraphicsData[]} data
 * @property {WebGLRenderingContext} gl
 * @property {number} clear_dirty
 * @property {number} dirty
 */

/**
 * The Graphics class contains methods used to draw primitive shapes such as lines, circles and
 * rectangles to the display, and to color and fill them.
 */
export default class Graphics extends Node2D {
    /**
     * @param {boolean} [native_lines] - If true the lines will be draw using LINES instead of TRIANGLE_STRIP
     */
    constructor(native_lines = false) {
        super();

        this.type = 'Graphics';

        /**
         * The alpha value used when filling the Graphics object.
         *
         * @type {number}
         * @default 1
         */
        this.fill_alpha = 1;

        /**
         * The width (thickness) of any lines drawn.
         *
         * @type {number}
         * @default 0
         */
        this.line_width = 0;

        /**
         * If true the lines will be draw using LINES instead of TRIANGLE_STRIP
         *
         * @type {boolean}
         */
        this.native_lines = native_lines;

        /**
         * The color of any lines drawn.
         *
         * @default 0
         */
        this.line_color = 0;

        /**
         * The alignment of any lines drawn (0.5 = middle, 1 = outter, 0 = inner).
         *
         * @type {number}
         * @default 0
         */
        this.line_alignment = 0.5;

        /**
         * Graphics data
         *
         * @type {GraphicsData[]}
         * @private
         */
        this.graphics_data = [];

        /**
         * The tint applied to the graphic shape. This is a hex value. Apply a value of 0xFFFFFF to
         * reset the tint.
         *
         * @type {number}
         */
        this.tint = 0xFFFFFF;

        /**
         * The previous tint applied to the graphic shape. Used to compare to the current tint and
         * check if theres change.
         *
         * @type {number}
         * @private
         */
        this._prev_tint = 0xFFFFFF;

        /**
         * The blend mode to be applied to the graphic shape. Apply a value of
         * `BLEND_MODES.NORMAL` to reset the blend mode.
         *
         * @type {number}
         * @default BLEND_MODES.NORMAL;
         */
        this.blend_mode = BLEND_MODES.NORMAL;

        /**
         * Current path
         *
         * @type {GraphicsData}
         * @private
         */
        this.current_path = null;

        /**
         * Array containing some WebGL-related properties used by the WebGL renderer.
         *
         * @type {Object<number, GraphicRenderInfo>}
         * @private
         */
        this._webgl = {};

        /**
         * Whether this shape is being used as a mask.
         *
         * @type {boolean}
         */
        this.is_mask = false;

        /**
         * The bounds' padding used for bounds calculation.
         *
         * @type {number}
         */
        this.bounds_padding = 0;

        /**
         * A cache of the local bounds to prevent recalculation.
         *
         * @private
         */
        this._local_bounds = new Bounds();

        /**
         * Used to detect if the graphics object has changed. If this is set to true then the graphics
         * object will be recalculated.
         *
         * @private
         */
        this.dirty = 0;

        /**
         * Used to detect if we need to do a fast rect check using the id compare method
         * @type {number}
         */
        this.fast_rect_dirty = -1;

        /**
         * Used to detect if we clear the graphics webGL data
         * @type {number}
         */
        this.clear_dirty = 0;

        /**
         * Used to detect if we we need to recalculate local bounds
         * @type {number}
         */
        this.bounds_dirty = -1;

        /**
         * Used to detect if the cached sprite object needs to be updated.
         *
         * @type {boolean}
         * @private
         */
        this.cached_sprite_dirty = false;

        this._sprite_rect = null;
        this._fast_rect = false;
    }

    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                // Directly set
                // - Graphics
                case 'tint':
                    this[k] = data[k];
                    break;

                // Blend modes
                case 'blend_mode':
                    this.blend_mode = BLEND_MODES[data[k]];
                    break;

                // Graphics
                case 'shape':
                    let { centered = true, line_width = 0, fill = 0, stroke = 0 } = data;
                    switch (data.shape) {
                        case 'rect':
                        case 'rectangle':
                        case 'box':
                            let { width = 8, height = 8 } = data;
                            if (line_width > 0) {
                                this.set_line_style(line_width, stroke, 1);
                            }
                            this.begin_fill(fill, 1);
                            if (centered) {
                                this.draw_rect(-width / 2, -height / 2, width, height);
                            } else {
                                this.draw_rect(0, 0, width, height);
                            }
                            this.end_fill();
                            break;
                        case 'circ':
                        case 'circle':
                            let { radius = 8 } = data;
                            if (line_width > 0) {
                                this.set_line_style(line_width, stroke, 1);
                            }
                            this.begin_fill(fill, 1);
                            if (centered) {
                                this.draw_circle(0, 0, radius);
                            } else {
                                this.draw_circle(-radius, -radius, radius);
                            }
                            this.end_fill();
                            break;
                        case 'poly':
                        case 'polygon':
                            let { points = EMPTY_POINTS } = data;
                            if (line_width > 0) {
                                this.set_line_style(line_width, stroke, 1);
                            }
                            this.begin_fill(fill, 1);
                            this.draw_polygon(points);
                            this.end_fill();
                            break;
                    }
            }
        }

        return this;
    }

    /**
     * Creates a new Graphics object with the same values as this one.
     * Note that the only the properties of the object are cloned, not its transform (position,scale,etc)
     */
    clone() {
        const clone = new Graphics();

        clone.renderable = this.renderable;
        clone.fill_alpha = this.fill_alpha;
        clone.line_width = this.line_width;
        clone.line_color = this.line_color;
        clone.line_alignment = this.line_alignment;
        clone.tint = this.tint;
        clone.blend_mode = this.blend_mode;
        clone.is_mask = this.is_mask;
        clone.bounds_padding = this.bounds_padding;
        clone.dirty = 0;
        clone.cached_sprite_dirty = this.cached_sprite_dirty;

        // copy graphics data
        for (let i = 0; i < this.graphics_data.length; ++i) {
            clone.graphics_data.push(this.graphics_data[i].clone());
        }

        clone.current_path = clone.graphics_data[clone.graphics_data.length - 1];

        clone.update_local_bounds();

        return clone;
    }

    /**
     * Calculate length of quadratic curve
     *
     * @param {number} from_x - x-coordinate of curve start point
     * @param {number} from_y - y-coordinate of curve start point
     * @param {number} cp_x - x-coordinate of curve control point
     * @param {number} cp_y - y-coordinate of curve control point
     * @param {number} to_x - x-coordinate of curve end point
     * @param {number} to_y - y-coordinate of curve end point
     */
    _quadratic_curve_length(from_x, from_y, cp_x, cp_y, to_x, to_y) {
        const ax = from_x - ((2.0 * cp_x) + to_x);
        const ay = from_y - ((2.0 * cp_y) + to_y);
        const bx = 2.0 * ((cp_x - 2.0) * from_x);
        const by = 2.0 * ((cp_y - 2.0) * from_y);
        const a = 4.0 * ((ax * ax) + (ay * ay));
        const b = 4.0 * ((ax * bx) + (ay * by));
        const c = (bx * bx) + (by * by);

        const s = 2.0 * Math.sqrt(a + b + c);
        const a2 = Math.sqrt(a);
        const a32 = 2.0 * a * a2;
        const c2 = 2.0 * Math.sqrt(c);
        const ba = b / a2;

        return (
            (a32 * s)
            + (a2 * b * (s - c2))
            + (
                ((4.0 * c * a) - (b * b))
                * Math.log(((2.0 * a2) + ba + s) / (ba + c2))
            )
        ) / (4.0 * a32);
    }

    /**
     * Calculate length of bezier curve.
     * Analytical solution is impossible, since it involves an integral that does not integrate in general.
     * Therefore numerical solution is used.
     *
     * @param {number} from_x - Starting point x
     * @param {number} from_y - Starting point y
     * @param {number} cp_x - Control point x
     * @param {number} cp_y - Control point y
     * @param {number} cp_x2 - Second Control point x
     * @param {number} cp_y2 - Second Control point y
     * @param {number} to_x - Destination point x
     * @param {number} to_y - Destination point y
     */
    _bezier_curve_length(from_x, from_y, cp_x, cp_y, cp_x2, cp_y2, to_x, to_y) {
        const n = 10;
        let result = 0.0;
        let t = 0.0;
        let t2 = 0.0;
        let t3 = 0.0;
        let nt = 0.0;
        let nt2 = 0.0;
        let nt3 = 0.0;
        let x = 0.0;
        let y = 0.0;
        let dx = 0.0;
        let dy = 0.0;
        let prev_x = from_x;
        let prev_y = from_y;

        for (let i = 1; i <= n; ++i) {
            t = i / n;
            t2 = t * t;
            t3 = t2 * t;
            nt = (1.0 - t);
            nt2 = nt * nt;
            nt3 = nt2 * nt;

            x = (nt3 * from_x) + (3.0 * nt2 * t * cp_x) + (3.0 * nt * t2 * cp_x2) + (t3 * to_x);
            y = (nt3 * from_y) + (3.0 * nt2 * t * cp_y) + (3 * nt * t2 * cp_y2) + (t3 * to_y);
            dx = prev_x - x;
            dy = prev_y - y;
            prev_x = x;
            prev_y = y;

            result += Math.sqrt((dx * dx) + (dy * dy));
        }

        return result;
    }

    /**
     * Calculate number of segments for the curve based on its length to ensure its smoothness.
     *
     * @private
     * @param {number} length - length of curve
     */
    _segments_count(length) {
        let result = Math.ceil(length / Graphics.CURVES.max_length);

        if (result < Graphics.CURVES.min_segments) {
            result = Graphics.CURVES.min_segments;
        } else if (result > Graphics.CURVES.max_segments) {
            result = Graphics.CURVES.max_segments;
        }

        return result;
    }

    /**
     * Specifies the line style used for subsequent calls to Graphics methods such as the line_to()
     * method or the draw_circle() method.
     *
     * @param {number} [line_width] - width of the line to draw, will update the objects stored style
     * @param {number} [color] - color of the line to draw, will update the objects stored style
     * @param {number} [alpha] - alpha of the line to draw, will update the objects stored style
     * @param {number} [alignment] - alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
     */
    set_line_style(line_width = 0, color = 0, alpha = 1, alignment = 0.5) {
        this.line_width = line_width;
        this.line_color = color;
        this.line_alpha = alpha;
        this.line_alignment = alignment;

        if (this.current_path) {
            const polygon = /** @type {Polygon} */(this.current_path.shape);
            if (polygon.points.length) {
                // halfway through a line? start a new one!
                const shape = new Polygon(polygon.points.slice(-2));

                shape.closed = false;

                this.draw_shape(shape);
            } else {
                // otherwise its empty so lets just set the line properties
                this.current_path.line_width = this.line_width;
                this.current_path.line_color = this.line_color;
                this.current_path.line_alpha = this.line_alpha;
                this.current_path.line_alignment = this.line_alignment;
            }
        }

        return this;
    }

    /**
     * Moves the current drawing position to x, y.
     *
     * @param {number} x - the X coordinate to move to
     * @param {number} y - the Y coordinate to move to
     */
    move_to(x, y) {
        const shape = new Polygon([x, y]);

        shape.closed = false;
        this.draw_shape(shape);

        return this;
    }

    /**
     * Draws a line using the current line style from the current drawing position to (x, y);
     * The current drawing position is then set to (x, y).
     *
     * @param {number} x - the X coordinate to draw to
     * @param {number} y - the Y coordinate to draw to
     */
    line_to(x, y) {
        const points = /** @type {Polygon} */(this.current_path.shape).points;

        const from_x = points[points.length - 2];
        const from_y = points[points.length - 1];

        if (from_x !== x || from_y !== y) {
            points.push(x, y);
            this.dirty++;
        }

        return this;
    }

    /**
     * Calculate the points for a quadratic bezier curve and then draws it.
     * Based on: https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
     *
     * @param {number} cpX - Control point x
     * @param {number} cpY - Control point y
     * @param {number} toX - Destination point x
     * @param {number} toY - Destination point y
     * @return {Graphics} This Graphics object. Good for chaining method calls
     */
    quadratic_curve_to(cpX, cpY, toX, toY) {
        const polygon = /** @type {Polygon} */(this.current_path.shape);

        if (this.current_path) {
            if (polygon.points.length === 0) {
                polygon.points = [0, 0];
            }
        } else {
            this.move_to(0, 0);
        }

        const points = polygon.points;
        let xa = 0;
        let ya = 0;

        if (points.length === 0) {
            this.move_to(0, 0);
        }

        const from_x = points[points.length - 2];
        const from_y = points[points.length - 1];
        const n = Graphics.CURVES.adaptive
            ? this._segments_count(this._quadratic_curve_length(from_x, from_y, cpX, cpY, toX, toY))
            : 20;

        for (let i = 1; i <= n; ++i) {
            const j = i / n;

            xa = from_x + ((cpX - from_x) * j);
            ya = from_y + ((cpY - from_y) * j);

            points.push(xa + (((cpX + ((toX - cpX) * j)) - xa) * j),
                ya + (((cpY + ((toY - cpY) * j)) - ya) * j));
        }

        this.dirty++;

        return this;
    }

    /**
     * Calculate the points for a bezier curve and then draws it.
     *
     * @param {number} cp_x - Control point x
     * @param {number} cp_y - Control point y
     * @param {number} cp_x2 - Second Control point x
     * @param {number} cp_y2 - Second Control point y
     * @param {number} to_x - Destination point x
     * @param {number} to_y - Destination point y
     */
    bezier_curve_to(cp_x, cp_y, cp_x2, cp_y2, to_x, to_y) {
        const polygon = /** @type {Polygon} */(this.current_path.shape);

        if (this.current_path) {
            if (polygon.points.length === 0) {
                polygon.points = [0, 0];
            }
        } else {
            this.move_to(0, 0);
        }

        const points = polygon.points;

        const from_x = points[points.length - 2];
        const from_y = points[points.length - 1];

        points.length -= 2;

        const n = Graphics.CURVES.adaptive
            ? this._segments_count(this._bezier_curve_length(from_x, from_y, cp_x, cp_y, cp_x2, cp_y2, to_x, to_y))
            : 20;
        bezier_curve_to(from_x, from_y, cp_x, cp_y, cp_x2, cp_y2, to_x, to_y, n, points);

        this.dirty++;

        return this;
    }

    /**
     * The arcTo() method creates an arc/curve between two tangents on the canvas.
     *
     * "borrowed" from https://code.google.com/p/fxcanvas/ - thanks google!
     *
     * @param {number} x1 - The x-coordinate of the beginning of the arc
     * @param {number} y1 - The y-coordinate of the beginning of the arc
     * @param {number} x2 - The x-coordinate of the end of the arc
     * @param {number} y2 - The y-coordinate of the end of the arc
     * @param {number} radius - The radius of the arc
     */
    arc_to(x1, y1, x2, y2, radius) {
        const polygon = /** @type {Polygon} */(this.current_path.shape);

        if (this.current_path) {
            if (polygon.points.length === 0) {
                polygon.points.push(x1, y1);
            }
        } else {
            this.move_to(x1, y1);
        }

        const points = polygon.points;
        const from_x = points[points.length - 2];
        const from_y = points[points.length - 1];
        const a1 = from_y - y1;
        const b1 = from_x - x1;
        const a2 = y2 - y1;
        const b2 = x2 - x1;
        const mm = Math.abs((a1 * b2) - (b1 * a2));

        if (mm < 1.0e-8 || radius === 0) {
            if (points[points.length - 2] !== x1 || points[points.length - 1] !== y1) {
                points.push(x1, y1);
            }
        } else {
            const dd = (a1 * a1) + (b1 * b1);
            const cc = (a2 * a2) + (b2 * b2);
            const tt = (a1 * a2) + (b1 * b2);
            const k1 = radius * Math.sqrt(dd) / mm;
            const k2 = radius * Math.sqrt(cc) / mm;
            const j1 = k1 * tt / dd;
            const j2 = k2 * tt / cc;
            const cx = (k1 * b2) + (k2 * b1);
            const cy = (k1 * a2) + (k2 * a1);
            const px = b1 * (k2 + j1);
            const py = a1 * (k2 + j1);
            const qx = b2 * (k1 + j2);
            const qy = a2 * (k1 + j2);
            const start_angle = Math.atan2(py - cy, px - cx);
            const end_angle = Math.atan2(qy - cy, qx - cx);

            this.arc(cx + x1, cy + y1, radius, start_angle, end_angle, b1 * a2 > b2 * a1);
        }

        this.dirty++;

        return this;
    }

    /**
     * The arc method creates an arc/curve (used to create circles, or parts of circles).
     *
     * @param {number} cx - The x-coordinate of the center of the circle
     * @param {number} cy - The y-coordinate of the center of the circle
     * @param {number} radius - The radius of the circle
     * @param {number} start_angle - The starting angle, in radians (0 is at the 3 o'clock position
     *  of the arc's circle)
     * @param {number} end_angle - The ending angle, in radians
     * @param {boolean} [anticlockwise] - Specifies whether the drawing should be
     *  counter-clockwise or clockwise. False is default, and indicates clockwise, while true
     *  indicates counter-clockwise.
     */
    arc(cx, cy, radius, start_angle, end_angle, anticlockwise = false) {
        if (start_angle === end_angle) {
            return this;
        }

        if (!anticlockwise && end_angle <= start_angle) {
            end_angle += PI2;
        } else if (anticlockwise && start_angle <= end_angle) {
            start_angle += PI2;
        }

        const sweep = end_angle - start_angle;
        const segs = Graphics.CURVES.adaptive
            ? this._segments_count(Math.abs(sweep) * radius)
            : Math.ceil(Math.abs(sweep) / PI2) * 40;

        if (sweep === 0) {
            return this;
        }

        const start_x = cx + (Math.cos(start_angle) * radius);
        const start_y = cy + (Math.sin(start_angle) * radius);

        // If the current_path exists, take its points. Otherwise call `move_to` to start a path.
        let points = this.current_path ? /** @type {Polygon} */(this.current_path.shape).points : null;

        if (points) {
            // We check how far our start is from the last existing point
            const x_diff = Math.abs(points[points.length - 2] - start_x);
            const y_diff = Math.abs(points[points.length - 1] - start_y);

            if (x_diff < 0.001 && y_diff < 0.001) {
                // If the point is very close, we don't add it, since this would lead to artifacts
                // during tesselation due to floating point imprecision.
            } else {
                points.push(start_x, start_y);
            }
        } else {
            this.move_to(start_x, start_y);
            points = /** @type {Polygon} */(this.current_path.shape).points;
        }

        const theta = sweep / (segs * 2);
        const theta2 = theta * 2;

        const c_theta = Math.cos(theta);
        const s_theta = Math.sin(theta);

        const seg_minus = segs - 1;

        const remainder = (seg_minus % 1) / seg_minus;

        for (let i = 0; i <= seg_minus; ++i) {
            const real = i + (remainder * i);

            const angle = ((theta) + start_angle + (theta2 * real));

            const c = Math.cos(angle);
            const s = -Math.sin(angle);

            points.push(
                (((c_theta * c) + (s_theta * s)) * radius) + cx,
                (((c_theta * -s) + (s_theta * c)) * radius) + cy
            );
        }

        this.dirty++;

        return this;
    }

    /**
     * Specifies a simple one-color fill that subsequent calls to other Graphics methods
     * (such as line_to() or draw_circle()) use when drawing.
     *
     * @param {number} [color] - the color of the fill
     * @param {number} [alpha] - the alpha of the fill
     */
    begin_fill(color = 0, alpha = 1) {
        this.filling = true;
        this.fill_color = color;
        this.fill_alpha = alpha;

        if (this.current_path) {
            const polygon = /** @type {Polygon} */(this.current_path.shape);
            if (polygon.points.length <= 2) {
                this.current_path.fill = this.filling;
                this.current_path.fill_color = this.fill_color;
                this.current_path.fill_alpha = this.fill_alpha;
            }
        }

        return this;
    }

    /**
     * Applies a fill to the lines and shapes that were added since the last call to the begin_fill() method.
     */
    end_fill() {
        this.filling = false;
        this.fill_color = null;
        this.fill_alpha = 1;

        return this;
    }

    /**
     *
     * @param {number} x - The X coord of the top-left of the rectangle
     * @param {number} y - The Y coord of the top-left of the rectangle
     * @param {number} width - The width of the rectangle
     * @param {number} height - The height of the rectangle
     */
    draw_rect(x, y, width, height) {
        this.draw_shape(new Rectangle(x, y, width, height));

        return this;
    }

    /**
     *
     * @param {number} x - The X coord of the top-left of the rectangle
     * @param {number} y - The Y coord of the top-left of the rectangle
     * @param {number} width - The width of the rectangle
     * @param {number} height - The height of the rectangle
     * @param {number} radius - Radius of the rectangle corners
     */
    draw_rounded_rect(x, y, width, height, radius) {
        this.draw_shape(new RoundedRectangle(x, y, width, height, radius));

        return this;
    }

    /**
     * Draws a circle.
     *
     * @param {number} x - The X coordinate of the center of the circle
     * @param {number} y - The Y coordinate of the center of the circle
     * @param {number} radius - The radius of the circle
     */
    draw_circle(x, y, radius) {
        this.draw_shape(new Circle(x, y, radius));

        return this;
    }

    /**
     * Draws an ellipse.
     *
     * @param {number} x - The X coordinate of the center of the ellipse
     * @param {number} y - The Y coordinate of the center of the ellipse
     * @param {number} width - The half width of the ellipse
     * @param {number} height - The half height of the ellipse
     */
    draw_ellipse(x, y, width, height) {
        this.draw_shape(new Ellipse(x, y, width, height));

        return this;
    }

    /**
     * Draws a polygon using the given path.
     *
     * @param {number[]|Vector2[]} path - The path data used to construct the polygon.
     */
    draw_polygon(path) {
        // prevents an argument assignment deopt
        // see section 3.1: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
        let points = path;

        let closed = true;

        if (points instanceof Polygon) {
            closed = points.closed;
            points = points.points;
        }

        if (!Array.isArray(points)) {
            // prevents an argument leak deopt
            // see section 3.2: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
            points = new Array(arguments.length);

            for (let i = 0; i < points.length; ++i) {
                points[i] = arguments[i];
            }
        }

        const shape = new Polygon(points);

        shape.closed = closed;

        this.draw_shape(shape);

        return this;
    }

    /**
     * Draw a star shape with an abitrary number of points.
     *
     * @param {number} x - Center X position of the star
     * @param {number} y - Center Y position of the star
     * @param {number} points - The number of points of the star, must be > 1
     * @param {number} radius - The outer radius of the star
     * @param {number} [inner_radius] - The inner radius between points, default half `radius`
     * @param {number} [rotation] - The rotation of the star in radians, where 0 is vertical
     */
    draw_star(x, y, points, radius, inner_radius, rotation = 0) {
        inner_radius = inner_radius || radius / 2;

        const start_angle = (-1 * Math.PI / 2) + rotation;
        const len = points * 2;
        const delta = PI2 / len;
        const polygon = [];

        for (let i = 0; i < len; i++) {
            const r = i % 2 ? inner_radius : radius;
            const angle = (i * delta) + start_angle;

            polygon.push(
                x + (r * Math.cos(angle)),
                y + (r * Math.sin(angle))
            );
        }

        return this.draw_polygon(polygon);
    }

    /**
     * Clears the graphics that were drawn to this Graphics object, and resets fill and line style settings.
     */
    clear() {
        if (this.line_width || this.filling || this.graphics_data.length > 0) {
            this.line_width = 0;
            this.line_alignment = 0.5;

            this.filling = false;

            this.bounds_dirty = -1;
            this.canvas_tint_dirty = -1;
            this.dirty++;
            this.clear_dirty++;
            this.graphics_data.length = 0;
        }

        this.current_path = null;
        this._sprite_rect = null;

        return this;
    }

    /**
     * True if graphics consists of one rectangle, and thus, can be drawn like a Sprite and
     * masked with gl.scissor.
     */
    is_fast_rect() {
        return this.graphics_data.length === 1
            && this.graphics_data[0].shape.type === SHAPES.RECT
            && !this.graphics_data[0].line_width;
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {import('engine/renderers/WebGLRenderer').default} renderer - The renderer
     */
    _render_webgl(renderer) {
        // if the sprite is not visible or the alpha is 0 then no need to render this element
        if (this.dirty !== this.fast_rect_dirty) {
            this.fast_rect_dirty = this.dirty;
            this._fast_rect = this.is_fast_rect();
        }

        // TODO this check can be moved to dirty?
        if (this._fast_rect) {
            this._render_sprite_rect(renderer);
        } else {
            renderer.set_object_renderer(renderer.plugins.graphics);
            renderer.plugins.graphics.render(this);
        }
    }

    /**
     * Renders a sprite rectangle.
     *
     * @private
     * @param {import('engine/renderers/WebGLRenderer').default} renderer - The renderer
     */
    _render_sprite_rect(renderer) {
        const rect = /** @type {Rectangle} */(this.graphics_data[0].shape);

        if (!this._sprite_rect) {
            this._sprite_rect = new Sprite(Texture.WHITE);
        }

        const sprite = this._sprite_rect;

        if (this.tint === 0xffffff) {
            sprite.tint = this.graphics_data[0].fill_color;
        } else {
            const t1 = temp_color_1;
            const t2 = temp_color_2;

            hex2rgb(this.graphics_data[0].fill_color, t1);
            hex2rgb(this.tint, t2);

            t1[0] *= t2[0];
            t1[1] *= t2[1];
            t1[2] *= t2[2];

            sprite.tint = rgb2hex(t1);
        }
        sprite.modulate.a = this.graphics_data[0].fill_alpha;
        sprite.world_alpha = this.world_alpha * sprite.alpha;
        sprite.blend_mode = this.blend_mode;

        sprite._texture._frame.width = rect.width;
        sprite._texture._frame.height = rect.height;

        sprite.transform.world_transform = this.transform.world_transform;

        sprite.anchor.set(-rect.x / rect.width, -rect.y / rect.height);
        sprite._on_anchor_update();

        sprite._render_webgl(renderer);
    }

    /**
     * Retrieves the bounds of the graphic shape as a rectangle object
     *
     * @private
     */
    _calculate_bounds() {
        if (this.bounds_dirty !== this.dirty) {
            this.bounds_dirty = this.dirty;
            this.update_local_bounds();

            this.cached_sprite_dirty = true;
        }

        const local_bounds = this._local_bounds;

        this._bounds.add_frame(this.transform, local_bounds.min_x, local_bounds.min_y, local_bounds.max_x, local_bounds.max_y);
    }

    /**
     * Tests if a point is inside this graphics object
     *
     * @param {Vector2} point - the point to test
     */
    contains_point(point) {
        this.world_transform.xform_inv(point, temp_point);

        const graphics_data = this.graphics_data;

        for (let i = 0; i < graphics_data.length; ++i) {
            const data = graphics_data[i];

            if (!data.fill) {
                continue;
            }

            // only deal with fills..
            if (data.shape) {
                if (data.shape.contains(temp_point.x, temp_point.y)) {
                    if (data.holes) {
                        for (let i = 0; i < data.holes.length; i++) {
                            const hole = data.holes[i];

                            if (hole.contains(temp_point.x, temp_point.y)) {
                                return false;
                            }
                        }
                    }

                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Update the bounds of the object
     *
     */
    update_local_bounds() {
        let min_x = Infinity;
        let max_x = -Infinity;

        let min_y = Infinity;
        let max_y = -Infinity;

        if (this.graphics_data.length) {
            let x = 0;
            let y = 0;
            let w = 0;
            let h = 0;

            for (let i = 0; i < this.graphics_data.length; i++) {
                const data = this.graphics_data[i];
                const type = data.type;
                const line_width = data.line_width;

                let shape = data.shape;

                if (type === SHAPES.RECT || type === SHAPES.RREC) {
                    const rect = /** @type {Rectangle} */(shape);

                    x = rect.x - (line_width / 2);
                    y = rect.y - (line_width / 2);
                    w = rect.width + line_width;
                    h = rect.height + line_width;

                    min_x = x < min_x ? x : min_x;
                    max_x = x + w > max_x ? x + w : max_x;

                    min_y = y < min_y ? y : min_y;
                    max_y = y + h > max_y ? y + h : max_y;
                } else if (type === SHAPES.CIRC) {
                    const circle = /** @type {Circle} */(shape);

                    x = circle.x;
                    y = circle.y;
                    w = circle.radius + (line_width / 2);
                    h = circle.radius + (line_width / 2);

                    min_x = x - w < min_x ? x - w : min_x;
                    max_x = x + w > max_x ? x + w : max_x;

                    min_y = y - h < min_y ? y - h : min_y;
                    max_y = y + h > max_y ? y + h : max_y;
                } else if (type === SHAPES.ELIP) {
                    const elip = /** @type {Ellipse} */(shape);

                    x = elip.x;
                    y = elip.y;
                    w = elip.width + (line_width / 2);
                    h = elip.height + (line_width / 2);

                    min_x = x - w < min_x ? x - w : min_x;
                    max_x = x + w > max_x ? x + w : max_x;

                    min_y = y - h < min_y ? y - h : min_y;
                    max_y = y + h > max_y ? y + h : max_y;
                } else {
                    // POLY
                    const points = /** @type {Polygon} */(shape).points;
                    let x2 = 0;
                    let y2 = 0;
                    let dx = 0;
                    let dy = 0;
                    let rw = 0;
                    let rh = 0;
                    let cx = 0;
                    let cy = 0;

                    for (let j = 0; j + 2 < points.length; j += 2) {
                        x = points[j];
                        y = points[j + 1];
                        x2 = points[j + 2];
                        y2 = points[j + 3];
                        dx = Math.abs(x2 - x);
                        dy = Math.abs(y2 - y);
                        h = line_width;
                        w = Math.sqrt((dx * dx) + (dy * dy));

                        if (w < 1e-9) {
                            continue;
                        }

                        rw = ((h / w * dy) + dx) / 2;
                        rh = ((h / w * dx) + dy) / 2;
                        cx = (x2 + x) / 2;
                        cy = (y2 + y) / 2;

                        min_x = cx - rw < min_x ? cx - rw : min_x;
                        max_x = cx + rw > max_x ? cx + rw : max_x;

                        min_y = cy - rh < min_y ? cy - rh : min_y;
                        max_y = cy + rh > max_y ? cy + rh : max_y;
                    }
                }
            }
        } else {
            min_x = 0;
            max_x = 0;
            min_y = 0;
            max_y = 0;
        }

        const padding = this.bounds_padding;

        this._local_bounds.min_x = min_x - padding;
        this._local_bounds.max_x = max_x + padding;

        this._local_bounds.min_y = min_y - padding;
        this._local_bounds.max_y = max_y + padding;
    }

    /**
     * Draws the given shape to this Graphics object. Can be any of Circle, Rectangle, Ellipse, Line or Polygon.
     *
     * @param {Circle|Ellipse|Polygon|Rectangle|RoundedRectangle} shape - The shape object to draw.
     */
    draw_shape(shape) {
        if (this.current_path) {
            // check current path!
            const polygon = /** @type {Polygon} */(this.current_path.shape);
            if (polygon.points.length <= 2) {
                this.graphics_data.pop();
            }
        }

        this.current_path = null;

        const data = new GraphicsData(
            this.line_width,
            this.line_color,
            this.line_alpha,
            this.fill_color,
            this.fill_alpha,
            this.filling,
            this.native_lines,
            shape,
            this.line_alignment
        );

        this.graphics_data.push(data);

        if (data.type === SHAPES.POLY) {
            const shape = /** @type {Polygon} */(data.shape);
            shape.closed = shape.closed || this.filling;
            this.current_path = data;
        }

        this.dirty++;

        return data;
    }

    /**
     * Closes the current path.
     */
    close_path() {
        // ok so close path assumes next one is a hole!
        const current_path = this.current_path;

        if (current_path && current_path.shape) {
            /** @type {Polygon} */(current_path.shape).close();
        }

        return this;
    }

    /**
     * Adds a hole in the current path.
     */
    add_hole() {
        // this is a hole!
        const hole = this.graphics_data.pop();

        this.current_path = this.graphics_data[this.graphics_data.length - 1];

        this.current_path.add_hole(/** @type {Polygon} */(hole.shape));
        this.current_path = null;

        return this;
    }

    /**
     * Destroys the Graphics object.
     */
    destroy() {
        super.destroy();

        // destroy each of the GraphicsData objects
        for (let i = 0; i < this.graphics_data.length; ++i) {
            this.graphics_data[i].destroy();
        }

        // for each webgl data entry, destroy the WebGLGraphicsData
        for (const id in this._webgl) {
            for (let j = 0; j < this._webgl[id].data.length; ++j) {
                this._webgl[id].data[j].destroy();
            }
        }

        if (this._sprite_rect) {
            this._sprite_rect.destroy();
        }

        this.graphics_data = null;

        this.current_path = null;
        this._webgl = null;
        this._local_bounds = null;
    }

}

Graphics._SPRITE_TEXTURE = null;

/**
 * Graphics curves resolution settings. If `adaptive` flag is set to `true`,
 * the resolution is calculated based on the curve's length to ensure better visual quality.
 * Adaptive draw works with `bezierCurveTo` and `quadraticCurveTo`.
 *
 * @static
 * @constant
 * @property {boolean} adaptive=false - flag indicating if the resolution should be adaptive
 * @property {number} maxLength=10 - maximal length of a single segment of the curve (if adaptive = false, ignored)
 * @property {number} minSegments=8 - minimal number of segments in the curve (if adaptive = false, ignored)
 * @property {number} maxSegments=2048 - maximal number of segments in the curve (if adaptive = false, ignored)
 */
Graphics.CURVES = {
    adaptive: false,
    max_length: 10,
    min_segments: 8,
    max_segments: 2048,
};
