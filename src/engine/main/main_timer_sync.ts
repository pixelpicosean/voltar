import { Engine } from "engine/core/engine";

class MainFrameTime {
    idle_step = 0.0;
    physics_steps = 0;
    interpolation_fraction = 0.0;

    clamp_idle(min_idle_step: number, max_idle_step: number) {
        if (this.idle_step < min_idle_step) {
            this.idle_step = min_idle_step;
        } else if (this.idle_step > max_idle_step) {
            this.idle_step = max_idle_step;
        }
    }
}

export class MainTimerSync {
    last_cpu_ticks_usec = 0;
    current_cpu_ticks_usec = 0;

    time_accum = 0.0;
    time_deficit = 0.0;

    static CONTROL_STEPS = 12;

    accumulated_physics_steps: number[] = Array(MainTimerSync.CONTROL_STEPS);
    typical_physics_steps: number[] = Array(MainTimerSync.CONTROL_STEPS);

    fixed_fps = 0;

    constructor() {
        for (let i = MainTimerSync.CONTROL_STEPS - 1; i >= 0; i--) {
            this.typical_physics_steps[i] = i;
            this.accumulated_physics_steps[i] = i;
        }
    }

    init(p_cpu_ticks_usec: number) {
        this.current_cpu_ticks_usec = this.last_cpu_ticks_usec = p_cpu_ticks_usec;
    }

    set_cpu_ticks_usec(p_cpu_ticks_usec: number) {
        this.current_cpu_ticks_usec = p_cpu_ticks_usec;
    }

    set_fixed_fps(p_fixed_fps: number) {
        this.fixed_fps = p_fixed_fps;
    }

    advance(p_frame_slice: number, p_iterations_per_second: number) {
        let cpu_idle_step = this.get_cpu_idle_step();
        return this.advance_checked(p_frame_slice, p_iterations_per_second, cpu_idle_step);
    }

    get_physics_jitter_fix(): number {
        return Engine.get_singleton().physics_jitter_fix;
    }

    get_average_physics_steps(r_data: { p_min: number, p_max: number }): number {
        r_data.p_min = this.typical_physics_steps[0];
        r_data.p_max = r_data.p_min + 1;

        for (let i = 1; i < MainTimerSync.CONTROL_STEPS; i++) {
            const typical_lower = this.typical_physics_steps[i];
            const current_min = typical_lower / (i + 1);
            if (current_min > r_data.p_max) {
                return i;
            } else if (current_min > r_data.p_min) {
                r_data.p_min = current_min;
            }
            const current_max = (typical_lower + 1) / (i + 1);
            if (current_max < r_data.p_min) {
                return i;
            } else if (current_max < r_data.p_max) {
                r_data.p_max = current_max;
            }
        }

        return MainTimerSync.CONTROL_STEPS;
    }

    advance_core(p_frame_slice: number, p_iterations_per_second: number, p_idle_step: number): MainFrameTime {
        ret.idle_step = p_idle_step;

        this.time_accum += ret.idle_step;
        ret.physics_steps = this.time_accum * p_iterations_per_second;

        let min_typical_steps = this.typical_physics_steps[0];
        let max_typical_steps = min_typical_steps + 1;

        let update_typical = false;

        for (let i = 0; i < MainTimerSync.CONTROL_STEPS - 1; i++) {
            let steps_left_to_match_typical = this.typical_physics_steps[i + 1] - this.accumulated_physics_steps[i];
            if (
                steps_left_to_match_typical > max_typical_steps
                ||
                steps_left_to_match_typical + 1 < min_typical_steps
            ) {
                update_typical = true;
                break;
            }

            if (steps_left_to_match_typical > min_typical_steps) {
                min_typical_steps = steps_left_to_match_typical;
            }
            if (steps_left_to_match_typical + 1 < max_typical_steps) {
                max_typical_steps = steps_left_to_match_typical + 1;
            }
        }

        if (ret.physics_steps < min_typical_steps) {
            const max_possible_steps = Math.floor(this.time_accum * p_iterations_per_second + this.get_physics_jitter_fix());
            if (max_possible_steps < min_typical_steps) {
                ret.physics_steps = max_possible_steps;
                update_typical = true;
            } else {
                ret.physics_steps = min_typical_steps;
            }
        } else if (ret.physics_steps > max_typical_steps) {
            const min_possible_steps = Math.floor(this.time_accum * p_iterations_per_second - this.get_physics_jitter_fix());
            if (min_possible_steps > max_typical_steps) {
                ret.physics_steps = min_possible_steps;
                update_typical = true;
            } else {
                ret.physics_steps = max_typical_steps;
            }
        }

        this.time_accum -= ret.physics_steps * p_frame_slice;

        for (let i = MainTimerSync.CONTROL_STEPS - 2; i >= 0; i--) {
            this.accumulated_physics_steps[i + 1] = this.accumulated_physics_steps[i] + ret.physics_steps;
        }
        this.accumulated_physics_steps[0] = ret.physics_steps;

        if (update_typical) {
            for (let i = MainTimerSync.CONTROL_STEPS - 1; i >= 0; i--) {
                if (this.typical_physics_steps[i] > this.accumulated_physics_steps[i]) {
                    this.typical_physics_steps[i] = this.accumulated_physics_steps[i];
                } else if (this.typical_physics_steps[i] < this.accumulated_physics_steps[i] - 1) {
                    this.typical_physics_steps[i] = this.accumulated_physics_steps[i] - 1;
                }
            }
        }

        return ret;
    }

    advance_checked(p_frame_slice: number, p_iterations_per_second: number, p_idle_step: number): MainFrameTime {
        if (this.fixed_fps !== -1) {
            p_idle_step = 1.0 / this.fixed_fps;
        }

        p_idle_step += this.time_deficit;

        let ret = this.advance_core(p_frame_slice, p_iterations_per_second, p_idle_step);

        const idle_minus_accum = ret.idle_step - this.time_accum;

        {
            let consistent_steps = this.get_average_physics_steps(average_data);
            if (consistent_steps > 3) {
                ret.clamp_idle(average_data.p_min * p_frame_slice, average_data.p_max * p_frame_slice);
            }
        }

        let max_clock_deviation = this.get_physics_jitter_fix() * p_frame_slice;
        ret.clamp_idle(p_idle_step - max_clock_deviation, p_idle_step + max_clock_deviation);

        ret.clamp_idle(idle_minus_accum, idle_minus_accum + p_frame_slice);

        this.time_accum = ret.idle_step - idle_minus_accum;

        this.time_deficit = p_idle_step - ret.idle_step;

        ret.interpolation_fraction = this.time_accum / p_frame_slice;

        return ret;
    }

    get_cpu_idle_step(): number {
        let cpu_ticks_elapsed = this.current_cpu_ticks_usec - this.last_cpu_ticks_usec;
        this.last_cpu_ticks_usec = this.current_cpu_ticks_usec;

        return cpu_ticks_elapsed / 1000000.0;
    }
}

const ret = new MainFrameTime;
const average_data = { p_min: 0, p_max: 0 };
