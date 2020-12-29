import { remove_items } from "engine/dep/index";
import { MessageQueue } from "./message_queue";
import { memdelete } from "./os/memory";


export const NOTIFICATION_POSTINITIALIZE = 0;
export const NOTIFICATION_PREDELETE = 1;

/**
 * Representation of a single event listener.
 */
class EventListener {
    fn: Function;
    context: any;
    once: boolean;
    /**
     * @param fn The listener function.
     * @param context The context to invoke the listener with.
     * @param [once] Specify if the listener is a one-time listener.
     */
    constructor(fn: Function, context: any, once = false) {
        this.fn = fn;
        this.context = context;
        this.once = once;
    }
}

/**
 * Add a listener for a given event.
 *
 * @param emitter Reference to the `VObject` instance.
 * @param event The event name.
 * @param fn The listener function.
 * @param context The context to invoke the listener with.
 * @param once Specify if the listener is a one-time listener.
 */
function add_listener(emitter: VObject, event: string | symbol, fn: Function, context: any, once: boolean) {
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

let uid = 1;

/**
 * Base class of most engine classes, with ability to emit events.
 */
export class VObject {
    get class() { return "VObject" }

    instance_id = uid++;
    is_queued_for_deletion = false;

    _events: Map<string | Symbol, EventListener[]> = new Map();

    /**
     * This method is called to reset it while reuse recylced instances.
     */
    _init() { }

    /**
     * @returns Whether `_free()` should be called
     */
    _predelete(): boolean {
        this.notification(NOTIFICATION_PREDELETE, true);
        return true;
    }

    /**
     * Decontructor, we may not really need this one as of GC
     */
    _free() {
        this.instance_id = 0;
    }

    _notification(what: number) { }

    _notificationv(what: number, reversed: boolean) { }

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
     * @param event The event name.
     */
    get_signal_connection_listeners(event: string | symbol): EventListener[] {
        return this._events.get(event);
    }

    /**
     * Return the number of listeners listening to a given event.
     *
     * @param event The event name.
     */
    get_signal_connection_count(event: string | symbol): number {
        const listeners = this._events.get(event);

        if (!listeners) {
            return 0;
        }

        return listeners.length;
    }

    /**
     * Calls each of the listeners registered for a given event.
     *
     * @param event The event name.
     * @param [args]
     */
    emit_signal(event: string | symbol, ...args: any): boolean {
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
     * @param event The event name.
     * @param fn The listener function.
     * @param [context] The context to invoke the listener with.
     */
    connect(event: string | symbol, fn: Function, context?: any): VObject {
        return add_listener(this, event, fn, context || this, false);
    }

    /**
     * Add a one-time listener for a given event.
     *
     * @param event The event name.
     * @param fn The listener function.
     * @param [context] The context to invoke the listener with.
     */
    connect_once(event: string | symbol, fn: Function, context?: any): VObject {
        return add_listener(this, event, fn, context || this, true);
    }

    /**
     * Remove the listeners of a given event.
     *
     * @param event The event name.
     * @param fn Only remove the listeners that match this function.
     * @param [context] Only remove the listeners that have this context.
     * @param [once] Only remove one-time listeners.
     */
    disconnect(event: string | symbol, fn: Function, context: any = undefined, once: boolean = undefined): VObject {
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
     * @param event The event name.
     * @param fn
     * @param [context]
     */
    is_connected(event: string | symbol, fn: Function, context: any): boolean {
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
     * @param [event] The event name.
     */
    disconnect_all(event: string | symbol): VObject {
        if (!event) {
            this._events.clear();
        } else {
            this._events.delete(event);
        }

        return this;
    }

    free() {
        memdelete(this);
    }

    /**
     * @param {number} what
     * @param {boolean} [reversed]
     */
    notification(what: number, reversed: boolean = false) {
        this._notificationv(what, reversed);
    }

    /**
     * @param {string} p_method
     * @param  {...any} p_args
     */
    call_deferred(p_method: string, ...p_args: any[]) {
        MessageQueue.get_singleton().push_call(this, p_method, ...p_args);
    }
}

/**
 * @param {Function} m_class
 * @param {Function} m_inherits
 */
export function GDCLASS(m_class: Function, m_inherits: Function) {
    const self_notification = m_class.prototype._notification;
    if (self_notification && m_inherits) {
        const inherits_notification = m_inherits.prototype._notification;
        const inherits_notificationv = m_inherits.prototype._notificationv;
        /**
         * @param {number} what
         * @param {boolean} reversed
         */
        m_class.prototype._notificationv = function _notificationv(what: number, reversed: boolean) {
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
