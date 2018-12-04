export default class Step2DSW {
    constructor() {
        this._step = 1;
    }

    /**
     * @param {import('../../scene/resources/space_2d').default} p_space
     * @param {number} p_delta
     * @param {number} p_iterations
     */
    step(p_space, p_delta, p_iterations) {
        p_space.setup(); // update inertias, etc

        // const body_list = p_space.get_active_body_list();

        /* INTEGRATE FORCES */

        let profile_begtime = performance.now();
        let profile_endtime = 0;

        let active_count = 0;

        // TODO: body list and others

        /* GENERATE CONSTRAINT ISLANDS */

        // const aml = p_space.get_moved_area_list();

        // while (aml.length > 0) {
        // }

        /* SETUP CONSTRAINT ISLANDS */

        /* SOLVE CONSTRAINT ISLANDS */

        /* INTEGRATE VELOCITIES */

        /* SLEEP / WAKE UP ISLANDS */

        p_space.update();
        this._step++;
    }

    _populate_island(p_body, p_island, p_constraint_island) { }
    _step_island(p_island, p_delta) { }
    _solve_island(p_island, p_iterations, p_delta) { }
    _check_suspend(p_island, p_delta) { }
}
