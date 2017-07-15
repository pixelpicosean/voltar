/**
 * Default property values of interactive objects
 * Used by {@link V.interaction.InteractionManager} to automatically give all Node2Ds these properties
 *
 * @private
 * @name interactiveTarget
 * @memberof V.interaction
 * @example
 *      function MyObject() {}
 *
 *      Object.assign(
 *          core.Node2D.prototype,
 *          V.interaction.interactiveTarget
 *      );
 */
export default {

    /**
     * Enable interaction events for the Node2D. Touch, pointer and mouse
     * events will not be emitted unless `interactive` is set to `true`.
     *
     * @example
     * const sprite = new V.Sprite(texture);
     * sprite.interactive = true;
     * sprite.on('tap', (event) => {
     *    //handle event
     * });
     * @member {boolean}
     * @memberof V.Node2D#
     */
    interactive: false,

    /**
     * Determines if the children to the displayObject can be clicked/touched
     * Setting this to false allows pixi to bypass a recursive `hitTest` function
     *
     * @member {boolean}
     * @memberof V.Node2D#
     */
    interactiveChildren: true,

    /**
     * Interaction shape. Children will be hit first, then this shape will be checked.
     * Setting this will cause this shape to be checked in hit tests rather than the displayObject's bounds.
     *
     * @example
     * const sprite = new V.Sprite(texture);
     * sprite.interactive = true;
     * sprite.hitArea = new V.Rectangle(0, 0, 100, 100);
     * @member {V.Rectangle|V.Circle|V.Ellipse|V.Polygon|V.RoundedRectangle}
     * @memberof V.Node2D#
     */
    hitArea: null,

    /**
     * If enabled, the mouse cursor use the pointer behavior when hovered over the displayObject if it is interactive
     * Setting this changes the 'cursor' property to `'pointer'`.
     *
     * @example
     * const sprite = new V.Sprite(texture);
     * sprite.interactive = true;
     * sprite.buttonMode = true;
     * @member {boolean}
     * @memberof V.Node2D#
     */
    get buttonMode()
    {
        return this.cursor === 'pointer';
    },
    set buttonMode(value)
    {
        if (value)
        {
            this.cursor = 'pointer';
        }
        else if (this.cursor === 'pointer')
        {
            this.cursor = null;
        }
    },

    /**
     * This defines what cursor mode is used when the mouse cursor
     * is hovered over the displayObject.
     *
     * @example
     * const sprite = new V.Sprite(texture);
     * sprite.interactive = true;
     * sprite.cursor = 'wait';
     * @see https://developer.mozilla.org/en/docs/Web/CSS/cursor
     *
     * @member {string}
     * @memberof V.Node2D#
     */
    cursor: null,

    /**
     * Internal set of all active pointers, by identifier
     *
     * @member {Map<number, InteractionTrackingData>}
     * @memberof V.Node2D#
     * @private
     */
    get trackedPointers()
    {
        if (this._trackedPointers === undefined) this._trackedPointers = {};

        return this._trackedPointers;
    },

    /**
     * Map of all tracked pointers, by identifier. Use trackedPointers to access.
     *
     * @private
     * @type {Map<number, InteractionTrackingData>}
     */
    _trackedPointers: undefined,
};
