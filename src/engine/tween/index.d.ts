declare namespace tween {
    type Tweenable = string | number | boolean | { x: number, y: number };
    class InterpolateData {
        active: boolean;
        finish: boolean;

        duration: number;
        delay: number;
        elapsed: number;

        type: number;
        val_type: number;
        easing: Function;

        obj: any;
        key: string;
        flat_key: string;
        target_obj: any;
        target_key: string;
        flat_target_key: string[];

        initial_val: Tweenable;
        delta_val: Tweenable;
        final_val: Tweenable;

        call_deferred: boolean;
        args: any;

        protected _init();
    }
    type Easing = 'Linear.None'
        | 'Quadratic.In' | 'Quadratic.Out' | 'Quadratic.InOut'
        | 'Cubic.In' | 'Cubic.Out' | 'Cubic.InOut'
        | 'Quartic.In' | 'Quartic.Out' | 'Quartic.InOut'
        | 'Quintic.In' | 'Quintic.Out' | 'Quintic.InOut'
        | 'Sinusoidal.In' | 'Sinusoidal.Out' | 'Sinusoidal.InOut'
        | 'Exponential.In' | 'Exponential.Out' | 'Exponential.InOut'
        | 'Circular.In' | 'Circular.Out' | 'Circular.InOut'
        | 'Elastic.In' | 'Elastic.Out' | 'Elastic.InOut'
        | 'Back.In' | 'Back.Out' | 'Back.InOut'
        | 'Bounce.In' | 'Bounce.Out' | 'Bounce.InOut';

    export class Tween extends EventEmitter {
        is_removed: boolean;

        autoplay: boolean;
        active: boolean;
        repeat: boolean;
        speed_scale: number;

        interpolates: InterpolateData[];

        constructor();

        connect(event: string, fn: Function, context?: any): Tween;
        connect_once(event: string, fn: Function, context?: any): Tween;
        disconnect(event: string, fn: Function, context?: any): Tween;
        disconnect_all(event: string): Tween;
        emit_signal(event: string, a1?: any, a2?: any, a3?: any, a4?: any, a5?: any): Tween;

        set_active(active: boolean): Tween;
        set_speed_scale(scale: number): Tween;

        start(): Tween;
        reset(obj: any, key: string): Tween;
        reset_all(): Tween;
        stop(obj: any, key: string): Tween;
        stop_all(): Tween;
        resume(obj: any, key: string): Tween;
        resume_all(): Tween;
        remove(obj: any, key: string, first_only: boolean): Tween;
        remove_all(): Tween;

        seek(p_time: number): Tween;
        tell(): number;
        get_runtime(): number;

        interpolate_property<T, K extends keyof T, S extends Tweenable>(obj: T, property: K, initial_val: S, final_val: S, duration: number, p_easing: Easing, delay?: number): Tween;
        interpolate_method<T, K extends keyof T, S extends Tweenable>(obj: T, method: K, initial_val: S, final_val: S, duration: number, p_easing: Easing, delay?: number): Tween
        interpolate_callback<T, K extends keyof T>(obj: T, duration: number, callback: K, args?: any): Tween
        interpolate_deferred_callback<T, K extends keyof T>(obj: T, duration: number, callback: K, args?: any): Tween
        follow_property<T, K extends keyof T, S extends Tweenable>(obj: T, property: K, initial_val: S, target: any, target_property: string, duration: number, p_easing: Easing, delay?: number): Tween
        follow_method<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, method: K, initial_val: S, target: T2, target_method: K2, duration: number, p_easing: Easing, delay?: number): Tween
        targeting_property<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, property: K, initial: T2, initial_property: K2, final_val: S, duration: number, p_easing: Easing, delay?: number): Tween
        targeting_method<T, K extends keyof T, T2, K2 extends keyof T2, S extends Tweenable>(obj: T, method: K, initial: T2, initial_method: K2, final_val: S, duration: number, p_easing: Easing, delay?: number): Tween

        clear_events(): Tween;

        protected _init();
        protected _propagate_process(delta: number);
        protected _get_initial_val(p_data: InterpolateData): Tweenable;
        protected _get_delta_val(p_data: InterpolateData): Tweenable;
        protected _calc_delta_val(initial_val: Tweenable, final_val: Tweenable, data: InterpolateData): boolean;
        protected _run_equation(data: InterpolateData): Tweenable;
        protected _apply_tween_value(data: InterpolateData, value: Tweenable): boolean;
    }

    export class TweenManager {
        tweens: Tween[];

        constructor();

        /**
         * Add a tween instance to the manager
         *
         * @param {Tween} tween
         * @returns {Tween} The added tween
         */
        add(tween: Tween): Tween;
        /**
         * Remove a tween instance from the manager
         *
         * @param {Tween} tween
         */
        remove(tween: Tween);
        /**
         * Create a tween instance
         *
         * @param {boolean} [add] Whether add to update list
         * @returns {Tween} Created tween
         */
        create(add?: boolean): Tween;

        _process(delta: number);
        _stop_all();
    }
}
