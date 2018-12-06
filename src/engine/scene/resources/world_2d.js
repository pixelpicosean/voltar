import VisibilityNotifier2D from "../visibility_notifier_2d";
import { Rectangle, Vector2 } from "engine/math/index";
import Viewport from "../main/viewport";
import PhysicsServer from "engine/servers/physics_2d/physics_server";

class CellRef {
    constructor() { this.ref = 0 }
    inc() { this.ref++; return this.ref }
    dec() { this.ref--; return this.ref }
}

class CellKey {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.key = 0;
    }
}

class CellData {
    constructor() {
        /**
         * @type {Map<VisibilityNotifier2D, CellRef>}
         */
        this.notifiers = new Map();
    }
}

class ViewportData {
    constructor() {
        /**
         * @type {Map<VisibilityNotifier2D, number>}
         */
        this.notifiers = new Map();
        this.rect = new Rectangle();
    }
}

class SpatialIndexer2D {
    constructor() {
        /**
         * @type {Map<CellKey, CellData>}
         */
        this.cells = new Map();
        this.cell_size = 100;

        /**
         * @type {Map<VisibilityNotifier2D, Rectangle>}
         */
        this.notifiers = new Map();

        /**
         * @type {Map<Viewport, ViewportData>}
         */
        this.viewports = new Map();

        this.changed = false;

        this.pass = 0;
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rectangle} p_rect
     * @param {boolean} p_add
     */
    _notifier_update_cells(p_notifier, p_rect, p_add) { }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rectangle} p_rect
     */
    _notifier_add(p_notifier, p_rect) { }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rectangle} p_rect
     */
    _notifier_update(p_notifier, p_rect) { }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     */
    _notifier_remove(p_notifier) { }

    /**
     * @param {Viewport} p_viewport
     * @param {Rectangle} p_rect
     */
    _add_viewport(p_viewport, p_rect) { }
    /**
     * @param {Viewport} p_viewport
     * @param {Rectangle} p_rect
     */
    _update_viewport(p_viewport, p_rect) { }
    /**
     * @param {Viewport} p_viewport
     */
    _remove_viewport(p_viewport) { }

    _update() {
        if (!this.changed) {
            return;
        }

        for (let [_, E] of this.viewports) {

        }

        this.changed = false;
    }
}

export default class World2D {
    constructor() {
        this.canvas = null;

        this.space = PhysicsServer.singleton.space_create();
        PhysicsServer.singleton.space_set_active(this.space, true);
        // TODO: load data from `project.godot`
        this.space.default_area.gravity = 98;
        this.space.default_area.gravity_vector = new Vector2(0, 1);
        this.space.default_area.linear_damp = 0.1;
        this.space.default_area.angular_damp = 1;

        this.indexer = new SpatialIndexer2D();
    }
    free() {
        PhysicsServer.singleton.free(this.space);
    }

    /**
     * @param {Viewport} p_viewport
     * @param {Rectangle} p_rect
     */
    _register_viewport(p_viewport, p_rect) {
        this.indexer._add_viewport(p_viewport, p_rect);
    }

    /**
     * @param {Viewport} p_viewport
     * @param {Rectangle} p_rect
     */
    _update_viewport(p_viewport, p_rect) {
        this.indexer._update_viewport(p_viewport, p_rect);
    }

    /**
     * @param {Viewport} p_viewport
     */
    _remove_viewport(p_viewport) {
        this.indexer._remove_viewport(p_viewport);
    }

    _update() {
        this.indexer._update();
    }
}
