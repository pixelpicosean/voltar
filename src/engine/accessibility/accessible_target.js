/**
 * Default property values of accessible objects
 */
export default {
    /**
     *  Flag for if the object is accessible. If true AccessibilityManager will overlay a
     *   shadow div with attributes set
     *
     * @type {boolean}
     */
    accessible: false,

    /**
     * Sets the title attribute of the shadow div
     * If accessible_title AND accessible_hint has not been this will default to 'node [tab_index]'
     *
     * @type {string}
     */
    accessible_title: null,

    /**
     * Sets the aria-label attribute of the shadow div
     *
     * @type {string}
     */
    accessible_hint: null,

    /**
     * @todo Needs docs.
     */
    tab_index: 0,

    /**
     * @todo Needs docs.
     */
    _accessible_active: false,

    /**
     * @todo Needs docs.
     */
    _accessible_div: false,
};
