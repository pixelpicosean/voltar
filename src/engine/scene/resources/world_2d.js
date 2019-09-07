import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";

import { Viewport } from "../main/viewport";
import { VisibilityNotifier2D } from "../2d/visibility_notifier_2d";


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
        this.rect = new Rect2();
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
         * @type {Map<VisibilityNotifier2D, Rect2>}
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
     * @param {Rect2} p_rect
     * @param {boolean} p_add
     */
    _notifier_update_cells(p_notifier, p_rect, p_add) { }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _notifier_add(p_notifier, p_rect) { }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _notifier_update(p_notifier, p_rect) { }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     */
    _notifier_remove(p_notifier) { }

    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
     */
    _add_viewport(p_viewport, p_rect) { }
    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
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
    get direct_space_state() {
        return this.space.direct_access;
    }

    constructor() {
        this.canvas = null;

        this.space = Physics2DServer.get_singleton().space_create();
        Physics2DServer.get_singleton().space_set_active(this.space, true);
        // TODO: load data from `project.godot`
        this.space.default_area.gravity = 98;
        this.space.default_area.gravity_vector = new Vector2(0, 1);
        this.space.default_area.linear_damp = 0.1;
        this.space.default_area.angular_damp = 1;

        this.indexer = new SpatialIndexer2D();
    }
    free_rid() {
        Physics2DServer.get_singleton().free_rid(this.space);
    }

    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
     */
    _register_viewport(p_viewport, p_rect) {
        this.indexer._add_viewport(p_viewport, p_rect);
    }

    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
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
