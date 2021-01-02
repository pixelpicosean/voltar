type Body2DSW = import("./body_2d_sw").Body2DSW;

export class Constraint2DSW {
    _bodies: Body2DSW[];
    _body_count = 0;
    island_step = 0;
    disabled_collisions_between_bodies = true;
    island_next: Constraint2DSW = null;
    island_list_next: Constraint2DSW = null;

    constructor(p_bodies: Body2DSW[] = null, p_body_count: number = 0) {
        this._bodies = p_bodies;
        this._body_count = p_body_count;
    }

    _predelete() {
        return true;
    }
    _free() { }

    setup(p_step: number): boolean { return false }
    solve(p_step: number) { }
}
