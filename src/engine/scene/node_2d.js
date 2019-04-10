import VObject from 'engine/core/v_object';
import { node_class_map } from 'engine/registry';
import {
    remove_items,
} from 'engine/dep/index';
import {
    Transform,
    Vector2,
    Bounds,
    Rectangle,
    Circle,
    Polygon,
    RoundedRectangle,
    Ellipse,
    Matrix,
} from 'engine/core/math/index';
import ObservableVector2 from 'engine/core/math/observable_vector2';
import Color from 'engine/core/color';

import Filter from 'engine/servers/visual/filters/filter';
import TweenManager from 'engine/tween/tween_manager';

const tmp_color = new Color(1, 1, 1, 1);

let uid = 0;

/**
 * @enum {number}
 */
export const PauseMode = {
    INHERIT: 0,
    STOP: 1,
    PROCESS: 2,
};

/**
 * @typedef DestroyOption
 * @property {boolean} children if set to true, all the children will have their
 *                              destroy method called as well. 'options' will be passed on to those calls.
 * @property {boolean} [texture] Should it destroy the current texture of the sprite as well
 * @property {boolean} [base_texture] Should it destroy the base texture of the sprite as well
 */

/**
 * A Node2D represents a collection of display objects.
 * It is the base class of all display objects that act as a container for other objects.
 *
 *```js
 * let container = new Node2D();
 * container.add_child(sprite);
 * ```
 */
export default class Node2D extends VObject {
    static instance() { return new Node2D() }

    /**
     * The visibility of the object. If false the object will not be drawn, and
     * the update_transform function will not be called.
     *
     * Only affects recursive calls from parent. You can ask for bounds or call update_transform manually
     *
     * @type {boolean}
     */
    get visible() {
        return this._visible;
    }
    set visible(value) {
        if (this._visible !== value) {
            this._visible = value;
            this._visibility_changed();
        }
    }
    /**
     * @param {boolean} value
     */
    set_visible(value) {
        this.visible = value;
        return this;
    }

    get alpha() {
        return this.modulate.a * this.self_modulate.a;
    }

    get process_priority() {
        return this._process_priority;
    }
    /** @param {number} value */
    set process_priority(value) {
        this._process_priority = value;

        if (this.idle_process) {
            this.scene_tree.make_group_changed('idle_process')
        }
        if (this.physics_process) {
            this.scene_tree.make_group_changed('physics_process')
        }
    }
    /** @param {number} value */
    set_process_priority(value) {
        this.process_priority = value;
        return this;
    }

    constructor() {
        super();

        /**
         * Data loaded from `_load_data` method
         * @type {any}
         */
        this.instance_data = null;

        /**
         * @type {number}
         */
        this.id = uid++;

        /**
         * @type {string}
         */
        this.name = '';
        /**
         * @type {string}
         */
        this.type = 'Node2D';

        this.filename = '';

        // Flags to avoid call of `instanceof` for better performance
        this.is_node = true;
        this.is_control = false;
        this.is_collision_object = false;

        /**
         * @type {boolean}
         */
        this.is_inside_tree = false;
        /**
         * @type {boolean}
         */
        this.is_queued_for_deletion = false;
        /**
         * Nodes that will always keep identity transform if this is
         * set to false.
         *
         * @type {boolean}
         */
        this.has_transform = true;

        /**
         * @private
         * @type {boolean}
         */
        this.idle_process = false;
        /**
         * @private
         * @type {boolean}
         */
        this.physics_process = false;

        // TODO: need to create Transform from factory
        /**
         * World transform and local transform of this object.
         * This will become read-only later, please do not assign anything there unless you know what are you doing
         *
         * @type {Transform}
         */
        this.transform = new Transform();
        this.block_transform_notify = false;
        this.notify_local_transform = false;
        this.notify_transform = false;

        this._visible = true;

        /**
         * Can this object be rendered, if false the object will not be drawn but the update_transform
         * methods will still be called.
         *
         * Only affects recursive calls from parent. You can ask for bounds manually
         *
         * @type {boolean}
         */
        this.renderable = true;

        /**
         * The display object container that contains this display object.
         *
         * @type {Node2D}
         * @readonly
         */
        this.parent = null;

        /**
         * @type {import('engine/scene/main/scene_tree').default}
         */
        this.scene_tree = null;

        /**
         * The multiplied alpha of the node
         *
         * @type {number}
         * @readonly
         */
        this.world_alpha = 1;

        /**
         * The area the filter is applied to. This is used as more of an optimisation
         * rather than figuring out the dimensions of the node each frame you can set this rectangle
         *
         * Also works as an interaction mask
         *
         * @type {Rectangle}
         */
        this.filter_area = null;

        /**
         * @type {Array}
         */
        this._filters = null;
        /**
         * @type {Array}
         */
        this._enabled_filters = null;

        /**
         * @type {Node2D}
         * @private
         */
        this.pause_owner = null;

        this._pause_mode = PauseMode.INHERIT;

        /**
         * The bounds object, this is used to calculate and store the bounds of the node
         *
         * @private
         * @type {Bounds}
         */
        this._bounds = new Bounds();
        /**
         * @private
         * @type {number}
         */
        this._bounds_id = 0;
        /**
         * @private
         * @type {number}
         */
        this._last_bounds_id = -1;
        /**
         * @private
         * @type {Rectangle}
         */
        this._bounds_rect = null;
        /**
         * @private
         * @type {Rectangle}
         */
        this._local_bounds_rect = null;
        /**
         * @private
         * @type {Vector2}
         */
        this._world_position = Vector2.new();
        /**
         * @private
         * @type {Vector2}
         */
        this._world_scale = Vector2.new(1, 1);
        /**
         * @private
         * @type {number}
         */
        this._world_rotation = 0;

        /**
         * The original, cached mask of the object
         *
         * @private
         * @type {import('./graphics/graphics').default|import('./sprites/sprite').default}
         */
        this._mask = null;

        /**
         * @private
         */
        this.is_mask = false;

        /**
         * If the object has been destroyed via destroy(). If true, it should not be used.
         *
         * @type {boolean}
         * @private
         * @readonly
         */
        this._destroyed = false;

        /**
         * @private
         * @type {boolean}
         */
        this._is_ready = false;

        /**
         * The array of children of this container.
         *
         * @type {Array<Node2D>}
         * @readonly
         */
        this.children = [];

        /**
         * @type {Map<string, Node2D>}
         */
        this.named_children = new Map();

        /**
         * @type {Set<string>}
         */
        this.groups = null;

        /**
         * Manager that provide tween support
         */
        this.tweens = TweenManager.new();

        this.tint = 0xFFFFFF;
        this.modulate = Color.new(1, 1, 1, 1);
        this.self_modulate = Color.new(1, 1, 1, 1);

        this._process_priority = 0;
        this.toplevel = false;

        this.interactive = false;
        this.interactive_children = true;
        /**
         * @type {Rectangle|Circle|Ellipse|Polygon|RoundedRectangle}
         */
        this.hit_area = null;
        /**
         * @type {string}
         */
        this.cursor = null;
        this.button_mode = false;

        this.layer_transform_owner = null;
    }

