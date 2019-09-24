import { remove_items } from "engine/dep/index";
import { MessageQueue } from "./message_queue";


export const NOTIFICATION_PREDELETE = 1

/**
 * Representation of a single event listener.
 */
class EventListener {
    /**
     * @param {Function} fn The listener function.
     * @param {any} context The context to invoke the listener with.
     * @param {boolean} [once] Specify if the listener is a one-time listener.
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
 * @param {string | symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {any} context The context to invoke the listener with.
 * @param {boolean} once Specify if the listener is a one-time listener.
 * @private
 */
function add_listener(emitter, event, fn, context, once) {
    if (typeof fn !== 'function') {
        console.error('The listener must be a function');
        return emitter;
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

let uid = 1

/**
 * Base class of most engine classes, with ability to emit events.
 */
export class VObject {
    get class() { return 'VObject' }

    constructor() {
        /**
         * @type {Map<string | symbol, EventListener[]>}
         */
        this._events = new Map();

        /**
         * @type {number}
         */
        this.instance_id = uid++;

        this.is_queued_for_deletion = false;
    }
    /**
     * @virtual
     * @param {number} what
     */
    _notification(what) { }

    /**
     * @private
     * @param {number} what
     * @param {boolean} reversed
     */
    _notificationv(what, reversed) { }

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
     * @param {string | symbol} event The event name.
     */
    get_signal_connection_listeners(event) {
        return this._events.get(event);
    }

    /**
     * Return the number of listeners listening to a given event.
     *
     * @param {string | symbol} event The event name.
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
     * @param {string | symbol} event The event name.
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
     * @param {string | symbol} event The event name.
     * @param {Function} fn The listener function.
     * @param {any} [context=this] The context to invoke the listener with.
     */
    connect(event, fn, context) {
        return add_listener(this, event, fn, context || this, false);
    }

    /**
     * Add a one-time listener for a given event.
     *
     * @param {string | symbol} event The event name.
     * @param {Function} fn The listener function.
     * @param {any} [context=this] The context to invoke the listener with.
     */
    connect_once(event, fn, context) {
        return add_listener(this, event, fn, context || this, true);
    }

    /**
     * Remove the listeners of a given event.
     *
     * @param {string | symbol} event The event name.
     * @param {Function} fn Only remove the listeners that match this function.
     * @param {any} [context] Only remove the listeners that have this context.
     * @param {boolean} [once] Only remove one-time listeners.
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
     * @param {string | symbol} event The event name.
     * @param {Function} fn
     * @param {any} [context]
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
     * @param {string | symbol} [event] The event name.
     */
    disconnect_all(event) {
        if (!event) {
            this._events.clear();
        } else {
            this._events.delete(event);
        }

        return this;
    }

    free() {
        this.instance_id = 0;
        this.notification(NOTIFICATION_PREDELETE, true);
        this._events = null;
        return true;
    }

    /**
     * @param {number} what
     * @param {boolean} [reversed]
     */
    notification(what, reversed = false) {
        this._notificationv(what, reversed);
    }

    /**
     * @param {string} p_method
     * @param  {...any} p_args
     */
    call_deferred(p_method, ...p_args) {
        MessageQueue.get_singleton().push_call(this, p_method, ...p_args);
    }
}

/**
 * @param {Function} m_class
 * @param {Function} m_inherits
 */
export function GDCLASS(m_class, m_inherits) {
    const self_notification = m_class.prototype._notification;
    if (self_notification && m_inherits) {
        const inherits_notification = m_inherits.prototype._notification;
        const inherits_notificationv = m_inherits.prototype._notificationv;
        /**
         * @param {number} what
         * @param {boolean} reversed
         */
        m_class.prototype._notificationv = function _notificationv(what, reversed) {
            if (!reversed) {
                inherits_notificationv.call(this, what, reversed);
            }
            if (self_notification !== inherits_notification) {
                self_notification.call(this, what);
            }
            if (reversed) {
                inherits_notificationv.call(this, what, reversed);
            }
        };
    }
    return m_class;
}
