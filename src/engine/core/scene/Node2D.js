import EventEmitter from 'eventemitter3';
import { TRANSFORM_MODE } from '../const';
import settings from '../settings';
import { TransformStatic, Transform, Bounds, Rectangle } from '../math';
import { removeItems } from '../utils';
import Signal from 'engine/Signal';

let uid = 0;

/**
 * A Node2D represents a collection of display objects.
 * It is the base class of all display objects that act as a container for other objects.
 *
 *```js
 * let container = new V.Node2D();
 * container.add_child(sprite);
 * ```
 *
 * @class
 * @extends EventEmitter
 * @memberof V
 */
export default class Node2D extends EventEmitter
{
    /**
     *
     */
    constructor()
    {
        super();

        const TransformClass = settings.TRANSFORM_MODE === TRANSFORM_MODE.STATIC ? TransformStatic : Transform;

        this.tempNode2DParent = null;

        this.id = uid++;

        this.name = '';
        this.type = 'Node2D';

        this.is_inside_tree = false;
        this.is_queued_for_deletion = false;

        this.idle_process = false;

        // TODO: need to create Transform from factory
        /**
         * World transform and local transform of this object.
         * This will become read-only later, please do not assign anything there unless you know what are you doing
         *
         * @member {V.TransformBase}
         */
        this.transform = new TransformClass();

        /**
         * The opacity of the object.
         *
         * @member {number}
         */
        this.alpha = 1;

        /**
         * The visibility of the object. If false the object will not be drawn, and
         * the update_transform function will not be called.
         *
         * Only affects recursive calls from parent. You can ask for bounds or call update_transform manually
         *
         * @member {boolean}
         */
        this.visible = true;

        /**
         * Can this object be rendered, if false the object will not be drawn but the update_transform
         * methods will still be called.
         *
         * Only affects recursive calls from parent. You can ask for bounds manually
         *
         * @member {boolean}
         */
        this.renderable = true;

        /**
         * The display object container that contains this display object.
         *
         * @member {V.Node2D}
         * @readonly
         */
        this.parent = null;

        this.scene_tree = null;

        /**
         * The multiplied alpha of the displayObject
         *
         * @member {number}
         * @readonly
         */
        this.world_alpha = 1;

        /**
         * The area the filter is applied to. This is used as more of an optimisation
         * rather than figuring out the dimensions of the displayObject each frame you can set this rectangle
         *
         * Also works as an interaction mask
         *
         * @member {V.Rectangle}
         */
        this.filter_area = null;

        this._filters = null;
        this._enabledFilters = null;

        /**
         * The bounds object, this is used to calculate and store the bounds of the displayObject
         *
         * @member {V.Rectangle}
         * @private
         */
        this._bounds = new Bounds();
        this._boundsID = 0;
        this._lastBoundsID = -1;
        this._boundsRect = null;
        this._localBoundsRect = null;

        /**
         * The original, cached mask of the object
         *
         * @member {V.Graphics|V.Sprite}
         * @private
         */
        this._mask = null;

        /**
         * If the object has been destroyed via destroy(). If true, it should not be used.
         *
         * @member {boolean}
         * @private
         * @readonly
         */
        this._destroyed = false;

        /**
         * The array of children of this container.
         *
         * @member {V.Node2D[]}
         * @readonly
         */
        this.children = [];

        this.named_children = {};

        /**
         * Fired when this Node2D is added to a Node2D.
         *
         * @event V.Node2D#added
         * @param {V.Node2D} container - The container added to.
         */

        /**
         * Fired when this Node2D is removed from a Node2D.
         *
         * @event V.Node2D#removed
         * @param {V.Node2D} container - The container removed from.
         */

        this.tree_entered = new Signal();
        this.tree_exited = new Signal();
    }

    /**
     * @private
     * @member {V.Node2D}
     */
    get _tempNode2DParent()
    {
        if (this.tempNode2DParent === null)
        {
            this.tempNode2DParent = new Node2D();
        }

        return this.tempNode2DParent;
    }

    set_name(name) {
        this.name = name;

        if (this.parent) {
            this.parent._validate_child_name(this);
        }
    }

    set_process(p) {
        this.idle_process = !!p;
    }

