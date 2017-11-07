/**
 * Abstract class which SoundNodes and SoundContext
 * both extend. This provides the functionality for adding
 * dynamic filters.
 * @class Filterable
 * @memberof v.sound
 * @param {AudioNode} source The source audio node
 * @param {AudioNode} destination The output audio node
 * @private
 */
export default class Filterable {
    constructor(input, output) {
        this._output = output;
        this._input = input;
    }
    /**
     * The destination output audio node
     * @name v.sound.Filterable#destination
     * @type {AudioNode}
     * @readonly
     */
    get destination() {
        return this._input;
    }
    /**
     * The collection of filters
     * @name v.sound.Filterable#filters
     * @type {v.sound.filters.Filter[]}
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
            prevFilter.connect(this._output);
        }
    }
    /**
     * Cleans up.
     * @method v.sound.Filterable#destroy
     */
    destroy() {
        this.filters = null;
        this._input = null;
        this._output = null;
    }
}
