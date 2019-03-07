import settings from '../settings';
import { UPDATE_PRIORITY } from '../const';
import TickerListener from './ticker_listener';

/**
 * A Ticker class that runs an update loop that other objects listen to.
 * This class is composed around listeners
 * meant for execution on the next requested animation frame.
 * Animation frames are requested only when necessary,
 * e.g. When the ticker is started and the emitter has listeners.
 */
export default class Ticker {
    constructor() {
        /**
         * The first listener. All new listeners added are chained on this.
         * @private
         * @type {TickerListener}
         */
        this._head = new TickerListener(null, null, Infinity);

        /**
         * Internal current frame request ID
         * @private
         * @type {number}
         */
        this._request_id = null;

        /**
         * Internal value managed by min_FPS property setter and getter.
         * This is the maximum allowed milliseconds between updates.
         * @private
         */
        this._max_elapsed_ms = 100;

        /**
         * Whether or not this ticker should invoke the method
         * {@link Ticker#start} automatically
         * when a listener is added.
         *
         * @type {boolean}
         * @default false
         */
        this.auto_start = false;

        /**
         * Scalar time value from last frame to this frame.
         * This value is capped by setting {@link Ticker#min_FPS}
         * and is scaled with {@link Ticker#speed}.
         * **Note:** The cap may be exceeded by scaling.
         *
         * @type {number}
         * @default 1
         */
        this.delta_time = 1;

        /**
         * Time elapsed in milliseconds from last frame to this frame.
         * Opposed to what the scalar {@link Ticker#delta_time}
         * is based, this value is neither capped nor scaled.
         * If the platform supports DOMHighResTimeStamp,
         * this value will have a precision of 1 µs.
         * Defaults to target frame time
         *
         * @type {number}
         * @default 16.66
         */
        this.elapsed_ms = 1 / settings.TARGET_FPMS;

        /**
         * The last time {@link Ticker#update} was invoked.
         * This value is also reset internally outside of invoking
         * update, but only when a new animation frame is requested.
         * If the platform supports DOMHighResTimeStamp,
         * this value will have a precision of 1 µs.
         *
         * @type {number}
         * @default -1
         */
        this.last_time = -1;

        /**
         * Factor of current {@link Ticker#delta_time}.
         * @example
         * // Scales delta_time to what would be
         * // the equivalent of approximately 120 FPS
         * speed = 2;
         *
         * @type {number}
         * @default 1
         */
        this.speed = 1;

        /**
         * Whether or not this ticker has been started.
         * `true` if {@link Ticker#start} has been called.
         * `false` if {@link Ticker#stop} has been called.
         * While `false`, this value may change to `true` in the
         * event of {@link Ticker#auto_start} being `true`
         * and a listener is added.
         *
         * @type {boolean}
         * @default false
         */
        this.started = false;

        /**
         * Internal tick method bound to ticker instance.
         * This is because in early 2015, Function.bind
         * is still 60% slower in high performance scenarios.
         * Also separating frame requests from update method
         * so listeners may be called at any time and with
         * any animation API, just invoke update(time).
         *
         * @private
         * @param {number} time - Time since last tick.
         */
        this._tick = (time) => {
            this._request_id = null;

            if (this.started) {
                // Invoke listeners now
                this.update(time);
                // Listener side effects may have modified ticker state.
                if (this.started && this._request_id === null && this._head.next) {
                    this._request_id = requestAnimationFrame(this._tick);
                }
            }
        };
    }

    /**
     * Conditionally requests a new animation frame.
     * If a frame has not already been requested, and if the internal
     * emitter has listeners, a new frame is requested.
     *
     * @private
     */
    _request_if_needed() {
        if (this._request_id === null && this._head.next) {
            // ensure callbacks get correct delta
            this.last_time = performance.now();
            this._request_id = requestAnimationFrame(this._tick);
        }
    }

    /**
     * Conditionally cancels a pending animation frame.
     *
     * @private
     */
    _cancel_if_needed() {
        if (this._request_id !== null) {
            cancelAnimationFrame(this._request_id);
            this._request_id = null;
        }
    }

    /**
     * Conditionally requests a new animation frame.
     * If the ticker has been started it checks if a frame has not already
     * been requested, and if the internal emitter has listeners. If these
     * conditions are met, a new frame is requested. If the ticker has not
     * been started, but auto_start is `true`, then the ticker starts now,
     * and continues with the previous conditions to request a new frame.
     *
     * @private
     */
    _start_ff_possible() {
        if (this.started) {
            this._request_if_needed();
        } else if (this.auto_start) {
            this.start();
        }
    }

    /**
     * Register a handler for tick events. Calls continuously unless
     * it is removed or the ticker is stopped.
     *
     * @param {Function} fn - The listener function to be added for updates
     * @param {any} [context] - The listener context
     * @param {number} [priority=UPDATE_PRIORITY.NORMAL] - The priority for emitting
     * @returns {Ticker} This instance of a ticker
     */
    add(fn, context, priority = UPDATE_PRIORITY.NORMAL) {
        return this._add_listener(new TickerListener(fn, context, priority));
    }

    /**
     * Add a handler for the tick event which is only execute once.
     *
     * @param {Function} fn - The listener function to be added for one update
     * @param {Function} [context] - The listener context
     * @param {number} [priority=UPDATE_PRIORITY.NORMAL] - The priority for emitting
     * @returns {Ticker} This instance of a ticker
     */
    add_once(fn, context, priority = UPDATE_PRIORITY.NORMAL) {
        return this._add_listener(new TickerListener(fn, context, priority, true));
    }