    /**
     * @param {any} data
     * @returns {this}
     */
    _load_data(data) {
        this.instance_data = data;

        if (data.filename !== undefined) {
            this.filename = data.filename;
        }
        if (data.name !== undefined) {
            this.name = data.name;
        }
        if (data.groups !== undefined) {
            for (const g of data.groups) {
                this.add_to_group(g);
            }
        }
        if (data.rotation !== undefined) {
            this.rotation = data.rotation;
        }
        if (data.visible !== undefined) {
            this.visible = data.visible;
        }
        if (data.x !== undefined) {
            this.x = data.x;
        }
        if (data.y !== undefined) {
            this.y = data.y;
        }
        if (data.interactive !== undefined) {
            this.interactive = data.interactive;
        }

        if (data.pivot !== undefined) {
            this.pivot.copy(data.pivot);
        }
        if (data.position !== undefined) {
            this.position.copy(data.position);
        }
        if (data.skew !== undefined) {
            this.skew.copy(data.skew);
        }
        if (data.scale !== undefined) {
            this.scale.copy(data.scale);
        }

        if (data.pause_mode !== undefined) {
            this.pause_mode = data.pause_mode;
        }

        if (data.has_transform !== undefined) {
            this.has_transform = data.has_transform;
        }

        if (data.modulate !== undefined) {
            this.modulate.copy(data.modulate);
        }
        if (data.self_modulate !== undefined) {
            this.self_modulate.copy(data.self_modulate);
        }

        return this;
    }

    _resized() { }
    _visibility_changed() { }
    _children_sorted() { }

    /**
     * Set value of this node with key, values and lerp factor
     * @param {string} key
     * @param {any} a
     * @param {any} b
     * @param {number} c
     */
    _set_lerp_value(key, a, b, c) { }
    /**
     * Set value of this node with its key
     * @param {string} key
     * @param {any} value
     */
    _set_value(key, value) { }

    is_set_as_toplevel() {
        return this.toplevel;
    }
    get_parent_item() {
        if (this.toplevel) {
            return null;
        }
        return this.parent;
    }

    /**
     * @private
     * @type {Node2D}
     */
    get _temp_node_2d_parent() {
        return const_node_2d;
    }

    /**
     * Set name of this node
     * @param {string} name
     * @returns {this}
     */
    set_name(name) {
        this.name = name;

        if (this.parent) {
            this.parent._validate_child_name(this);
        }

        return this;
    }

    /**
     * @param {boolean} p
     * @returns {this}
     */
    set_process(p) {
        this.idle_process = !!p;

        if (this.idle_process) {
            this.add_to_group('idle_process', false);
        } else {
            this.remove_from_group('idle_process');
        }

        return this;
    }
    /**
     * @param {boolean} p
     * @returns {this}
     */
    set_physics_process(p) {
        this.physics_process = !!p;

        if (this.physics_process) {
            this.add_to_group('physics_process', false);
        } else {
            this.remove_from_group('physics_process');
        }

        return this;
    }

