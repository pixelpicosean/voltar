/**
 * Internal class for handling the priority sorting of ticker handlers.
 */
export default class TickerListener {
    /**
     * @param {Function} fn - The listener function to be added for one update
     * @param {Function} [context] - The listener context
     * @param {number} [priority] - The priority for emitting
     * @param {boolean} [once] - If the handler should fire once
     */
    constructor(fn, context = null, priority = 0, once = false) {
        /**
         * The handler function to execute.
         * @type {Function}
         */
        this.fn = fn;

        /**
         * The calling to execute.
         * @type {any}
         */
        this.context = context;

        /**
         * The current priority.
         * @type {number}
         */
        this.priority = priority;

        /**
         * If this should only execute once.
         * @type {boolean}
         */
        this.once = once;

        /**
         * The next item in chain.
         * @type {TickerListener}
         */
        this.next = null;

        /**
         * The previous item in chain.
         * @type {TickerListener}
         */
        this.previous = null;

        /**
         * `true` if this listener has been destroyed already.
         * @type {boolean}
         * @private
         */
        this._destroyed = false;
    }

    /**
     * Simple compare function to figure out if a function and context match.
     *
     * @param {Function} fn - The listener function to be added for one update
     * @param {any} [context] - The listener context
     * @return {boolean} `true` if the listener match the arguments
     */
    match(fn, context = null) {
        return this.fn === fn && this.context === context;
    }

    /**
     * Emit by calling the current function.
     * @param {number} delta_time - time since the last emit.
     * @return {TickerListener} Next ticker
     */
    emit(delta_time) {
        if (this.fn) {
            if (this.context) {
                this.fn.call(this.context, delta_time);
            } else {
                this.fn(delta_time);
            }
        }

        const redirect = this.next;

        if (this.once) {
            this.destroy(true);
        }

        // Soft-destroying should remove
        // the next reference
        if (this._destroyed) {
            this.next = null;
        }

        return redirect;
    }

    /**
     * Connect to the list.
     * @param {TickerListener} previous - Input node, previous listener
     */
    connect(previous) {
        this.previous = previous;
        if (previous.next) {
            previous.next.previous = this;
        }
        this.next = previous.next;
        previous.next = this;
    }

    /**
     * Destroy and don't use after this.
     * @param {boolean} [hard] `true` to remove the `next` reference, this
     *        is considered a hard destroy. Soft destroy maintains the next reference.
     * @return {TickerListener} The listener to redirect while emitting or removing.
     */
    destroy(hard = false) {
        this._destroyed = true;
        this.fn = null;
        this.context = null;

        // Disconnect, hook up next and previous
        if (this.previous) {
            this.previous.next = this.next;
        }

        if (this.next) {
            this.next.previous = this.previous;
        }

        // Redirect to the next item
        const redirect = this.previous;

        // Remove references
        this.next = hard ? null : redirect;
        this.previous = null;

        return redirect;
    }
}
