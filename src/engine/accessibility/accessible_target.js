/**
 * Default property values of accessible objects
 * used by {@link V.accessibility.AccessibilityManager}.
 *
 * @function accessible_target
 * @memberof V.accessibility
 * @example
 *      function MyObject() {}
 *
 *      Object.assign(
 *          MyObject.prototype,
 *          V.accessibility.accessible_target
 *      );
 */
export default {
    /**
     *  Flag for if the object is accessible. If true AccessibilityManager will overlay a
     *   shadow div with attributes set
     *
     * @member {boolean}
     */
    accessible: false,

    /**
     * Sets the title attribute of the shadow div
     * If accessibleTitle AND accessibleHint has not been this will default to 'displayObject [tabIndex]'
     *
     * @member {string}
     */
    accessibleTitle: null,

    /**
     * Sets the aria-label attribute of the shadow div
     *
     * @member {string}
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