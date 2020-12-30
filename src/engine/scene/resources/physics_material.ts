import { VObject } from "engine/core/v_object";

export class PhysicsMaterial extends VObject {
    get_computed_friction() {
        return this.rough ? -this.friction : this.friction;
    }
    get_computed_bounce() {
        return this.absorbent ? -this.bounce : this.bounce;
    }

    friction = 1;
    rough = false;
    bounce = 0;
    absorbent = false;
}