    /**
     * Updates the object transform for rendering
     *
     * TODO - Optimization pass!
     */
    _update_transform()
    {
        this.transform.update_transform(this.parent.transform);
        // multiply the alphas..
        this.world_alpha = this.alpha * this.parent.world_alpha;

        this._bounds.updateID++;
    }

    /**
     * recursively updates transform of all objects from the root to this one
     * internal function for to_local()
     */
    _recursive_post_update_transform()
    {
        if (this.parent)
        {
            this.parent._recursive_post_update_transform();
            this.transform.update_transform(this.parent.transform);
        }
        else
        {
            this.transform.update_transform(this._tempNode2DParent.transform);
        }
    }

    /**
     * Retrieves the bounds of the displayObject as a rectangle object.
     *
     * @param {boolean} skipUpdate - setting to true will stop the transforms of the scene graph from
     *  being updated. This means the calculation returned MAY be out of date BUT will give you a
     *  nice performance boost
     * @param {V.Rectangle} rect - Optional rectangle to store the result of the bounds calculation
     * @return {V.Rectangle} the rectangular bounding area
     */
    get_bounds(skipUpdate, rect)
    {
        if (!skipUpdate)
        {
            if (!this.parent)
            {
                this.parent = this._tempNode2DParent;
                this.update_transform();
                this.parent = null;
            }
            else
            {
                this._recursive_post_update_transform();
                this.update_transform();
            }
        }

        if (this._boundsID !== this._lastBoundsID)
        {
            this.calculate_bounds();
        }

        if (!rect)
        {
            if (!this._boundsRect)
            {
                this._boundsRect = new Rectangle();
            }

            rect = this._boundsRect;
        }

        return this._bounds.get_rectangle(rect);
    }

    /**
     * Retrieves the local bounds of the displayObject as a rectangle object
     *
     * @param {V.Rectangle} [rect] - Optional rectangle to store the result of the bounds calculation
     * @return {V.Rectangle} the rectangular bounding area
     */
    get_local_Bounds(rect)
    {
        const transformRef = this.transform;
        const parentRef = this.parent;

        this.parent = null;
        this.transform = this._tempNode2DParent.transform;

        if (!rect)
        {
            if (!this._localBoundsRect)
            {
                this._localBoundsRect = new Rectangle();
            }

            rect = this._localBoundsRect;
        }

        const bounds = this.get_bounds(false, rect);

        this.parent = parentRef;
        this.transform = transformRef;

        return bounds;
    }

    /**
     * Calculates the global position of the display object
     *
     * @param {V.Point} position - The world origin to calculate from
     * @param {V.Point} [point] - A Point object in which to store the value, optional
     *  (otherwise will create a new Point)
     * @param {boolean} [skipUpdate=false] - Should we skip the update transform.
     * @return {V.Point} A point object representing the position of this object
     */
    to_global(position, point, skipUpdate = false)
    {
        if (!skipUpdate)
        {
            this._recursive_post_update_transform();

            // this parent check is for just in case the item is a root object.
            // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
            // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
            if (!this.parent)
            {
                this.parent = this._tempNode2DParent;
                this.displayObjectUpdateTransform();
                this.parent = null;
            }
            else
            {
                this.displayObjectUpdateTransform();
            }
        }

        // don't need to update the lot
        return this.world_transform.apply(position, point);
    }

