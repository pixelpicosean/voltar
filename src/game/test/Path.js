import * as v from 'engine/index';
import layout from 'scene/PathSample.json';

export default class PathTest extends v.Node2D {
    static instance() {
        return v.assemble_scene(new PathTest(), layout);
    }
    _ready() {
        /**
         * @type {v.PathFollow2D}
         */
        this.follower = this.get_node('Path2D/PathFollow2D');

        this.set_process(true);
    }
    /**
     * @param {number} delta
     */
    _process(delta) {
        this.follower.offset += 200 * delta;

        if (this.follower.unit_offset > 1) {
            this.follower.unit_offset -= 1;
        }
    }
}
