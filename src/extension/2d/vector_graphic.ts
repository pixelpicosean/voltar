import {
    Vector2,
    Vector2Like,
    Rect2,
    Color,
    ColorLike,
    PoolVector2Array,

    node_class_map,
    GDCLASS,

    Node2D,
} from 'engine/index';

const MaxStepsPerHalfCircle = 32;
const MinStepsPerHalfCircle = 10;

const RECT = 0;
const CIRCLE = 1;
const CAPSULE = 2;

const rect = new Rect2;

interface VGShape {
    type: number;
    extents?: Vector2Like;
    radius?: number;
    height?: number;
}

export class VectorGraphic extends Node2D {
    static instance() { return new VectorGraphic }

    _shape: VGShape = null;
    color = new Color(1, 1, 1, 1);

    /* public */

    set_shape(p_shape: VGShape) {
        this._shape = p_shape;
        this.update();
    }
    set_color(color: ColorLike) {
        this.color.copy(color);
        this.update();
    }
    set_color_n(r: number, g: number, b: number, a: number) {
        this.color.set(r, g, b, a);
        this.update();
    }

    /* virtual */

    _load_data(p_data: any) {
        super._load_data(p_data);

        if (p_data.shape !== undefined) {
            this.set_shape(p_data.shape);
        }
        if (p_data.color !== undefined) {
            this.set_color(p_data.color);
        }

        return this;
    }
    _draw() {
        const shape = this._shape;
        if (!shape) return;

        switch (shape.type) {
            case RECT: {
                this.draw_rect(rect.set(-shape.extents.x, -shape.extents.y, shape.extents.x * 2, shape.extents.y * 2), this.color);
            } break;
            case CIRCLE: {
                this.draw_circle(Vector2.ZERO, shape.radius, this.color);
            } break;
            case CAPSULE: {
                const radius = shape.radius;

                const p0 = _i_vec2_1.set(0, -shape.height / 2);
                const p1 = _i_vec2_2.set(0, +shape.height / 2);

                const points = new PoolVector2Array;
                const indices: number[] = [];

                /* round cap */
                const steps = Math.max(MinStepsPerHalfCircle, radius * 5 / (200 + radius * 5) * MaxStepsPerHalfCircle) | 0;
                const angle_per_step = Math.PI / steps;
                points.resize(steps * 2 + 2);
                let start_angle = Math.PI;
                const vec = _i_vec2_3;
                for (let i = 0; i < steps + 1; i++) {
                    points.set(i, vec.set(radius, 0).rotate(start_angle + angle_per_step * i).add(p0));
                }
                start_angle = 0;
                for (let i = 0; i < steps + 1; i++) {
                    points.set(steps + 1 + i, vec.set(radius, 0).rotate(start_angle + angle_per_step * i).add(p1));
                }

                let cursor = 0;
                // - body
                indices[cursor++] = 0;
                indices[cursor++] = steps;
                indices[cursor++] = steps + 1;
                indices[cursor++] = 0;
                indices[cursor++] = steps + 1;
                indices[cursor++] = steps * 2 + 1;
                // - start curve
                for (let i = 0; i < steps - 1; i++) {
                    indices[cursor] = 0;
                    indices[cursor + 1] = (i + 1);
                    indices[cursor + 2] = (i + 2);
                    cursor += 3;
                }
                // - end curve
                for (let i = 0; i < steps - 1; i++) {
                    indices[cursor] = (steps + 1);
                    indices[cursor + 1] = (steps + 1) + (i + 1);
                    indices[cursor + 2] = (steps + 1) + (i + 2);
                    cursor += 3;
                }

                this.draw_colored_polygon(points, this.color, null, null, indices);
            } break;
        }
    }
}

node_class_map['VectorGraphic'] = GDCLASS(VectorGraphic, Node2D)

const _i_vec2_1 = new Vector2;
const _i_vec2_2 = new Vector2;
const _i_vec2_3 = new Vector2;
