import { VObject } from "engine/core/v_object.js";

export class PhysicsMaterial extends VObject {
    /**
     * @param {number} p_value
     */
    set_friction(p_value) {
        this.friction = p_value;
        this.emit_signal('changed');
    }

    /**
     * @param {boolean} p_value
     */
    set_rough(p_value) {
        this.rough = p_value;
        this.emit_signal('changed');
    }

    /**
     * @param {number} p_value
     */
    set_bounce(p_value) {
        this.bounce = p_value;
        this.emit_signal('changed');
    }

    /**
     * @param {boolean} p_value
     */
    set_absorbent(p_value) {
        this.absorbent = p_value;
        this.emit_signal('changed');
    }

    get_computed_friction() {
        return this.rough ? -this.friction : this.friction;
    }
    get_computed_bounce() {
        return this.absorbent ? -this.bounce : this.bounce;
    }

    constructor() {
        super();

        this.friction = 1;
        this.rough = false;
        this.bounce = 0;
        this.absorbent = false;
    }
}
