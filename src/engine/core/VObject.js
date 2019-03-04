import { remove_items } from "engine/dep/index";

/**
 * Representation of a single event listener.
 */
class EventListener {
    /**
     * @param {Function} fn The listener function.
     * @param {any} context The context to invoke the listener with.
     * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
     */
    constructor(fn, context, once = false) {
        this.fn = fn;
        this.context = context;
        this.once = once;
    }
}

/**
 * Add a listener for a given event.
 *
 * @param {VObject} emitter Reference to the `VObject` instance.
 * @param {string|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {any} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {VObject}
 * @private
 */
function add_listener(emitter, event, fn, context, once) {
    if (typeof fn !== 'function') {
        throw new TypeError('The listener must be a function');
    }

    const listener = new EventListener(fn, context || emitter, once);

    let listeners = emitter._events.get(event);
    if (!listeners) {
        listeners = [];
        emitter._events.set(event, listeners);
    }

    listeners.push(listener);

    return emitter;
}

/**
 * Base class of most engine classes, with ability to emit events.
 */
export default class VObject {
    constructor() {
        /**
         * @type {Map<string|Symbol, EventListener[]>}
         */
        this._events = new Map();
    }

    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     */
    get_signal_list() {
        return this._events.keys();
    }

    /**
     * Return the listeners registered for a given event.
     *
     * @param {string|Symbol} event The event name.
     */
    get_signal_connection_listeners(event) {
        return this._events.get(event);
    }

    /**
     * Return the number of listeners listening to a given event.
     *
     * @param {string|Symbol} event The event name.
     */
    get_signal_connection_count(event) {
        const listeners = this._events.get(event);

        if (!listeners) {
            return 0;
        }

        return listeners.length;
    }

    /**
     * Calls each of the listeners registered for a given event.
     *
     * @param {string|Symbol} event The event name.
     * @param {any} [args]
     */
    emit_signal(event, ...args) {
        const listeners = this._events.get(event);

        if (!listeners) {
            return false;
        }

        for (const e  of listeners) {
            e.fn.call(e.context, ...args);
        }
        for (let i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].once) {
                remove_items(listeners, i, 1);
            }
        }

        return true;
    }

    /**
     * Add a listener for a given event.
     *
     * @param {string|Symbol} event The event name.
     * @param {Function} fn The listener function.
     * @param {any} [context=this] The context to invoke the listener with.
     */
    connect(event, fn, context) {
        return add_listener(this, event, fn, context || this, false);
    }

    /**
     * Add a one-time listener for a given event.
     *
     * @param {string|Symbol} event The event name.
     * @param {Function} fn The listener function.
     * @param {any} [context=this] The context to invoke the listener with.
     */
    connect_once(event, fn, context) {
        return add_listener(this, event, fn, context || this, true);
    }

    /**
     * Remove the listeners of a given event.
     *
     * @param {string|Symbol} event The event name.
     * @param {Function} fn Only remove the listeners that match this function.
     * @param {any} [context] Only remove the listeners that have this context.
     * @param {Boolean} [once] Only remove one-time listeners.
     */
    disconnect(event, fn, context = undefined, once = undefined) {
        const listeners = this._events.get(event);

        if (!listeners) {
            return this;
        }

        for (let i = listeners.length - 1; i >= 0; i--) {
            const e = listeners[i];
            if (
                e.fn === fn
                &&
                (context === undefined || (context !== undefined && e.context === context))
                &&
                (once === undefined || (once !== undefined && e.once === once))
            ) {
                remove_items(listeners, i, 1);
            }
        }

        return this;
    }

    /**
     * Whether an function(with context) is connected to this object.
     *
     * @param {string|Symbol} event The event name.
     * @param {Function} fn
     * @param {any} [context]
     * @returns {boolean}
     */
    is_connected(event, fn, context) {
        const listeners = this._events.get(event);
        if (!listeners) {
            return false;
        }

        for (let e of listeners) {
            if (
                (fn === e.fn)
                &&
                (context === undefined || (context !== undefined && context === e.context))
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param {string|Symbol} [event] The event name.
     * @returns {VObject} `this`.
     */
    disconnect_all(event) {
        this._events.delete(event);

        return this;
    }
}