    /**
     * Calculates the local position of the display object relative to another point
     *
     * @param {V.Point} position - The world origin to calculate from
     * @param {V.Node2D} [from] - The Node2D to calculate the global position from
     * @param {V.Point} [point] - A Point object in which to store the value, optional
     *  (otherwise will create a new Point)
     * @param {boolean} [skipUpdate=false] - Should we skip the update transform
     * @return {V.Point} A point object representing the position of this object
     */
    to_local(position, from, point, skipUpdate)
    {
        if (from)
        {
            position = from.to_global(position, point, skipUpdate);
        }

        if (!skipUpdate)
        {
            this._recursive_post_update_transform();

            // this parent check is for just in case the item is a root object.
            // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
            // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
            if (!this.parent)
            {
                this.parent = this._tempNode2DParent;
                this.displayObjectUpdateTransform();
                this.parent = null;
            }
            else
            {
                this.displayObjectUpdateTransform();
            }
        }

        // simply apply the matrix..
        return this.world_transform.apply_inverse(position, point);
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {V.WebGLRenderer} renderer - The renderer
     */
    render_webGL(renderer) // eslint-disable-line no-unused-vars
    {
        // OVERWRITE;
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @param {V.CanvasRenderer} renderer - The renderer
     */
    render_canvas(renderer) // eslint-disable-line no-unused-vars
    {
        // OVERWRITE;
    }

    /**
     * Convenience function to set the position, scale, skew and pivot at once.
     *
     * @param {number} [x=0] - The X position
     * @param {number} [y=0] - The Y position
     * @param {number} [scaleX=1] - The X scale value
     * @param {number} [scaleY=1] - The Y scale value
     * @param {number} [rotation=0] - The rotation
     * @param {number} [skewX=0] - The X skew value
     * @param {number} [skewY=0] - The Y skew value
     * @param {number} [pivotX=0] - The X pivot value
     * @param {number} [pivotY=0] - The Y pivot value
     * @return {V.Node2D} The Node2D instance
     */
    set_transform(x = 0, y = 0, scaleX = 1, scaleY = 1, rotation = 0, skewX = 0, skewY = 0, pivotX = 0, pivotY = 0)
    {
        this.position.x = x;
        this.position.y = y;
        this.scale.x = !scaleX ? 1 : scaleX;
        this.scale.y = !scaleY ? 1 : scaleY;
        this.rotation = rotation;
        this.skew.x = skewX;
        this.skew.y = skewY;
        this.pivot.x = pivotX;
        this.pivot.y = pivotY;

        return this;
    }

    /**
     * Base destroy method for generic display objects. This will automatically
     * remove the display object from its parent Node2D as well as remove
     * all current event listeners and internal references. Do not use a Node2D
     * after calling `destroy`.
     *
     */
    destroy()
    {
        this.removeAllListeners();
        if (this.parent)
        {
            this.parent.remove_child(this);
        }
        this.transform = null;

        this.parent = null;

        this._bounds = null;
        this._currentBounds = null;
        this._mask = null;

        this.filter_area = null;

        this.interactive = false;
        this.interactive_children = false;

        this._destroyed = true;
    }

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     * An alias to position.x
     *
     * @member {number}
     */
    get x()
    {
        return this.position.x;
    }

    set x(value) // eslint-disable-line require-jsdoc
    {
        this.transform.position.x = value;
    }

    /**
     * The position of the displayObject on the y axis relative to the local coordinates of the parent.
     * An alias to position.y
     *
     * @member {number}
     */
    get y()
    {
        return this.position.y;
    }

    set y(value) // eslint-disable-line require-jsdoc
    {
        this.transform.position.y = value;
    }

    /**
     * Current transform of the object based on world (parent) factors
     *
     * @member {V.Matrix}
     * @readonly
     */
    get world_transform()
    {
        return this.transform.world_transform;
    }

    /**
     * Current transform of the object based on local factors: position, scale, other stuff
     *
     * @member {V.Matrix}
     * @readonly
     */
    get local_transform()
    {
        return this.transform.local_transform;
    }

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     * Assignment by value since pixi-v4.
     *
     * @member {V.Point|V.ObservablePoint}
     */
    get position()
    {
        return this.transform.position;
    }

    set position(value) // eslint-disable-line require-jsdoc
    {
        this.transform.position.copy(value);
    }

    get_position() {
        return this.transform.position;
    }
    set_position(value) {
        this.transform.position.copy(value);
    }

    get_global_position() {
        return this.transform.world_transform.position;
    }

    /**
     * The scale factor of the object.
     * Assignment by value since pixi-v4.
     *
     * @member {V.Point|V.ObservablePoint}
     */
    get scale()
    {
        return this.transform.scale;
    }

    set scale(value) // eslint-disable-line require-jsdoc
    {
        this.transform.scale.copy(value);
    }

    get_scale() {
        return this.transform.scale;
    }
    set_scale(value) {
        this.transform.scale.copy(value);
    }

    get_global_scale() {
        return this.transform.world_transform.scale;
    }

    /**
     * The pivot point of the displayObject that it rotates around
     * Assignment by value since pixi-v4.
     *
     * @member {V.Point|V.ObservablePoint}
     */
    get pivot()
    {
        return this.transform.pivot;
    }

    set pivot(value) // eslint-disable-line require-jsdoc
    {
        this.transform.pivot.copy(value);
    }

    get_pivot() {
        return this.transform.pivot;
    }
    set_pivot(value) {
        this.transform.pivot.copy(value);
    }

    /**
     * The skew factor for the object in radians.
     * Assignment by value since pixi-v4.
     *
     * @member {V.ObservablePoint}
     */
    get skew()
    {
        return this.transform.skew;
    }

    set skew(value) // eslint-disable-line require-jsdoc
    {
        this.transform.skew.copy(value);
    }

    get_skew() {
        return this.transform.skew;
    }
    set_skew(value) {
        this.transform.skew.copy(value);
    }

    /**
     * The rotation of the object in radians.
     *
     * @member {number}
     */
    get rotation()
    {
        return this.transform.rotation;
    }

    set rotation(value) // eslint-disable-line require-jsdoc
    {
        this.transform.rotation = value;
    }

    get_rotation() {
        return this.transform.rotation;
    }
    set_rotation(value) {
        this.transform.rotation.copy(value);
    }

    get_global_rotation() {
        return this.transform.world_transform.rotation;
    }

    /**
     * Indicates if the object is globally visible.
     *
     * @member {boolean}
     * @readonly
     */
    get world_visible()
    {
        let item = this;

        do
        {
            if (!item.visible)
            {
                return false;
            }

            item = item.parent;
        } while (item);

        return true;
    }

    /**
     * Sets a mask for the displayObject. A mask is an object that limits the visibility of an
     * object to the shape of the mask applied to it. In V a regular mask must be a
     * V.Graphics or a V.Sprite object. This allows for much faster masking in canvas as it
     * utilises shape clipping. To remove a mask, set this property to null.
     *
     * @todo For the moment, V.CanvasRenderer doesn't support V.Sprite as mask.
     *
     * @member {V.Graphics|V.Sprite}
     */
    get mask()
    {
        return this._mask;
    }

    set mask(value) // eslint-disable-line require-jsdoc
    {
        if (this._mask)
        {
            this._mask.renderable = true;
        }

        this._mask = value;

        if (this._mask)
        {
            this._mask.renderable = false;
        }
    }

    /**
     * Sets the filters for the displayObject.
     * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * To remove filters simply set this property to 'null'
     *
     * @member {V.Filter[]}
     */
    get filters()
    {
        return this._filters && this._filters.slice();
    }

    set filters(value) // eslint-disable-line require-jsdoc
    {
        this._filters = value && value.slice();
    }

    _enter_tree() {}
    _ready() {}
    _process(delta) {}
    _exit_tree() {}

    queue_free() {}

    _propagate_enter_tree() {
        if (this.is_inside_tree) {
            return;
        }

        this.is_inside_tree = true;

        this._enter_tree();

        this.tree_entered.dispatch();

        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_enter_tree();
        }
    }

    _propagate_ready() {
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_ready();
        }

        this._ready();
    }

