import { OS } from "engine/core/os/os";

import { BodyMode } from "engine/scene/2d/const";

type SelfList<T> = import("engine/core/self_list").SelfList<T>;
type SelfList$List<T> = import("engine/core/self_list").List<T>;

type Area2DSW = import("./area_2d_sw").Area2DSW;
type Body2DSW = import("./body_2d_sw").Body2DSW;
type Space2DSW = import("./space_2d_sw").Space2DSW;
type Constraint2DSW = import("./constraint_2d_sw").Constraint2DSW;

export class Step2DSW {
    _step = 1;
    _predelete() {
        return true;
    }
    _free() { }

    step(p_space: Space2DSW, p_delta: number, p_iterations: number) {
        p_space.setup(); // update inertias, etc

        let body_list: SelfList$List<Body2DSW> = p_space.active_list;

        /* INTEGRATE FORCES */

        let active_count = 0;

        let b: SelfList<Body2DSW> = body_list.first();
        while (b) {
            b.self().integrate_forces(p_delta);
            b = b.next();
            active_count++;
        }

        p_space.active_objects = active_count;

        /* GENERATE CONSTRAINT ISLANDS */

        let island_list: Body2DSW = null;
        let constraint_island_list: Constraint2DSW = null;
        b = body_list.first();

        let island_count = 0;

        while (b) {
            let body: Body2DSW = b.self();

            if (body.island_step !== this._step) {
                let island: { value: Body2DSW } = { value: null };
                let constraint_island: { value: Constraint2DSW } = { value: null };
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

        let aml: SelfList$List<Area2DSW> = p_space.area_moved_list;

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
            let ci: Constraint2DSW = constraint_island_list;
            let prev_ci: Constraint2DSW = null;
            while (ci) {
                if (this._setup_island(ci, p_delta)) {
                    let next: Constraint2DSW = ci.island_next;

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
                } else {
                    prev_ci = ci;
                }

                ci = ci.island_list_next;
            }
        }

        /* SOLVE CONSTRAINT ISLANDS */

        {
            let ci: Constraint2DSW = constraint_island_list;
            while (ci) {
                this._solve_island(ci, p_iterations, p_delta);
                ci = ci.island_list_next;
            }
        }

        /* INTEGRATE VELOCITIES */

        b = body_list.first();
        while (b) {
            let n = b.next();
            b.self().integrate_velocities(p_delta);
            b = n; // in case it shuts itself down
        }

        /* SLEEP / WAKE UP ISLANDS */

        {
            let bi: Body2DSW = island_list;
            while (bi) {
                this._check_suspend(bi, p_delta);
                bi = bi.island_list_next;
            }
        }

        p_space.update();
        this._step++;
    }

    _populate_island(p_body: Body2DSW, p_island: { value: Body2DSW; }, p_constraint_island: { value: Constraint2DSW; }) {
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
                let b: Body2DSW = c._bodies[i];
                if (b.island_step === this._step || b.mode === BodyMode.STATIC || b.mode === BodyMode.KINEMATIC) {
                    continue; // no go
                }
                this._populate_island(c._bodies[i], p_island, p_constraint_island);
            }
        }
    }

    _setup_island(p_island: Constraint2DSW, p_delta: number) {
        let ci = p_island;
        let prev_ci: Constraint2DSW = null;
        let removed_root = false;
        while (ci) {
            let process = ci.setup(p_delta);

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

    _solve_island(p_island: Constraint2DSW, p_iterations: number, p_delta: number) {
        for (let i = 0; i < p_iterations; i++) {
            let ci: Constraint2DSW = p_island;
            while (ci) {
                ci.solve(p_delta);
                ci = ci.island_next;
            }
        }
    }

    _check_suspend(p_island: Body2DSW, p_delta: number) {
        let can_sleep = true;

        let b: Body2DSW = p_island;
        while (b) {
            if (b.mode === BodyMode.STATIC || b.mode === BodyMode.KINEMATIC) {
                b = b.island_next;
                continue;
            }

            if (!b.sleep_test(p_delta)) {
                can_sleep = false;
            }

            b = b.island_next;
        }

        b = p_island;
        while (b) {
            if (b.mode === BodyMode.STATIC || b.mode === BodyMode.KINEMATIC) {
                b = b.island_next;
                continue;
            }

            let active = b.active;

            if (active === can_sleep) {
                b.set_active(!can_sleep);
            }

            b = b.island_next;
        }
    }
}
