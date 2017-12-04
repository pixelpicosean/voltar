/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 *
 * @class Filter
 * @memberof v.audio.filters
 * @param {AudioNode} destination The audio node to use as the destination for the input AudioNode
 * @param {AudioNode} [source] Optional output node, defaults to destination node. This is useful
 *        when creating filters which contains multiple AudioNode elements chained together.
 */
export default class Filter {
    constructor(destination, source) {
        this.destination = destination;
        this.source = source || destination;
    }
    /**
     * Connect to the destination.
     * @method v.audio.filters.Filter#connect
     * @param {AudioNode} destination The destination node to connect the output to
     */
    connect(destination) {
        this.source.connect(destination);
    }
    /**
     * Completely disconnect filter from destination and source nodes.
     * @method v.audio.filters.Filter#disconnect
     */
    disconnect() {
        this.source.disconnect();
    }
    /**
     * Destroy the filter and don't use after this.
     * @method v.audio.filters.Filter#destroy
     */
    destroy() {
        this.disconnect();
        this.destination = null;
        this.source = null;
    }
}
