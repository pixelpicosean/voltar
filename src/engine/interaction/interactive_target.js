import InteractionTrackingData from './InteractionTrackingData';

/**
 * Default property values of interactive objects
 * Used by {@link InteractionManager} to automatically give all Node2Ds these properties
 *
 * @private
 * @name interactive_target
 * @example
 *      function MyObject() {}
 *
 *      Object.assign(
 *          MyObject.prototype,
 *          interactive_target
 *      );
 */
export default {

    /**
     * Enable interaction events for the Node2D. Touch, pointer and mouse
     * events will not be emitted unless `interactive` is set to `true`.
     *
     * @example
     * const sprite = new Sprite(texture);
     * sprite.interactive = true;
     * sprite.connect('tap', (event) => {
     *      // handle event
     * });
     * @member {boolean}
     */
    interactive: false,

    /**
     * Determines if the children to the node can be clicked/touched
     * Setting this to false allows pixi to bypass a recursive `hit_test` function
     *
     * @member {boolean}
     */
    interactive_children: true,

    /**
     * Interaction shape. Children will be hit first, then this shape will be checked.
     * Setting this will cause this shape to be checked in hit tests rather than the node's bounds.
     *
     * @example
     * const sprite = new Sprite(texture);
     * sprite.interactive = true;
     * sprite.hit_area = new Rectangle(0, 0, 100, 100);
     * @member {Rectangle|Circle|Ellipse|Polygon|RoundedRectangle}
     */
    hit_area: null,

    /**
     * If enabled, the mouse cursor use the pointer behavior when hovered over the node if it is interactive
     * Setting this changes the 'cursor' property to `'pointer'`.
     *
     * @example
     * const sprite = new Sprite(texture);
     * sprite.interactive = true;
     * sprite.button_mode = true;
     * @member {boolean}
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
     * const sprite = new Sprite(texture);
     * sprite.interactive = true;
     * sprite.cursor = 'wait';
     * @see https://developer.mozilla.org/en/docs/Web/CSS/cursor
     *
     * @member {string}
     */
    cursor: null,

    /**
     * Internal set of all active pointers, by identifier
     *
     * @member {Object<number, InteractionTrackingData>}
     * @memberof Node2D#
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
     * @type {Object<number, InteractionTrackingData>}
     */
    _tracked_pointers: undefined,
};
