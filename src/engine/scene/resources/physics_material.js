import VObject from "engine/core/v_object";

export default class PhysicsMaterial extends VObject {
    get friction() {
        return this._friction;
    }
    /**
     * @param {number} p_value
     */
    set friction(p_value) {
        this._friction = p_value;
        this.emit_signal('changed');
    }
    /**
     * @param {number} p_value
     */
    set_friction(p_value) {
        this._friction = p_value;
        return this;
    }

    get rough() {
        return this._rough;
    }
    /**
     * @param {boolean} p_value
     */
    set rough(p_value) {
        this._rough = p_value;
        this.emit_signal('changed');
    }
    /**
     * @param {boolean} p_value
     */
    set_rough(p_value) {
        this._rough = p_value;
        return this;
    }

    get bounce() {
        return this._bounce;
    }
    /**
     * @param {number} p_value
     */
    set bounce(p_value) {
        this._bounce = p_value;
        this.emit_signal('changed');
    }
    /**
     * @param {number} p_value
     */
    set_bounce(p_value) {
        this._bounce = p_value;
        return this;
    }

    get absorbent() {
        return this._absorbent;
    }
    /**
     * @param {boolean} p_value
     */
    set absorbent(p_value) {
        this._absorbent = p_value;
        this.emit_signal('changed');
    }
    /**
     * @param {boolean} p_value
     */
    set_absorbent(p_value) {
        this._absorbent = p_value;
        return this;
    }

    get computed_friction() {
        return this.rough ? -this.friction : this.friction;
    }
    get computed_bounce() {
        return this.absorbent ? -this.bounce : this.bounce;
    }
    constructor() {
        super();

        this._friction = 1;
        this._rough = false;
        this._bounce = 0;
        this._absorbent = false;
    }
}
