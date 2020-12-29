export class Constraint2DSW {
    /**
     * @param {import('./body_2d_sw').Body2DSW[]} [p_bodies]
     * @param {number} [p_body_count]
     */
    constructor(p_bodies = null, p_body_count = 0) {
        this._bodies = p_bodies;
        this._body_count = p_body_count;
        this.island_step = 0;
        this.disabled_collisions_between_bodies = true;
        /**
         * @type {Constraint2DSW}
         */
        this.island_next = null;
        /**
         * @type {Constraint2DSW}
         */
        this.island_list_next = null;
    }

    _predelete() {
        return true;
    }
    _free() { }

    /**
     * @param {number} p_step
     */
    setup(p_step) {
        return false;
    }
    /**
     * @param {number} p_step
     */
    solve(p_step) { }
}
