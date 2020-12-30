import { Space2DSW } from "engine/servers/physics_2d/space_2d_sw.js";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";


export class Space2D {
    set_active(value: boolean) {
        this.active = value;
        Physics2DServer.get_singleton().space_set_active(this.space, value);
    }

    active = false;

    space: Space2DSW = Physics2DServer.get_singleton().space_create();

    get_rid() {
        return this.space;
    }
}