    /**
     * @param {string} group
     * @param {boolean} [p_persistent]
     */
    add_to_group(group, p_persistent = false) {
        if (!this.groups) {
            this.groups = new Set();
        }

        const in_group = this.groups.has(group);
        if (!in_group) {
            this.groups.add(group);
            if (this.is_inside_tree) {
                this.scene_tree.add_to_group(group, this);
            }
        }

        return this;
    }
    /**
     * @param {string} group
     * @returns {this}
     */
    remove_from_group(group) {
        if (!this.groups) {
            return this;
        }

        if (this.groups.has(group)) {
            this.groups.delete(group);

            if (this.is_inside_tree) {
                this.scene_tree.remove_from_group(group, this);
            }
        }
        return this;
    }

    /**
     * @param {string} group
     */
    is_in_group(group) {
        return this.groups && this.groups.has(group);
    }

    get_groups() {
        return this.groups;
    }

    /**
     * Updates the object transform for rendering
     * @private
     */
    _update_transform() {
        if (this._destroyed || this.is_queued_for_deletion) return;

        let parent = this.parent;
        if (!parent) {
            parent = this._temp_node_2d_parent;
        }

        if (this.has_transform) {
            if (this.transform.update_transform(parent.transform)) {
                this._notify_transform_changed();
            }

            this._bounds.update_id++;
        }
    }

    /**
     * recursively updates transform of all objects from the root to this one
     * internal function for to_local()
     *
     * @private
     */
    _recursive_post_update_transform() {
        if (this._destroyed || this.is_queued_for_deletion) return;

        if (this.parent) {
            this.parent._recursive_post_update_transform();
            if (this.has_transform) {
                if (this.transform.update_transform(this.parent.transform)) {
                    this._notify_transform_changed();
                }
            }
        } else {
            if (this.has_transform) {
                if (this.transform.update_transform(this._temp_node_2d_parent.transform)) {
                    this._notify_transform_changed();
                }
            }
        }
    }

    /**
     * Retrieves the bounds of the node as a rectangle object.
     *
     * @param {boolean} [skip_update] - setting to true will stop the transforms of the scene graph from
     *  being updated. This means the calculation returned MAY be out of date BUT will give you a
     *  nice performance boost
     * @param {Rectangle} [rect] - Optional rectangle to store the result of the bounds calculation
     */
    get_bounds(skip_update = false, rect) {
        if (!skip_update) {
            if (!this.parent) {
                this.parent = this._temp_node_2d_parent;
                this.update_transform();
                this.parent = null;
            } else {
                this._recursive_post_update_transform();
                this.update_transform();
            }
        }

        if (this._bounds_id !== this._last_bounds_id) {
            this.calculate_bounds();
        }

        if (!rect) {
            if (!this._bounds_rect) {
                this._bounds_rect = new Rectangle();
            }

            rect = this._bounds_rect;
        }

        return this._bounds.get_rectangle(rect);
    }

    /**
     * Retrieves the local bounds of the node as a rectangle object
     *
     * @param {Rectangle} [rect] - Optional rectangle to store the result of the bounds calculation
     * @return {Rectangle} the rectangular bounding area
     */
    get_local_bounds(rect) {
        const transform_ref = this.transform;
        const parent_ref = this.parent;

        this.parent = null;
        this.transform = this._temp_node_2d_parent.transform;

        if (!rect) {
            if (!this._local_bounds_rect) {
                this._local_bounds_rect = new Rectangle();
            }

            rect = this._local_bounds_rect;
        }

        const bounds = this.get_bounds(false, rect);

        this.parent = parent_ref;
        this.transform = transform_ref;

        return bounds;
    }

    /**
     * Calculates the global position of the display object
     *
     * @param {Vector2} position - The world origin to calculate from
     * @param {Vector2} [point] - A Vector2 object in which to store the value, optional
     *  (otherwise will create a new Vector2)
     * @param {boolean} [skip_update=false] - Should we skip the update transform.
     * @return {Vector2} A point object representing the position of this object
     */
    to_global(position, point, skip_update = false) {
        if (!skip_update) {
            this._recursive_post_update_transform();

            // this parent check is for just in case the item is a root object.
            // If it is we need to give it a temporary parent so that node2d_update_transform works correctly
            // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
            if (!this.parent) {
                this.parent = this._temp_node_2d_parent;
                this.node2d_update_transform();
                this.parent = null;
            }
            else {
                this.node2d_update_transform();
            }
        }

        // don't need to update the lot
        return this.world_transform.xform(position, point);
    }

    /**
     * Calculates the local position of the display object relative to another point
     *
     * @param {Vector2} position - The world origin to calculate from
     * @param {Node2D} [from] - The Node2D to calculate the global position from
     * @param {Vector2} [point] - A Vector2 object in which to store the value, optional
     *  (otherwise will create a new Vector2)
     * @param {boolean} [skip_update=false] - Should we skip the update transform
     * @return {Vector2} A point object representing the position of this object
     */
    to_local(position, from, point, skip_update) {
        if (from) {
            position = from.to_global(position, point, skip_update);
        }

        if (!skip_update) {
            this._recursive_post_update_transform();

            // this parent check is for just in case the item is a root object.
            // If it is we need to give it a temporary parent so that node2d_update_transform works correctly
            // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
            if (!this.parent) {
                this.parent = this._temp_node_2d_parent;
                this.node2d_update_transform();
                this.parent = null;
            } else {
                this.node2d_update_transform();
            }
        }

        // simply apply the matrix..
        return this.world_transform.xform_inv(position, point);
    }

