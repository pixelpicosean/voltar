import { SHAPES } from '../../../const';
import CanvasRenderer from '../CanvasRenderer';
import Graphics from '../../../scene/graphics/Graphics';

/**
 * A set of functions used to handle masking.
 */
export default class CanvasMaskManager {
    /**
     * @param {CanvasRenderer} renderer - The canvas renderer.
     */
    constructor(renderer) {
        this.renderer = renderer;
    }

    /**
     * This method adds it to the current stack of masks.
     *
     * @param {object} mask_data - the maskData that will be pushed
     */
    push_mask(mask_data) {
        const renderer = this.renderer;

        renderer.context.save();

        const cache_alpha = mask_data.alpha;
        const transform = mask_data.transform.world_transform;
        const resolution = renderer.resolution;

        renderer.context.setTransform(
            transform.a * resolution,
            transform.b * resolution,
            transform.c * resolution,
            transform.d * resolution,
            transform.tx * resolution,
            transform.ty * resolution
        );

        // TODO suport sprite alpha masks??
        // lots of effort required. If demand is great enough..
        if (!mask_data._texture) {
            this.render_graphics_shape(mask_data);
            renderer.context.clip();
        }

        mask_data.world_alpha = cache_alpha;
    }

    /**
     * Renders a Graphics shape.
     *
     * @param {Graphics} graphics - The object to render.
     */
    render_graphics_shape(graphics) {
        const context = this.renderer.context;
        const len = graphics.graphics_data.length;

        if (len === 0) {
            return;
        }

        context.beginPath();

        for (let i = 0; i < len; i++) {
            const data = graphics.graphics_data[i];
            const shape = data.shape;

            if (data.type === SHAPES.POLY) {
                const points = shape.points;

                context.moveTo(points[0], points[1]);

                for (let j = 1; j < points.length / 2; j++) {
                    context.lineTo(points[j * 2], points[(j * 2) + 1]);
                }

                // if the first and last point are the same close the path - much neater :)
                if (points[0] === points[points.length - 2] && points[1] === points[points.length - 1]) {
                    context.closePath();
                }
            }
            else if (data.type === SHAPES.RECT) {
                context.rect(shape.x, shape.y, shape.width, shape.height);
                context.closePath();
            }
            else if (data.type === SHAPES.CIRC) {
                // TODO - need to be Undefined!
                context.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                context.closePath();
            }
            else if (data.type === SHAPES.ELIP) {
                // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas

                const w = shape.width * 2;
                const h = shape.height * 2;

                const x = shape.x - (w / 2);
                const y = shape.y - (h / 2);

                const kappa = 0.5522848;
                const ox = (w / 2) * kappa; // control point offset horizontal
                const oy = (h / 2) * kappa; // control point offset vertical
                const xe = x + w;           // x-end
                const ye = y + h;           // y-end
                const xm = x + (w / 2);       // x-middle
                const ym = y + (h / 2);       // y-middle

                context.moveTo(x, ym);
                context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
                context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
                context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
                context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
                context.closePath();
            }
            else if (data.type === SHAPES.RREC) {
                const rx = shape.x;
                const ry = shape.y;
                const width = shape.width;
                const height = shape.height;
                let radius = shape.radius;

                const maxRadius = Math.min(width, height) / 2 | 0;

                radius = radius > maxRadius ? maxRadius : radius;

                context.moveTo(rx, ry + radius);
                context.lineTo(rx, ry + height - radius);
                context.quadraticCurveTo(rx, ry + height, rx + radius, ry + height);
                context.lineTo(rx + width - radius, ry + height);
                context.quadraticCurveTo(rx + width, ry + height, rx + width, ry + height - radius);
                context.lineTo(rx + width, ry + radius);
                context.quadraticCurveTo(rx + width, ry, rx + width - radius, ry);
                context.lineTo(rx + radius, ry);
                context.quadraticCurveTo(rx, ry, rx, ry + radius);
                context.closePath();
            }
        }
    }

    /**
     * Restores the current drawing context to the state it was before the mask was applied.
     *
     * @param {CanvasRenderer} renderer - The renderer context to use.
     */
    pop_mask(renderer) {
        renderer.context.restore();
        renderer.invalidate_blend_mode();
    }

    /**
     * Destroys this canvas mask manager.
     *
     */
    destroy() {
        /* empty */
    }
}
