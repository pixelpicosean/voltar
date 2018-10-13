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
     * Determines if the children to the node can be clicked/touched
     * Setting this to false allows pixi to bypass a recursive `hit_test` function
     *
     * @member {boolean}
     * @memberof V.Node2D#
     */
    interactive_children: true,

    /**
     * Interaction shape. Children will be hit first, then this shape will be checked.
     * Setting this will cause this shape to be checked in hit tests rather than the node's bounds.
     *
     * @example
     * const sprite = new V.Sprite(texture);
     * sprite.interactive = true;
     * sprite.hit_area = new V.Rectangle(0, 0, 100, 100);
     * @member {V.Rectangle|V.Circle|V.Ellipse|V.Polygon|V.RoundedRectangle}
     * @memberof V.Node2D#
     */
    hit_area: null,

    /**
     * If enabled, the mouse cursor use the pointer behavior when hovered over the node if it is interactive
     * Setting this changes the 'cursor' property to `'pointer'`.
     *
     * @example
     * const sprite = new V.Sprite(texture);
     * sprite.interactive = true;
     * sprite.button_mode = true;
     * @member {boolean}
     * @memberof V.Node2D#
     */
    get button_mode()
    {
        return this.cursor === 'pointer';
    },
    set button_mode(value)
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
     * is hovered over the node.
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
    get tracked_pointers()
    {
        if (this._tracked_pointers === undefined) this._tracked_pointers = {};

        return this._tracked_pointers;
    },

    /**
     * Map of all tracked pointers, by identifier. Use tracked_pointers to access.
     *
     * @private
     * @type {Map<number, InteractionTrackingData>}
     */
    _tracked_pointers: undefined,
};
