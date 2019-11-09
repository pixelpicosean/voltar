import * as v from 'engine/index';


const MaxStepsPerHalfCircle = 32;
const MinStepsPerHalfCircle = 10;

export const LineCap_BUTT = 0;
export const LineCap_ROUND = 1;
export const LineCap_SQUARE = 2;

export class VGLine extends v.Node2D {
    static instance() { return new VGLine }

    constructor() {
        super();

        this.start = new v.Vector2;
        this.end = new v.Vector2;

        this.color = new v.Color(1, 1, 1, 1);

        this.width = 1;
        this.line_cap = LineCap_BUTT;

        this.points = new v.PoolVector2Array;
        /** @type {number[]} */
        this.indices = [];
    }

    /* public */

    /**
     * @param {number} x
     * @param {number} y
     */
    set_start_n(x, y) {
        this.start.set(x, y);
        this.update();
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_end_n(x, y) {
        this.end.set(x, y);
        this.update();
    }
    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    set_color_n(r, g, b, a) {
        this.color.set(r, g, b, a);
        this.update();
    }
    /**
     * @param {number} width
     */
    set_width(width) {
        this.width = width;
        this.update();
    }
    /**
     * @param {number} line_cap 0=butt, 1=round, 2=square
     */
    set_line_cap(line_cap) {
        this.line_cap = line_cap;
        this.update();
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.start !== undefined) this.set_start_n(data.start.x, data.start.y);
        if (data.end !== undefined) this.set_end_n(data.end.x, data.end.y);
        if (data.color !== undefined) this.set_color_n(data.color.r, data.color.g, data.color.b, data.color.a);
        if (data.width !== undefined) this.set_width(data.width);
        if (data.line_cap !== undefined) this.set_line_cap(data.line_cap);

        console.log(this)

        return this;
    }
    _draw() {
        const angle = Math.atan2(this.end.y - this.start.y, this.end.x - this.start.x);
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        const half_width = this.width * 0.5;

        const p0 = this.start.clone();
        const p1 = this.end.clone();

        if (this.line_cap === LineCap_SQUARE) {
            p0.subtract(half_width * c, half_width * s);
            p1.add(half_width * c, half_width * s);
        }

        if (this.line_cap === LineCap_BUTT || this.line_cap === LineCap_SQUARE) {
            this.points.set_n(0, p0.x - half_width * s, p0.y + half_width * c);
            this.points.set_n(1, p0.y + half_width * s, p0.y - half_width * c);
            this.points.set_n(2, p1.y + half_width * s, p1.y - half_width * c);
            this.points.set_n(3, p1.y - half_width * s, p1.y + half_width * c);

            this.indices[0] = 0;
            this.indices[1] = 1;
            this.indices[2] = 2;
            this.indices[3] = 0;
            this.indices[4] = 2;
            this.indices[5] = 3;
        } else {
            /* round cap */
            const steps = Math.max(MinStepsPerHalfCircle, half_width * 5 / (200 + half_width * 5) * MaxStepsPerHalfCircle) | 0;
            const angle_per_step = Math.PI / steps;
            this.points.resize(steps * 2 + 2);
            let start_angle = angle + Math.PI * 0.5;
            const vec = v.Vector2.new();
            for (let i = 0; i < steps + 1; i++) {
                this.points.set(i, vec.set(half_width, 0).rotate(start_angle + angle_per_step * i).add(this.start));
            }
            start_angle = angle - Math.PI * 0.5;
            for (let i = 0; i < steps + 1; i++) {
                this.points.set(steps + 1 + i, vec.set(half_width, 0).rotate(start_angle + angle_per_step * i).add(this.end));
            }
            v.Vector2.free(vec);

            let cursor = 0;
            // - center
            this.indices[cursor++] = 0;
            this.indices[cursor++] = steps;
            this.indices[cursor++] = steps + 1;
            this.indices[cursor++] = 0;
            this.indices[cursor++] = steps + 1;
            this.indices[cursor++] = steps * 2 + 1;
            // - start curve
            for (let i = 0; i < steps - 1; i++) {
                this.indices[cursor] = 0;
                this.indices[cursor + 1] = (i + 1);
                this.indices[cursor + 2] = (i + 2);
                cursor += 3;
            }
            // - end curve
            for (let i = 0; i < steps - 1; i++) {
                this.indices[cursor] = (steps + 1);
                this.indices[cursor + 1] = (steps + 1) + (i + 1);
                this.indices[cursor + 2] = (steps + 1) + (i + 2);
                cursor += 3;
            }
        }

        this.draw_colored_polygon(this.points, this.color, null, null, this.indices);

        v.Vector2.free(p0);
        v.Vector2.free(p1);
    }
}
v.GDCLASS(VGLine, v.Node2D)

v.attach_script('res://scene/vg/vg_line.tscn', VGLine);
