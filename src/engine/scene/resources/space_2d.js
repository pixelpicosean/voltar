import Space2DSW from "engine/servers/physics_2d/space_2d_sw";
import PhysicsServer from "engine/servers/physics_2d/physics_server";

export default class Space2D {
    get active() {
        return this._active;
    }
    /**
     * @param {boolean} value
     */
    set active(value) {
        this._active = value;
        PhysicsServer.singleton.space_set_active(this.space, value);
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_active(value) {
        this.active = value;
        return this;
    }
    constructor() {
        this._active = false;

        /**
         * @type {Space2DSW}
         */
        this.space = null;
    }

    get_rid() {
        return this.space;
    }
}
