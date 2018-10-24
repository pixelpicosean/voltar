import CollisionObject2D from './CollisionObject2D';
import { remove_items, Signal } from 'engine/dep/index';

export default class Area2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'Area2D';

        this.touched_areas = [];
        this.prev_touched_areas = [];

        this.touched_bodies = [];
        this.prev_touched_bodies = [];

        this.area_entered = new Signal();
        this.area_exited = new Signal();
        this.body_entered = new Signal();
        this.body_exited = new Signal();
    }

    _area_inout(is_in, area) {
        if (is_in) {
            this.area_entered.dispatch(area);
        } else {
            this.area_exited.dispatch(area);
        }
    }
    _body_inout(is_in, body) {
        if (is_in) {
            this.body_entered.dispatch(body);
        } else {
            this.body_exited.dispatch(body);
        }
    }
}
