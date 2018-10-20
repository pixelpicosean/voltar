import * as v from 'engine/index';
import * as filters from 'engine/filters/index';

export default class ExtractTest extends v.Node2D {
    static instance() {
        return new ExtractTest();
    }

    _enter_tree() {
        let spr = this.add_child(new v.Sprite('title/pop'));
        spr.position.set(200, 200);
        spr.anchor.set(0.5, 0.5);
        spr.filters = [
            new filters.Noise(1),
            new filters.Blur(1, 1, 1),
        ];

        let mask = this.add_child(new v.Graphics())
            .begin_fill(0xFFFFFF)
            .draw_circle(200, 200, 100)
            .end_fill()
        spr.mask = mask;

        setTimeout(() => {
            // Extract the whole canvas
            const img = v.scene_tree.extract.image(this)

            img.style.position = 'absolute';
            img.style.left = '0';
            img.style.top = '0';

            // Add the generated `img` to document top left
            document.body.appendChild(img);
        }, 1000)
    }
}