    /**
     * Internally adds the event handler so that it can be sorted by priority.
     * Priority allows certain handler (user, AnimatedSprite, Interaction) to be run
     * before the rendering.
     *
     * @private
     * @param {TickerListener} listener - Current listener being added.
     * @returns {Ticker} This instance of a ticker
     */
    _add_listener(listener) {
        // For attaching to head
        let current = this._head.next;
        let previous = this._head;

        // Add the first item
        if (!current) {
            listener.connect(previous);
        } else {
            // Go from highest to lowest priority
            while (current) {
                if (listener.priority > current.priority) {
                    listener.connect(previous);
                    break;
                }
                previous = current;
                current = current.next;
            }

            // Not yet connected
            if (!listener.previous) {
                listener.connect(previous);
            }
        }

        this._start_ff_possible();

        return this;
    }

    /**
     * Removes any handlers matching the function and context parameters.
     * If no handlers are left after removing, then it cancels the animation frame.
     *
     * @param {Function} fn - The listener function to be removed
     * @param {any} [context] - The listener context to be removed
     * @returns {Ticker} This instance of a ticker
     */
    remove(fn, context) {
        let listener = this._head.next;

        while (listener) {
            // We found a match, lets remove it
            // no break to delete all possible matches
            // incase a listener was added 2+ times
            if (listener.match(fn, context)) {
                listener = listener.destroy();
            } else {
                listener = listener.next;
            }
        }

        if (!this._head.next) {
            this._cancel_if_needed();
        }

        return this;
    }

    /**
     * Starts the ticker. If the ticker has listeners
     * a new animation frame is requested at this point.
     */
    start() {
        if (!this.started) {
            this.started = true;
            this._request_if_needed();
        }
    }

    /**
     * Stops the ticker. If the ticker has requested
     * an animation frame it is canceled at this point.
     */
    stop() {
        if (this.started) {
            this.started = false;
            this._cancel_if_needed();
        }
    }

    /**
     * Destroy the ticker and don't use after this. Calling
     * this method removes all references to internal events.
     */
    destroy() {
        this.stop();

        let listener = this._head.next;

        while (listener) {
            listener = listener.destroy(true);
        }

        this._head.destroy();
        this._head = null;
    }

    /**
     * Triggers an update. An update entails setting the
     * current {@link Ticker#elapsed_ms},
     * the current {@link Ticker#delta_time},
     * invoking all listeners with current delta_time,
     * and then finally setting {@link Ticker#last_time}
     * with the value of currentTime that was provided.
     * This method will be called automatically by animation
     * frame callbacks if the ticker instance has been started
     * and listeners are added.
     *
     * @param {number} [current_time] - the current time of execution
     */
    update(current_time = -1) {
        current_time = current_time || performance.now();

        /** @type {number} */
        let elapsed_ms = 0;

        // If the difference in time is zero or negative, we ignore most of the work done here.
        // If there is no valid difference, then should be no reason to let anyone know about it.
        // A zero delta, is exactly that, nothing should update.
        //
        // The difference in time can be negative, and no this does not mean time traveling.
        // This can be the result of a race condition between when an animation frame is requested
        // on the current JavaScript engine event loop, and when the ticker's start method is invoked
        // (which invokes the internal _requestIfNeeded method). If a frame is requested before
        // _requestIfNeeded is invoked, then the callback for the animation frame the ticker requests,
        // can receive a time argument that can be less than the last_time value that was set within
        // _requestIfNeeded. This difference is in microseconds, but this is enough to cause problems.
        //
        // This check covers this browser engine timing issue, as well as if consumers pass an invalid
        // currentTime value. This may happen if consumers opt-out of the auto_start, and update themselves.

        if (current_time > this.last_time) {
            // Save uncapped elapsed_ms for measurement
            elapsed_ms = this.elapsed_ms = current_time - this.last_time;

            // cap the milliseconds elapsed used for delta_time
            if (elapsed_ms > this._max_elapsed_ms) {
                elapsed_ms = this._max_elapsed_ms;
            }

            this.delta_time = elapsed_ms * settings.TARGET_FPMS * this.speed;

            // Cache a local reference, in-case ticker is destroyed
            // during the emit, we can still check for head.next
            const head = this._head;

            // Invoke listeners added to internal emitter
            let listener = head.next;

            while (listener) {
                listener = listener.emit(this.delta_time);
            }

            if (!head.next) {
                this._cancel_if_needed();
            }
        } else {
            this.delta_time = this.elapsed_ms = 0;
        }

        this.last_time = current_time;
    }

    /**
     * The frames per second at which this ticker is running.
     * The default is approximately 60 in most modern browsers.
     * **Note:** This does not factor in the value of
     * {@link Ticker#speed}, which is specific
     * to scaling {@link Ticker#delta_time}.
     *
     * @type {number}
     * @readonly
     */
    get FPS() {
        return 1000 / this.elapsed_ms;
    }

    /**
     * Manages the maximum amount of milliseconds allowed to
     * elapse between invoking {@link Ticker#update}.
     * This value is used to cap {@link Ticker#delta_time},
     * but does not effect the measured value of {@link Ticker#FPS}.
     * When setting this property it is clamped to a value between
     * `0` and `settings.TARGET_FPMS * 1000`.
     *
     * @type {number}
     * @default 10
     */
    set min_FPS(fps) {
        // Clamp: 0 to TARGET_FPMS
        const minFPMS = Math.min(Math.max(0, fps) / 1000, settings.TARGET_FPMS);

        this._max_elapsed_ms = 1 / minFPMS;
    }

    get min_FPS() {
        return 1000 / this._max_elapsed_ms;
    }
}
