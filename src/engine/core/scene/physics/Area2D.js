import CollisionObject2D from './CollisionObject2D';
import Signal from 'engine/Signal';

export default class Area2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'Area2D';

        this.area_map = {};
        this.body_map = {};

        this.area_entered = new Signal();
        this.area_exited = new Signal();
        this.body_entered = new Signal();
        this.body_exited = new Signal();
    }
    area_enter(area) {}
    area_exit(area) {}
    body_enter(body) {}
    body_exit(body) {}

    _area_inout(is_in, area) {
        if (is_in) {
            if (!this.area_map[area.id]) {
                this.area_map[area.id] = area;
                this.area_enter(area);
                this.area_entered.dispatch(area);

                area.tree_exited.once(() => delete this.area_map[area.id]);
            }
        }
        else {
            delete this.area_map[area.id];
            this.area_exit(area);
            this.area_exited.dispatch(area);
        }
    }
    _body_inout(is_in, body) {
        if (is_in) {
            if (!this.body_map[body.id]) {
                this.body_map[body.id] = body;
                this.body_enter(body);
                this.body_entered.dispatch(body);

                body.tree_exited.once(() => delete this.body_map[body.id]);
            }
        }
        else {
            delete this.body_map[body.id];
            this.body_exit(body);
            this.body_exited.dispatch(body);
        }
    }
}