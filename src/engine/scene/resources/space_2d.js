import { Space2DSW } from "engine/servers/physics_2d/space_2d_sw.js";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";


export class Space2D {
    /**
     * @param {boolean} value
     */
    set_active(value) {
        this.active = value;
        Physics2DServer.get_singleton().space_set_active(this.space, value);
    }
    constructor() {
        this.active = false;

        /**
         * @type {Space2DSW}
         */
        this.space = Physics2DServer.get_singleton().space_create();
    }

    get_rid() {
        return this.space;
    }
}
