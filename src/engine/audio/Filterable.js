import Filter from "./filters/Filter";

/**
 * Abstract class which SoundNodes and SoundContext
 * both extend. This provides the functionality for adding
 * dynamic filters.
 *
 * @param {AudioNode} source The source audio node
 * @param {AudioNode} destination The output audio node
 * @private
 */
export default class Filterable {
    constructor(input, output) {
        /**
         * The destination output audio node
         * @type {AudioNode}
         * @private
         */
        this._output = output;

        /**
         * Get the gain node
         * @type {AudioNode}
         * @private
         */
        this._input = input;

        /**
         * Collection of filters.
         * @type {Filter[]}
         * @private
         */
        this._filters = null;
    }
    /**
     * The destination output audio node
     * @type {AudioNode}
     * @readonly
     */
    get destination() {
        return this._input;
    }
    /**
     * The collection of filters
     * @type {Filter[]}
     */
    get filters() {
        return this._filters;
    }
    set filters(filters) {
        if (this._filters) {
            this._filters.forEach((filter) => {
                if (filter) {
                    filter.disconnect();
                }
            });
            this._filters = null;
            // Reconnect direct path
            this._input.connect(this._output);
        }

        if (filters && filters.length) {
            this._filters = filters.slice(0);

            // Disconnect direct path before inserting filters
            this._input.disconnect();

            // Connect each filter
            /** @type {Filter} */
            let prevFilter = null;
            filters.forEach((filter) => {
                if (prevFilter === null) {
                    // first filter is the destination
                    // for the analyser
                    this._input.connect(filter.destination);
                }
                else {
                    prevFilter.connect(filter.destination);
                }
                prevFilter = filter;
            });

            if (prevFilter) {
                prevFilter.connect(this._output);
            }
        }
    }
    /**
     * Cleans up.
     */
    destroy() {
        this.filters = null;
        this._input = null;
        this._output = null;
    }
}
