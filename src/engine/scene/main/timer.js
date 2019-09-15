import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';

import {
    Node,
    NOTIFICATION_READY,
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
} from './node';


export const TIMER_PROCESS_PHYSICS = 0;
export const TIMER_PROCESS_IDLE = 1;

export class Timer extends Node {
    get class() { return 'Timer' }

    /** @property {number} */
    get_process_mode() {
        return this.process_mode;
    }
    set_process_mode(p_mode) {
        if (this.process_mode === p_mode) {
            return;
        }

        switch (this.process_mode) {
            case TIMER_PROCESS_PHYSICS: {
                if (this.is_physics_process_internal()) {
                    this.set_physics_process_internal(false);
                    this.set_process_internal(true);
                }
            } break;
            case TIMER_PROCESS_IDLE: {
                if (this.is_process_internal()) {
                    this.set_process_internal(false);
                    this.set_physics_process_internal(true);
                }
            } break;
        }
        this.process_mode = p_mode;
    }

    /** @property {boolean} */
    get_paused() {
        return this.paused;
    }
    set_paused(paused) {
        if (this.paused === paused) {
            return;
        }

        this.paused = paused;
        this._set_process(this.processing);
    }

    constructor() {
        super();

        this.wait_time = 1;
        this.autostart = false;
        this.one_shot = false;
        this.processing = false;
        this.paused = false;
        this.process_mode = TIMER_PROCESS_IDLE;
        this.time_left = -1;
    }

    /* virtual */

    _load_data(data) {
        if (data.wait_time !== undefined) this.wait_time = data.wait_time;
        if (data.autostart !== undefined) this.autostart = data.autostart;
        if (data.one_shot !== undefined) this.one_shot = data.one_shot;
        if (data.process_mode !== undefined) this.set_process_mode(data.process_mode);

        return super._load_data(data);
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_READY: {
                if (this.autostart) {
                    this.start();
                    this.autostart = false;
                }
            } break;
            case NOTIFICATION_INTERNAL_PROCESS: {
                if (this.process_mode === TIMER_PROCESS_PHYSICS || !this.is_process_internal()) {
                    return;
                }
                this.time_left -= this.get_process_delta_time();

                if (this.time_left < 0) {
                    if (!this.one_shot) {
                        this.time_left += this.wait_time;
                    } else {
                        this.stop();
                    }

                    this.emit_signal('timeout');
                }
            } break;
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: {
                if (this.process_mode === TIMER_PROCESS_IDLE || !this.is_physics_process_internal()) {
                    return;
                }
                this.time_left -= this.get_physics_process_delta_time();

                if (this.time_left < 0) {
                    if (!this.one_shot) {
                        this.time_left += this.wait_time;
                    } else {
                        this.stop();
                    }

                    this.emit_signal('timeout');
                }
            } break;
        }
    }

    /* public */

    start(time_sec = -1) {
        if (time_sec > 0) {
            this.wait_time = time_sec;
        }
        this.time_left = this.wait_time;
        this._set_process(true);
    }
    stop() {
        this.time_left = -1;
        this._set_process(false);
        this.autostart = false;
    }

    is_stopped() {
        return this.get_time_left() <= 0;
    }

    /* private */

    /**
     * @param {boolean} p_process
     * @param {boolean} [p_force]
     */
    _set_process(p_process, p_force = false) {
        switch (this.process_mode) {
            case TIMER_PROCESS_PHYSICS: {
                this.set_physics_process_internal(p_process && !this.paused);
            } break;
            case TIMER_PROCESS_IDLE: {
                this.set_process_internal(p_process && !this.paused);
            } break;
        }
    }

    get_time_left() {
        return this.time_left > 0 ? this.time_left : 0;
    }
}
node_class_map['Timer'] = GDCLASS(Timer, Node)