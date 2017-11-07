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
     * If accessibleTitle AND accessibleHint has not been this will default to 'displayObject [tabIndex]'
     *
     * @type {string}
     */
    accessibleTitle: null,

    /**
     * Sets the aria-label attribute of the shadow div
     *
     * @type {string}
     */
    accessibleHint: null,

    /**
     * @todo Needs docs.
     */
    tabIndex: 0,

    /**
     * @todo Needs docs.
     */
    _accessibleActive: false,

    /**
     * @todo Needs docs.
     */
    _accessibleDiv: false,
};
