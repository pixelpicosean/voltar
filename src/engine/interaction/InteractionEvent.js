import Node2D from "engine/scene/Node2D";
import InteractionData from "./InteractionData";

/**
 * Event class that mimics native DOM events.
 */
export default class InteractionEvent {
    /**
     *
     */
    constructor() {
        /**
         * Whether this event will continue propagating in the tree
         *
         * @type {boolean}
         */
        this.stopped = false;

        /**
         * The object which caused this event to be dispatched.
         * For listener callback see {@link InteractionEvent.current_target}.
         *
         * @type {Node2D}
         */
        this.target = null;

        /**
         * The object whose event listener’s callback is currently being invoked.
         *
         * @type {Node2D}
         */
        this.current_target = null;

        /**
         * Type of the event
         *
         * @type {string}
         */
        this.type = null;

        /**
         * InteractionData related to this event
         *
         * @type {InteractionData}
         */
        this.data = null;
    }

    /**
     * Prevents event from reaching any objects other than the current object.
     *
     */
    stop_propagation() {
        this.stopped = true;
    }

    /**
     * Resets the event.
     *
     * @private
     */
    reset() {
        this.stopped = false;
        this.current_target = null;
        this.target = null;
    }
}
