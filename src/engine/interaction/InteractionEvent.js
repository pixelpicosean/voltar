/**
 * Event class that mimics native DOM events.
 *
 * @class
 * @memberof V.interaction
 */
export default class InteractionEvent
{
    /**
     *
     */
    constructor()
    {
        /**
         * Whether this event will continue propagating in the tree
         *
         * @member {boolean}
         */
        this.stopped = false;

        /**
         * The object which caused this event to be dispatched.
         * For listener callback see {@link V.interaction.InteractionEvent.current_target}.
         *
         * @member {V.Node2D}
         */
        this.target = null;

        /**
         * The object whose event listener’s callback is currently being invoked.
         *
         * @member {V.Node2D}
         */
        this.current_target = null;

        /**
         * Type of the event
         *
         * @member {string}
         */
        this.type = null;

        /**
         * InteractionData related to this event
         *
         * @member {V.interaction.InteractionData}
         */
        this.data = null;
    }

    /**
     * Prevents event from reaching any objects other than the current object.
     *
     */
    stop_propagation()
    {
        this.stopped = true;
    }

    /**
     * Resets the event.
     *
     * @private
     */
    _reset()
    {
        this.stopped = false;
        this.current_target = null;
        this.target = null;
    }
}