    _propagate_process(delta) {
        if (this.idle_process) this._process(delta);

        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_process();
        }
    }

    _propagate_exit_tree() {
        this.is_inside_tree = false;
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_exit_tree();
        }

        this._exit_tree();

        this.tree_exited.dispatch();
    }

    /**
     * Overridable method that can be used by Node2D subclasses whenever the children array is modified
     *
     * @private
     */
    on_children_change()
    {
        /* empty */
    }

    /**
     * Adds one or more children to the container.
     *
     * Multiple items can be added like so: `myNode2D.add_child(thingOne, thingTwo, thingThree)`
     *
     * @param {...V.Node2D} child - The Node2D(s) to add to the container
     * @return {V.Node2D} The first child that was added.
     */
    add_child(child)
    {
        // if the child has a parent then lets remove it as Pixi objects can only exist in one place
        if (child.parent)
        {
            child.parent.remove_child(child);
        }

        child.parent = this;
        child.scene_tree = this.scene_tree;
        // ensure child transform will be recalculated
        child.transform._parentID = -1;

        this.children.push(child);

        // add to name hash
        if (child.name.length > 0) {
            this._validate_child_name(child);
        }

        // ensure bounds will be recalculated
        this._boundsID++;

        child._propagate_enter_tree();

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(this.children.length - 1);

        return child;
    }

    /**
     * Adds a child to the container at a specified index. If the index is out of bounds an error will be thrown
     *
     * @param {V.Node2D} child - The child to add
     * @param {number} index - The index to place the child in
     * @return {V.Node2D} The child that was added.
     */
    add_child_at(child, index)
    {
        if (index < 0 || index > this.children.length)
        {
            throw new Error(`${child}add_child_at: The index ${index} supplied is out of bounds ${this.children.length}`);
        }

        if (child.parent)
        {
            child.parent.remove_child(child);
        }

        child.parent = this;
        child.scene_tree = this.scene_tree;
        // ensure child transform will be recalculated
        child.transform._parentID = -1;

        this.children.splice(index, 0, child);

        // add to name hash
        if (child.name.length > 0) {
            this._validate_child_name(child);
        }

        // ensure bounds will be recalculated
        this._boundsID++;

        child._propagate_enter_tree();

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(index);

        return child;
    }

    /**
     * Swaps the position of 2 Display Objects within this container.
     *
     * @param {V.Node2D} child - First display object to swap
     * @param {V.Node2D} child2 - Second display object to swap
     */
    swap_children(child, child2)
    {
        if (child === child2)
        {
            return;
        }

        const index1 = this.get_child_index(child);
        const index2 = this.get_child_index(child2);

        this.children[index1] = child2;
        this.children[index2] = child;
        this.on_children_change(index1 < index2 ? index1 : index2);
    }

    /**
     * Returns the index position of a child Node2D instance
     *
     * @param {V.Node2D} child - The Node2D instance to identify
     * @return {number} The index position of the child display object to identify
     */
    get_child_index(child)
    {
        const index = this.children.indexOf(child);

        if (index === -1)
        {
            throw new Error('The supplied Node2D must be a child of the caller');
        }

        return index;
    }

    /**
     * Changes the position of an existing child in the display object container
     *
     * @param {V.Node2D} child - The child Node2D instance for which you want to change the index number
     * @param {number} index - The resulting index number for the child display object
     */
    set_child_index(child, index)
    {
        if (index < 0 || index >= this.children.length)
        {
            throw new Error('The supplied index is out of bounds');
        }

        const currentIndex = this.get_child_index(child);

        removeItems(this.children, currentIndex, 1); // remove from old position
        this.children.splice(index, 0, child); // add at new position

        this.on_children_change(index);
    }

    /**
     * Returns the child at the specified index
     *
     * @param {number} index - The index to get the child at
     * @return {V.Node2D} The child at the given index, if any.
     */
    get_child(index)
    {
        if (index < 0 || index >= this.children.length)
        {
            throw new Error(`get_child: Index (${index}) does not exist.`);
        }

        return this.children[index];
    }

    /**
     * Removes one or more children from the container.
     *
     * @param {...V.Node2D} child - The Node2D(s) to remove
     * @return {V.Node2D} The first child that was removed.
     */
    remove_child(child)
    {
        const index = this.children.indexOf(child);

        if (index === -1) return null;

        child.parent = null;
        child.scene_tree = null;
        // ensure child transform will be recalculated
        child.transform._parentID = -1;
        removeItems(this.children, index, 1);

        // remove from name hash
        if (child.name.length > 0) {
            this.named_children[child.name] = undefined;
        }

        // ensure bounds will be recalculated
        this._boundsID++;

        child._propagate_exit_tree();

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(index);

        return child;
    }

    /**
     * Removes a child from the specified index position.
     *
     * @param {number} index - The index to get the child from
     * @return {V.Node2D} The child that was removed.
     */
    remove_child_at(index)
    {
        const child = this.get_child(index);

        // ensure child transform will be recalculated..
        child.parent = null;
        child.scene_tree = null;
        child.transform._parentID = -1;
        removeItems(this.children, index, 1);

        // remove from name hash
        if (child.name.length > 0) {
            this.named_children[child.name] = undefined;
        }

        // ensure bounds will be recalculated
        this._boundsID++;

        child._propagate_exit_tree();

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(index);

        return child;
    }

    /**
     * Removes all children from this container that are within the begin and end indexes.
     *
     * @param {number} [beginIndex=0] - The beginning position.
     * @param {number} [endIndex=this.children.length] - The ending position. Default value is size of the container.
     * @returns {Node2D[]} List of removed children
     */
    remove_children(beginIndex = 0, endIndex)
    {
        const begin = beginIndex;
        const end = typeof endIndex === 'number' ? endIndex : this.children.length;
        const range = end - begin;
        let removed;

        if (range > 0 && range <= end)
        {
            removed = this.children.splice(begin, range);

            for (let i = 0; i < removed.length; ++i)
            {
                removed[i].parent = null;
                child.scene_tree = null;
                if (removed[i].transform)
                {
                    removed[i].transform._parentID = -1;
                }

                // remove from name hash
                if (removed[i].name.length > 0) {
                    this.named_children[removed[i].name] = undefined;
                }

                removed[i]._propagate_exit_tree();
            }

            this._boundsID++;

            this.on_children_change(beginIndex);

            return removed;
        }
        else if (range === 0 && this.children.length === 0)
        {
            return [];
        }

        throw new RangeError('remove_children: numeric values are outside the acceptable range.');
    }

    get_tree() {
        return this.scene_tree;
    }

    get_node(path) {
        const list = path.split('/');

        // Find the base node
        let node = this;

        let i = 0, l = list.length, name;

        // '/absolute/node/path' start from current scene
        if (list[0].length === 0) {
            node = this.scene_tree.current_scene;
            i = 1;
        }

        for (; i < l; i++) {
            name = list[i];
            switch (name) {
                case '.':
                    break;
                case '..':
                    node = node.parent;
                    if (!node) {
                        console.log('no parent node exists');
                        return null;
                    }
                    break;
                default:
                    node = node.named_children[name];
                    if (!node) {
                        console.log(`node called "${name}" does not exist`);
                        return null;
                    }
                    break;
            }
        }

        return node;
    }

    /**
     * Updates the transform on all children of this container for rendering
     */
    update_transform()
    {
        this._boundsID++;

        this.transform.update_transform(this.parent.transform);

        // TODO: check render flags, how to process stuff here
        this.world_alpha = this.alpha * this.parent.world_alpha;

        for (let i = 0, j = this.children.length; i < j; ++i)
        {
            const child = this.children[i];

            if (child.visible)
            {
                child.update_transform();
            }
        }
    }

    /**
     * Recalculates the bounds of the container.
     *
     */
    calculate_bounds()
    {
        this._bounds.clear();

        this._calculate_bounds();

        for (let i = 0; i < this.children.length; i++)
        {
            const child = this.children[i];

            if (!child.visible || !child.renderable)
            {
                continue;
            }

            child.calculate_bounds();

            // TODO: filter+mask, need to mask both somehow
            if (child._mask)
            {
                child._mask.calculate_bounds();
                this._bounds.add_bounds_mask(child._bounds, child._mask._bounds);
            }
            else if (child.filter_area)
            {
                this._bounds.add_bounds_area(child._bounds, child.filter_area);
            }
            else
            {
                this._bounds.add_bounds(child._bounds);
            }
        }

        this._lastBoundsID = this._boundsID;
    }

    /**
     * Recalculates the bounds of the object. Override this to
     * calculate the bounds of the specific object (not including children).
     *
     */
    _calculate_bounds()
    {
        // FILL IN//
    }

    _validate_child_name(child) {
        let n = child.name;
        let i = 2;
        while (this.named_children[n]) {
            n = `${name}_${i}`;
        }
        child.name = n;
        this.named_children[n] = child;
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {V.WebGLRenderer} renderer - The renderer
     */
    render_webGL(renderer)
    {
        // if the object is not visible or the alpha is 0 then no need to render this element
        if (!this.visible || this.world_alpha <= 0 || !this.renderable)
        {
            return;
        }

        // do a quick check to see if this element has a mask or a filter.
        if (this._mask || this._filters)
        {
            this.render_advanced_webGL(renderer);
        }
        else
        {
            this._render_webGL(renderer);

            // simple render children!
            for (let i = 0, j = this.children.length; i < j; ++i)
            {
                this.children[i].render_webGL(renderer);
            }
        }
    }

    /**
     * Render the object using the WebGL renderer and advanced features.
     *
     * @private
     * @param {V.WebGLRenderer} renderer - The renderer
     */
    render_advanced_webGL(renderer)
    {
        renderer.flush();

        const filters = this._filters;
        const mask = this._mask;

        // push filter first as we need to ensure the stencil buffer is correct for any masking
        if (filters)
        {
            if (!this._enabledFilters)
            {
                this._enabledFilters = [];
            }

            this._enabledFilters.length = 0;

            for (let i = 0; i < filters.length; i++)
            {
                if (filters[i].enabled)
                {
                    this._enabledFilters.push(filters[i]);
                }
            }

            if (this._enabledFilters.length)
            {
                renderer.filterManager.pushFilter(this, this._enabledFilters);
            }
        }

        if (mask)
        {
            renderer.maskManager.pushMask(this, this._mask);
        }

        // add this object to the batch, only rendered if it has a texture.
        this._render_webGL(renderer);

        // now loop through the children and make sure they get rendered
        for (let i = 0, j = this.children.length; i < j; i++)
        {
            this.children[i].render_webGL(renderer);
        }

        renderer.flush();

        if (mask)
        {
            renderer.maskManager.popMask(this, this._mask);
        }

        if (filters && this._enabledFilters && this._enabledFilters.length)
        {
            renderer.filterManager.popFilter();
        }
    }

    /**
     * To be overridden by the subclasses.
     *
     * @private
     * @param {V.WebGLRenderer} renderer - The renderer
     */
    _render_webGL(renderer) // eslint-disable-line no-unused-vars
    {
        // this is where content itself gets rendered...
    }

    /**
     * To be overridden by the subclass
     *
     * @private
     * @param {V.CanvasRenderer} renderer - The renderer
     */
    _render_canvas(renderer) // eslint-disable-line no-unused-vars
    {
        // this is where content itself gets rendered...
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @param {V.CanvasRenderer} renderer - The renderer
     */
    render_canvas(renderer)
    {
        // if not visible or the alpha is 0 then no need to render this
        if (!this.visible || this.world_alpha <= 0 || !this.renderable)
        {
            return;
        }

        if (this._mask)
        {
            renderer.maskManager.pushMask(this._mask);
        }

        this._render_canvas(renderer);
        for (let i = 0, j = this.children.length; i < j; ++i)
        {
            this.children[i].render_canvas(renderer);
        }

        if (this._mask)
        {
            renderer.maskManager.popMask(renderer);
        }
    }

    /**
     * Removes all internal references and listeners as well as removes children from the display list.
     * Do not use a Node2D after calling `destroy`.
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have their destroy
     *  method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the texture of the child sprite
     * @param {boolean} [options.base_texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the base texture of the child sprite
     */
    destroy(options)
    {
        super.destroy();

        const destroyChildren = typeof options === 'boolean' ? options : options && options.children;

        const oldChildren = this.remove_children(0, this.children.length);

        if (destroyChildren)
        {
            for (let i = 0; i < oldChildren.length; ++i)
            {
                oldChildren[i].destroy(options);
            }
        }
    }

    /**
     * The width of the Node2D, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get width()
    {
        return this.scale.x * this.get_local_Bounds().width;
    }

    set width(value) // eslint-disable-line require-jsdoc
    {
        const width = this.get_local_Bounds().width;

        if (width !== 0)
        {
            this.scale.x = value / width;
        }
        else
        {
            this.scale.x = 1;
        }

        this._width = value;
    }

    /**
     * The height of the Node2D, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    get height()
    {
        return this.scale.y * this.get_local_Bounds().height;
    }

    set height(value) // eslint-disable-line require-jsdoc
    {
        const height = this.get_local_Bounds().height;

        if (height !== 0)
        {
            this.scale.y = value / height;
        }
        else
        {
            this.scale.y = 1;
        }

        this._height = value;
    }
}

// performance increase to avoid using call.. (10x faster)
Node2D.prototype.node2d_update_transform = Node2D.prototype._update_transform;