    /**
     * Convenience function to set the position, scale, skew and pivot at once.
     *
     * @param {number} [x=0] - The X position
     * @param {number} [y=0] - The Y position
     * @param {number} [scale_x=1] - The X scale value
     * @param {number} [scale_y=1] - The Y scale value
     * @param {number} [rotation=0] - The rotation
     * @param {number} [skew_x=0] - The X skew value
     * @param {number} [skew_y=0] - The Y skew value
     * @param {number} [pivot_x=0] - The X pivot value
     * @param {number} [pivot_y=0] - The Y pivot value
     * @returns {this}
     */
    set_transform(x = 0, y = 0, scale_x = 1, scale_y = 1, rotation = 0, skew_x = 0, skew_y = 0, pivot_x = 0, pivot_y = 0) {
        this.position.x = x;
        this.position.y = y;
        this.scale.x = !scale_x ? 1 : scale_x;
        this.scale.y = !scale_y ? 1 : scale_y;
        this.rotation = rotation;
        this.skew.x = skew_x;
        this.skew.y = skew_y;
        this.pivot.x = pivot_x;
        this.pivot.y = pivot_y;

        // Mark transform as changed
        this.transform._local_id = -1;

        return this;
    }

    /**
     * Base destroy method for generic display objects. This will automatically
     * remove the display object from its parent Node2D as well as remove
     * all current event listeners and internal references. Do not use a Node2D
     * after calling `destroy`.
     */
    free() {
        this.disconnect_all();

        if (this.parent) {
            this.parent.remove_child(this);
            this.parent = null;
        }

        Transform.free(this.transform);
        this.transform = null;

        Vector2.free(this._world_position);
        this._world_position = null;
        Vector2.free(this._world_scale);
        this._world_scale = null;

        this.instance_data = null;
        this._mask = null;

        Color.free(this.modulate);
        this.modulate = null;
        Color.free(this.self_modulate);
        this.self_modulate = null;

        TweenManager.free(this.tweens);
        this.tweens = null;

        // TODO: recycle Bound
        this._bounds = null;
        this._current_bounds = null;

        if (this.filter_area) {
            Rectangle.free(this.filter_area);
            this.filter_area = null;
        }

        this.interactive = false;
        this.interactive_children = false;

        this._destroyed = true;
    }

    /**
     * @param {Rectangle} rect
     */
    get_anchorable_rect(rect) {
        rect.x = 0;
        rect.y = 0;
        rect.width = 0;
        rect.height = 0;
        return rect;
    }

    /**
     * The position of the node on the x axis relative to the local coordinates of the parent.
     * An alias to position.x
     *
     * @type {number}
     */
    get x() {
        return this.position.x;
    }

    set x(value) {
        this.transform.position.x = value;
    }

    /**
     * The position of the node on the y axis relative to the local coordinates of the parent.
     * An alias to position.y
     *
     * @type {number}
     */
    get y() {
        return this.position.y;
    }

    set y(value) {
        this.transform.position.y = value;
    }

    /**
     * Current transform of the object based on world (parent) factors
     *
     * @member {Matrix}
     * @readonly
     */
    get world_transform() {
        return this.transform.world_transform;
    }

    /**
     * Current transform of the object based on local factors: position, scale, other stuff
     *
     * @member {Matrix}
     * @readonly
     */
    get local_transform() {
        return this.transform.local_transform;
    }

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     * Assignment by value.
     *
     * @type {ObservableVector2}
     */
    get position() {
        return this.transform.position;
    }

    set position(value) {
        this.transform.position.copy(value);
    }

    get_position() {
        return this.transform.position;
    }
    /**
     * @param {import('engine/core/math/vector2').Vector2Like|number} x
     * @param {number} [y]
     * @returns {this}
     */
    set_position(x, y) {
        if (typeof (x) === 'object') {
            y = x.y;
            x = x.x;
        }
        if (y === undefined) {
            y = x;
        }
        this.transform.position.set(x, y);
        return this;
    }

    get_global_position() {
        return this._world_position;
    }

    /**
     * The scale factor of the object.
     * Assignment by value.
     *
     * @type {ObservableVector2}
     */
    get scale() {
        return this.transform.scale;
    }

    set scale(value) {
        this.transform.scale.copy(value);
    }

    get_scale() {
        return this.transform.scale;
    }
    /**
     * @param {import('engine/core/math/vector2').Vector2Like|number} x
     * @param {number} [y]
     * @returns {this}
     */
    set_scale(x, y) {
        if (typeof (x) === 'object') {
            y = x.y;
            x = x.x;
        }
        if (y === undefined) {
            y = x;
        }
        this.transform.scale.set(x, y);
        return this;
    }

    get_global_scale() {
        return this._world_scale;
    }

    /**
     * The pivot point of the node that it rotates around
     * Assignment by value.
     *
     * @type {ObservableVector2}
     */
    get pivot() {
        return this.transform.pivot;
    }

    set pivot(value) {
        this.transform.pivot.copy(value);
    }

    get_pivot() {
        return this.transform.pivot;
    }
    /**
     * @param {import('engine/core/math/vector2').Vector2Like|number} x
     * @param {number} [y]
     * @returns {this}
     */
    set_pivot(x, y) {
        if (typeof (x) === 'object') {
            y = x.y;
            x = x.x;
        }
        if (y === undefined) {
            y = x;
        }
        this.transform.pivot.set(x, y);
        return this;
    }

