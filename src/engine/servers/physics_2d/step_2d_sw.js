import { BodyMode } from "engine/scene/2d/const";

import { Space2DSW } from "./space_2d_sw";
import { Body2DSW } from "./body_2d_sw";
import { Constraint2DSW } from "./constraint_2d_sw";

export class Step2DSW {
    constructor() {
        this._step = 1;
    }

    /**
     * @param {Space2DSW} p_space
     * @param {number} p_delta
     * @param {number} p_iterations
     */
    step(p_space, p_delta, p_iterations) {
        p_space.setup(); // update inertias, etc

        const body_list = p_space.active_list;

        /* INTEGRATE FORCES */

        let profile_begtime = performance.now();
        let profile_endtime = 0;

        let active_count = 0;

        let b = body_list.first();
        while (b) {
            b.self().integrate_forces(p_delta);
            b = b.next();
            active_count++;
        }

        p_space.active_objects = active_count;

        /* GENERATE CONSTRAINT ISLANDS */

        /** @type {Body2DSW} */
        let island_list = null;
        /** @type {Constraint2DSW} */
        let constraint_island_list = null;
        b = body_list.first();

        let island_count = 0;

        while (b) {
            const body = b.self();

            if (body.island_step !== this._step) {
                /** @type {{ value: Body2DSW }} */
                let island = { value: null };
                /** @type {{ value: Constraint2DSW }} */
                let constraint_island = { value: null };
                this._populate_island(body, island, constraint_island);

                island.value.island_list_next = island_list;
                island_list = island.value;

                if (constraint_island.value) {
                    constraint_island.value.island_list_next = constraint_island_list;
                    constraint_island_list = constraint_island.value;
                    island_count++;
                }
            }
            b = b.next();
        }

        p_space.island_count = island_count;

        const aml = p_space.area_moved_list;

        while (aml.first()) {
            for (let c of aml.first().self().constraints) {
                if (c.island_step === this._step) {
                    continue;
                }
                c.island_step = this._step;
                c.island_next = null;
                c.island_list_next = constraint_island_list;
                constraint_island_list = c;
            }
            p_space.area_remove_from_moved_list(aml.first());
        }

        /* SETUP CONSTRAINT ISLANDS */

        {
            let ci = constraint_island_list;
            /** @type {Constraint2DSW} */
            let prev_ci = null;
            while (ci) {
                if (this._setup_island(ci, p_delta)) {
                    let next = ci.island_next;

                    if (next) {
                        next.island_list_next = ci.island_list_next;
                        if (prev_ci) {
                            prev_ci.island_list_next = next;
                        } else {
                            constraint_island_list = next;
                        }
                        prev_ci = next;
                    } else {
                        if (prev_ci) {
                            prev_ci.island_list_next = ci.island_list_next;
                        } else {
                            constraint_island_list = ci.island_list_next;
                        }
                    }
                }

                ci = ci.island_list_next;
            }
        }

        /* SOLVE CONSTRAINT ISLANDS */

        {
            let ci = constraint_island_list;
            while (ci) {
                this._solve_island(ci, p_iterations, p_delta);
                ci = ci.island_list_next;
            }
        }

        /* INTEGRATE VELOCITIES */

        b = body_list.first();
        while (b) {
            const n = b.next();
            b.self().integrate_velocities(p_delta);
            b = n; // in case it shuts itself down
        }

        /* SLEEP / WAKE UP ISLANDS */

        {
            let bi = island_list;
            while (bi) {
                this._check_suspend(bi, p_delta);
                bi = bi.island_list_next;
            }
        }

        p_space.update();
        this._step++;
    }

    /**
     * @param {Body2DSW} p_body
     * @param {{ value: Body2DSW }} p_island
     * @param {{ value: Constraint2DSW }} p_constraint_island
     */
    _populate_island(p_body, p_island, p_constraint_island) {
        p_body.island_step = this._step;
        p_body.island_next = p_island.value;
        p_island.value = p_body;

        for (let [c, E] of p_body.constraint_map) {
            if (c.island_step === this._step) {
                continue;
            }
            c.island_step = this._step;
            c.island_next = p_constraint_island.value;
            p_constraint_island.value = c;

            for (let i = 0; i < c._body_count; i++) {
                if (i === E) {
                    continue;
                }
                const b = c._bodies[i];
                if (b.island_step === this._step || b.mode === BodyMode.STATIC || b.mode === BodyMode.KINEMATIC) {
                    continue; // no go
                }
                this._populate_island(c._bodies[i], p_island, p_constraint_island);
            }
        }
    }
    /**
     * @param {Constraint2DSW} p_island
     * @param {number} p_delta
     */
    _setup_island(p_island, p_delta) {
        let ci = p_island;
        /** @type {Constraint2DSW} */
        let prev_ci = null;
        let removed_root = false;
        while (ci) {
            const process = ci.setup(p_delta);

            if (!process) {
                if (prev_ci) {
                    prev_ci.island_next = ci.island_next;
                } else {
                    removed_root = true;
                    prev_ci = ci;
                }
            } else {
                prev_ci = ci;
            }
            ci = ci.island_next;
        }

        return removed_root;
    }
    /**
     * @param {Constraint2DSW} p_island
     * @param {number} p_iterations
     * @param {number} p_delta
     */
    _solve_island(p_island, p_iterations, p_delta) {
        for (let i = 0; i < p_iterations; i++) {
            let ci = p_island;
            while (ci) {
                ci.solve(p_delta);
                ci = ci.island_next;
            }
        }
    }
    /**
     * @param {Body2DSW} p_island
     * @param {number} p_delta
     */
    _check_suspend(p_island, p_delta) {
        let can_sleep = true;

        let b = p_island;
        while (b) {
            if (b.mode === BodyMode.STATIC || b.mode === BodyMode.KINEMATIC) {
                b = b.island_next;
                continue;
            }

            const active = b.active;

            if (active === can_sleep) {
                b.set_active(!can_sleep);
            }

            b = b.island_next;
        }
    }
}
