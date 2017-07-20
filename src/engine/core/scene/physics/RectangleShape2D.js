import { Vector } from '../../math';

export default class RectangleShape2D {
    constructor(extent_x = 4, extent_y = 4) {
        this.extents = new Vector(extent_x, extent_y);
    }
}