    /**
     * The skew factor for the object in radians.
     * Assignment by value.
     *
     * @type {ObservableVector2}
     */
    get skew() {
        return this.transform.skew;
    }

    set skew(value) {
        this.transform.skew.copy(value);
    }

    get_skew() {
        return this.transform.skew;
    }
    /**
     * @param {import('engine/core/math/vector2').Vector2Like|number} x
     * @param {number} [y]
     * @returns {this}
     */
    set_skew(x, y) {
        if (typeof (x) === 'object') {
            y = x.y;
            x = x.x;
        }
        if (y === undefined) {
            y = x;
        }
        this.transform.skew.set(x, y);
        return this;
    }

    /**
     * The rotation of the object in radians.
     *
     * @type {number}
     */
    get rotation() {
        return this.transform.rotation;
    }

    set rotation(value) {
        this.transform.rotation = value;
    }

    get_rotation() {
        return this.transform.rotation;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_rotation(value) {
        this.transform.rotation = value;
        return this;
    }

    get_global_rotation() {
        return this._world_rotation;
    }

    /**
     * Indicates if the object is globally visible.
     *
     * @type {boolean}
     * @readonly
     */
    get world_visible() {
        /** @type {Node2D} */
        let item = this;

        do {
            if (!item.visible) {
                return false;
            }

            item = item.parent;
        } while (item);

        return true;
    }

    /**
     * Sets a mask for the node. A mask is an object that limits the visibility of an
     * object to the shape of the mask applied to it. In voltar a regular mask must be a
     * Graphics or a Sprite object. This allows for much faster masking in canvas as it
     * utilises shape clipping. To remove a mask, set this property to null.
     *
     * @type {import('./graphics/graphics').default|import('./sprites/sprite').default}
     */
    get mask() {
        return this._mask;
    }

    set mask(value) {
        if (this._mask) {
            this._mask.renderable = true;
            this._mask.is_mask = false;
        }

        this._mask = value;

        if (this._mask) {
            this._mask.renderable = false;
            this._mask.is_mask = true;
        }
    }

    /**
     * @param {import('./graphics/graphics').default|import('./sprites/sprite').default} value
     */
    set_mask(value) {
        this.mask = value;
        return this;
    }

    /**
     * Sets the filters for the node.
     * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * To remove filters simply set this property to 'null'
     *
     * @type {Filter[]}
     */
    get filters() {
        return this._filters && this._filters.slice();
    }

    set filters(value) {
        this._filters = value && value.slice();
    }

    /**
     * @param {Filter[]} value
     */
    set_filters(value) {
        this.filters = value;
    }

    get_world_2d() {
        if (this.scene_tree) {
            return this.scene_tree.viewport.find_world_2d();
        } else {
            return null;
        }
    }
    get_global_transform() {
        return this.transform.world_transform;
    }
    /**
     * @param {Matrix} p_transform
     */
    set_global_transform(p_transform) {
        const xform = this.parent.get_global_transform().clone()
            .affine_inverse()
            .append(p_transform);
        this.transform.set_from_matrix(xform).update_transform(this.parent.transform);
        Matrix.free(xform);

        // Always mark transform as changed when this is set,
        // so other systems (like the physics) will be able to receive
        // transform change notification.
        this.transform.on_change();

        return this;
    }

    _enter_tree() { }
    _ready() { }
    /**
     * @param {number} delta
     */
    _process(delta) { }
    /**
     * @param {number} delta
     */
    _physics_process(delta) { }
    _exit_tree() { }

    /**
     * @returns {this}
     */
    queue_free() {
        if (this.is_queued_for_deletion) {
            return;
        }

        if (this.scene_tree) {
            this.scene_tree.queue_delete(this);
        }

        this.is_queued_for_deletion = true;

        return this;
    }
    /**
     * Call the method at the beginning of next frame
     * @param {string} method
     * @param {any} [args]
     */
    call_deferred(method, args) {
        if (!this.is_inside_tree) {
            return this;
        }

        if (this.scene_tree) {
            this.scene_tree.message_queue.push_call(this, method, args);
        }

        return this;
    }

    _notify_transform_changed() { }

    _propagate_parent() { }
    _propagate_unparent() { }

    _propagate_enter_tree() {
        if (this._pause_mode === PauseMode.INHERIT) {
            if (this.parent) {
                this.pause_owner = this.parent.pause_owner;
            } else {
                this.pause_owner = null;
            }
        } else {
            this.pause_owner = this;
        }

        if (this.parent && this.parent.layer_transform_owner) {
            this.layer_transform_owner = this.parent.layer_transform_owner;
        }

        this._update_transform();

        // Add to scene tree groups
        if (this.groups && this.groups.size > 0) {
            for (let g of this.groups) {
                this.scene_tree.add_to_group(g, this);
            }
        }

        this._enter_tree();

        this.emit_signal('tree_entered', this);

        for (let c of this.children) {
            c.scene_tree = this.scene_tree;
            c.is_inside_tree = true;
            c._propagate_enter_tree();
        }
    }

    _propagate_ready() {
        for (let c of this.children) {
            c._propagate_ready();
        }

        this._is_ready = true;

        this._ready();
    }

    /**
     * @private
     * @param {number} delta
     */
    _propagate_process(delta) {
        if (this._destroyed || this.is_queued_for_deletion) return;

        if (this.idle_process && this.can_process()) this._process(delta);

        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i]._propagate_process(delta);
        }

        this.tweens && this.tweens._process(delta);
    }

    /**
     * @private
     * @param {number} delta
     */
    _propagate_physics_process(delta) {
        if (this._destroyed || this.is_queued_for_deletion) return;

        if (this.physics_process && this.can_process()) this._physics_process(delta);

        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i]._propagate_physics_process(delta);
        }

        // TODO: support tweens with physics_process mode
        // this.tweens && this.tweens._physics_process(delta);
    }

    _propagate_exit_tree() {
        // Stop animations
        this.tweens && this.tweens.stop_all();

        // Remove from scene tree groups
        if (this.groups && this.groups.size > 0) {
            for (const g of this.groups) {
                this.scene_tree.remove_from_group(g, this);
            }
        }

        // Let children exit tree
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i]._propagate_exit_tree();
            this.children[i].scene_tree = null;
        }

        this._exit_tree();

        this.emit_signal('tree_exited', this);

        // Reset flags
        this._is_ready = false;
        this.is_inside_tree = false;
        this.scene_tree = null;
        this.layer_transform_owner = null;
    }

    /**
     * @param {Node2D} p_owner
     */
    _propagate_pause_owner(p_owner) {
        if (this !== p_owner && this._pause_mode !== PauseMode.INHERIT) {
            return;
        }
        this.pause_owner = p_owner;
        for (let c of this.children) {
            c._propagate_pause_owner(p_owner);
        }
    }

    can_process() {
        if (this._destroyed || this.is_queued_for_deletion) return false;

        if (this.scene_tree.paused) {
            if (this._pause_mode === PauseMode.STOP) {
                return false;
            }
            if (this._pause_mode === PauseMode.PROCESS) {
                return true;
            }
            if (this._pause_mode === PauseMode.INHERIT) {
                if (!this.pause_owner) {
                    return false;
                }

                if (this.pause_owner._pause_mode === PauseMode.PROCESS) {
                    return true;
                }
                if (this.pause_owner._pause_mode === PauseMode.STOP) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Overridable method that can be used by Node2D subclasses whenever the children array is modified
     *
     * @private
     * @param {number} index
     */
    on_children_change(index) {
        /* empty */
    }
    /**
     * @param {Node2D} child
     */
    add_child_notify(child) { }
    /**
     * @param {Node2D} child
     */
    remove_child_notify(child) { }
    /**
     * @param {Node2D} child
     */
    move_child_notify(child) { }

    /**
     * Adds one or more children to the container.
     *
     * @template {Node2D} T
     * @param {T} child - The Node2D to add to the container
     * @return {T} The child that was added.
     */
    add_child(child) {
        // if the child has a parent then lets remove it as Pixi objects can only exist in one place
        if (child.parent) {
            child.parent.remove_child(child);
        }

        child.parent = this;
        child.scene_tree = this.scene_tree;
        child._destroyed = false;
        child.is_queued_for_deletion = false;
        // ensure child transform will be recalculated
        child.transform._parent_id = -1;

        this.children.push(child);

        // add to name hash
        if (child.name.length > 0) {
            this._validate_child_name(child);
        }

        // ensure bounds will be recalculated
        this._bounds_id++;

        child._propagate_parent();

        if (this.is_inside_tree) {
            child.is_inside_tree = true;
            child._propagate_enter_tree();

            // // Force pause_mode process
            // const pause_mode = child._pause_mode;
            // child._pause_mode = -1;
            // child.pause_mode = pause_mode;

            if (this._is_ready) {
                child._propagate_ready();
            }
        }

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(this.children.length - 1);
        this.add_child_notify(child);

        return child;
    }

    /**
     * Swaps the position of 2 Display Objects within this container.
     *
     * @param {Node2D} child - First display object to swap
     * @param {Node2D} child2 - Second display object to swap
     */
    swap_children(child, child2) {
        if (child === child2) {
            return;
        }

        const index1 = this.get_child_index(child);
        const index2 = this.get_child_index(child2);

        this.children[index1] = child2;
        this.children[index2] = child;
        this.on_children_change(index1 < index2 ? index1 : index2);

        return this;
    }

    /**
     * Returns the index position of a child Node2D instance
     *
     * @param {Node2D} child - The Node2D instance to identify
     * @return {number} The index position of the child display object to identify
     */
    get_child_index(child) {
        const index = this.children.indexOf(child);

        if (index === -1) {
            throw new Error('The supplied Node2D must be a child of the caller');
        }

        return index;
    }

    /**
     * Changes the position of an existing child in the display object container
     *
     * @param {Node2D} child - The child Node2D instance for which you want to change the index number
     * @param {number} index - The resulting index number for the child display object
     */
    move_child(child, index) {
        if (index < 0 || index >= this.children.length) {
            throw new Error(`The index ${index} supplied is out of bounds ${this.children.length}`);
        }

        const current_index = this.get_child_index(child);

        remove_items(this.children, current_index, 1); // remove from old position
        this.children.splice(index, 0, child); // add at new position

        this.on_children_change(index);
        this.move_child_notify(child);

        return this;
    }

    /**
     * Returns the child at the specified index
     *
     * @param {number} index - The index to get the child at
     * @return {Node2D} The child at the given index, if any.
     */
    get_child(index) {
        if (index < 0 || index >= this.children.length) {
            throw new Error(`get_child: Index (${index}) does not exist.`);
        }

        // @ts-ignore
        return this.children[index];
    }

    /**
     * Removes one or more children from the container.
     *
     * @param {Node2D} child - The Node2D to remove
     * @return {Node2D} The first child that was removed.
     */
    remove_child(child) {
        // @ts-ignore
        const index = this.children.indexOf(child);

        if (index === -1) return null;

        child._propagate_unparent();
        child.parent = null;
        child.transform._parent_id = -1;

        remove_items(this.children, index, 1);

        // remove from name hash
        if (child.name.length > 0) {
            this.named_children.delete(child.name);
        }

        // ensure bounds will be recalculated
        this._bounds_id++;

        child._propagate_exit_tree();
        child.scene_tree = null;

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(index);

        this.remove_child_notify(child);

        return child;
    }

    /**
     * Removes a child from the specified index position.
     *
     * @param {number} index - The index to get the child from
     * @return {Node2D} The child that was removed.
     */
    remove_child_at(index) {
        const child = this.get_child(index);

        child._propagate_unparent();
        child.parent = null;
        child.transform._parent_id = -1;

        remove_items(this.children, index, 1);

        // remove from name hash
        if (child.name.length > 0) {
            this.named_children.delete(child.name);
        }

        // ensure bounds will be recalculated
        this._bounds_id++;

        child._propagate_exit_tree();
        child.scene_tree = null;

        // TODO - lets either do all callbacks or all events.. not both!
        this.on_children_change(index);

        this.remove_child_notify(child);

        return child;
    }

    /**
     * Removes all children from this container that are within the begin and end indexes.
     *
     * @param {number} [beginIndex=0] - The beginning position.
     * @param {number} [endIndex=this.children.length] - The ending position. Default value is size of the container.
     * @returns {Array<Node2D>} List of removed children
     */
    remove_children(beginIndex = 0, endIndex) {
        const begin = beginIndex;
        const end = typeof endIndex === 'number' ? endIndex : this.children.length;
        const range = end - begin;
        let removed;

        if (range > 0 && range <= end) {
            removed = this.children.splice(begin, range);

            for (let i = 0; i < removed.length; ++i) {
                if (removed[i].transform) {
                    removed[i].transform._parent_id = -1;
                }
                removed[i]._propagate_unparent();
                removed[i].parent = null;

                // remove from name hash
                if (removed[i].name.length > 0) {
                    this.named_children.delete(removed[i].name);
                }

                removed[i]._propagate_exit_tree();
                removed[i].scene_tree = null;

                this.remove_child_notify(removed[i]);
            }

            this._bounds_id++;

            this.on_children_change(beginIndex);

            return removed;
        }
        else if (range === 0 && this.children.length === 0) {
            return [];
        }

        throw new RangeError('remove_children: numeric values are outside the acceptable range.');
    }

    /**
     * @returns {import('engine/scene/main/scene_tree').default}
     */
    get_tree() {
        return this.scene_tree;
    }

    get_viewport_size() {
        return this.scene_tree.viewport_rect.size;
    }

    /**
     * @param {string} path
     * @returns {Node2D}
     */
    get_node(path) {
        const list = path.split('/');

        // Find the base node
        let node = /** @type {Node2D} */ (this);

        let i = 0, l = list.length, name;

        // '/absolute/node/path' start from current scene
        if (list[0].length === 0) {
            node = this.scene_tree.current_scene;
            i = 1;
        }

        for (; i < l; i++) {
            name = list[i];
            switch (name) {
                case '.': break;
                case '..': {
                    node = node.parent;
                    if (!node) {
                        console.log('no parent node exists');
                        return null;
                    }
                } break;
                default: {
                    node = node.named_children.get(name);
                    if (!node) {
                        console.log(`node called "${name}" does not exist`);
                        return null;
                    }
                } break;
            }
        }

        return node;
    }

    get_global_mouse_position() {
        return this.get_tree().input.mouse;
    }
    get_local_mouse_position() {
        this.node2d_update_transform();
        return this.world_transform.xform_inv(this.get_tree().input.mouse);
    }

    /**
     * Updates the transform on all children of this container for rendering
     */
    update_transform() {
        if (this._destroyed || this.is_queued_for_deletion) return;

        let parent = this.parent;
        if (!parent) {
            parent = this._temp_node_2d_parent;
        }

        if (this.has_transform) {
            this._bounds_id++;

            if (this.transform.update_transform(parent.transform)) {
                this._notify_transform_changed();
            }

            const t = this.transform.world_transform;
            this._world_position.set(t.tx, t.ty);
            this._world_scale.copy(parent._world_scale)
                .multiply(this.scale);
            this._world_rotation = parent._world_rotation + this.transform.rotation;
        }

        for (const child of this.children) {
            if (child.visible) {
                child.update_transform();
            }
        }
    }

    /**
     * Recalculates the bounds of the container.
     */
    calculate_bounds() {
        this._bounds.clear();

        this._calculate_bounds();

        for (let child of this.children) {
            if (!child.visible || !child.renderable) {
                continue;
            }

            child.calculate_bounds();

            // FIXME: filter+mask is not supported, should we even consider that?
            if (child._mask) {
                child._mask.calculate_bounds();
                this._bounds.add_bounds_mask(child._bounds, child._mask._bounds);
            } else if (child.filter_area) {
                this._bounds.add_bounds_area(child._bounds, child.filter_area);
            } else {
                this._bounds.add_bounds(child._bounds);
            }
        }

        this._last_bounds_id = this._bounds_id;
    }

    /**
     * Recalculates the bounds of the object. Override this to
     * calculate the bounds of the specific object (not including children).
     * @private
     */
    _calculate_bounds() { }

    /**
     * @param {Node2D} child
     */
    _validate_child_name(child) {
        const name = child.name;
        let n = child.name;
        let i = 2;
        while (this.named_children.has(n)) {
            n = `${name}_${i++}`;
        }
        child.name = n;
        this.named_children.set(n, child);
    }

    _update_color() {
        if (this._destroyed || this.is_queued_for_deletion) return;

        const parent = this.parent || const_node_2d;

        // Calculate real color
        tmp_color
            .copy(parent.self_modulate).multiply(parent.modulate)
            .multiply(this.modulate).multiply(this.self_modulate)

        // Update our world alpha
        this.world_alpha = tmp_color.a;

        // Update our tint
        this.tint = tmp_color.as_hex();
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    render_webgl(renderer) {
        if (this._destroyed || this.is_queued_for_deletion) return;

        // if the object is not visible or the alpha is 0 then no need to render this element
        if (!this.visible || !this.renderable) {
            return;
        }

        this._update_color();

        // do a quick check to see if this element has a mask or a filter.
        if (this._mask || this._filters) {
            this.render_advanced_webgl(renderer);
        } else {
            this._render_webgl(renderer);

            // simply render children!
            for (let c of this.children) {
                c.render_webgl(renderer);
            }
        }
    }

    /**
     * Render the object using the WebGL renderer and advanced features.
     *
     * @private
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    render_advanced_webgl(renderer) {
        if (this._destroyed || this.is_queued_for_deletion) return;

        this._update_color();

        renderer.flush();

        const filters = this._filters;
        const mask = this._mask;

        // push filter first as we need to ensure the stencil buffer is correct for any masking
        if (filters) {
            if (!this._enabled_filters) {
                this._enabled_filters = [];
            }

            this._enabled_filters.length = 0;

            for (let f of filters) {
                if (f.enabled) {
                    this._enabled_filters.push(f);
                }
            }

            if (this._enabled_filters.length) {
                renderer.filter_manager.push_filter(this, this._enabled_filters);
            }
        }

        if (mask) {
            renderer.mask_manager.push_mask(this, this._mask);
        }

        // add this object to the batch, only rendered if it has a texture.
        this._render_webgl(renderer);

        // now loop through the children and make sure they get rendered
        for (let c of this.children) {
            c.render_webgl(renderer);
        }

        renderer.flush();

        if (mask) {
            renderer.mask_manager.pop_mask(this, this._mask);
        }

        if (filters && this._enabled_filters && this._enabled_filters.length) {
            renderer.filter_manager.pop_filter();
        }
    }

    /**
     * To be overridden by the subclasses.
     *
     * @private
     * @param {import('engine/servers/visual/webgl_renderer').default} renderer - The renderer
     */
    _render_webgl(renderer) { }

    /**
     * Removes all internal references and listeners as well as removes children from the display list.
     * Do not use a Node2D after calling `destroy`.
     *
     * @param {DestroyOption|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @returns {this}
     */
    destroy_children(options) {
        const destroy_children = typeof options === 'boolean' ? options : options && options.children;

        const old_children = this.remove_children(0, this.children.length);

        if (destroy_children) {
            for (let i = 0; i < old_children.length; ++i) {
                old_children[i].destroy_children(options);
            }
        }

        return this;
    }

    /**
     * @type {PauseMode}
     */
    get pause_mode() {
        return this._pause_mode;
    }
    set pause_mode(p_mode) {
        if (this._pause_mode === p_mode) {
            return;
        }

        const prev_inherits = this._pause_mode === PauseMode.INHERIT;
        this._pause_mode = p_mode;
        if (!this.is_inside_tree) {
            return;
        }
        if ((this._pause_mode === PauseMode.INHERIT) === prev_inherits) {
            return;
        }

        /** @type {Node2D} */
        let owner = null;

        if (this._pause_mode === PauseMode.INHERIT) {
            if (this.parent) {
                owner = this.parent.pause_owner;
            }
        } else {
            owner = this;
        }

        this._propagate_pause_owner(owner);
    }
}

/**
 * performance increase to avoid using call.. (10x faster)
 * @this {Node2D}
 */
Node2D.prototype.node2d_update_transform = Node2D.prototype.update_transform;

node_class_map['Node2D'] = Node2D;

const const_node_2d = Object.freeze(new Node2D());
