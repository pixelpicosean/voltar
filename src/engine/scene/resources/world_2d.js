import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";

import { VSG } from "engine/servers/visual/visual_server_globals";
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
    _notifier_update_cells(p_notifier, p_rect, p_add) {
        const begin = Vector2.new(p_rect.x, p_rect.y);
        begin.scale(1 / this.cell_size);
        const end = Vector2.new(p_rect.x + p_rect.width, p_rect.y + p_rect.height);
        end.scale(1 / this.cell_size);
        for (let i = begin.x; i <= end.x; i++) {
            for (let j = begin.y; j < end.y; j++) {
                /** @type {CellKey} */
                let ck = null;
                /** @type {CellData} */
                let E = null;
                for (let [_ck, cd] of this.cells) {
                    if (_ck.x === i && _ck.y === j) {
                        ck = _ck;
                        E = cd;
                        break;
                    }
                }

                if (p_add) {
                    if (!E) {
                        E = new CellData();
                        this.cells.set(ck, E);
                    }
                    E.notifiers.get(p_notifier).inc();
                } else {
                    if (E.notifiers.get(p_notifier).dec() === 0) {
                        E.notifiers.delete(p_notifier);
                        if (E.notifiers.size === 0) {
                            this.cells.delete(ck);
                        }
                    }
                }
            }
        }

        Vector2.free(end);
        Vector2.free(begin);
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _notifier_add(p_notifier, p_rect) {
        this.notifiers.set(p_notifier, p_rect);
        this._notifier_update_cells(p_notifier, p_rect, true);
        this.changed = true;
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _notifier_update(p_notifier, p_rect) {
        const E = this.notifiers.get(p_notifier);

        if (!E) return;

        this._notifier_update_cells(p_notifier, p_rect, true);
        this._notifier_update_cells(p_notifier, E, false);
        E.copy(p_rect);
        this.changed = true;
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     */
    _notifier_remove(p_notifier) {
        const E = this.notifiers.get(p_notifier);
        this._notifier_update_cells(p_notifier, E, false);
        this.notifiers.delete(p_notifier);

        const removed = [];
        for (const [vp, vd] of this.viewports) {
            const G = vd.notifiers.get(p_notifier);
            if (G !== undefined) {
                vd.notifiers.delete(p_notifier);
                removed.push(vp);
            }
        }

        while (removed.length > 0) {
            p_notifier._exit_viewport(removed.shift());
        }

        this.changed = true;
    }

    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
     */
    _add_viewport(p_viewport, p_rect) {
        const vd = new ViewportData();
        vd.rect.copy(p_rect);
        this.viewports.set(p_viewport, vd);
        this.changed = true;
    }
    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
     */
    _update_viewport(p_viewport, p_rect) {
        const E = this.viewports.get(p_viewport);
        if (!E) return;
        if (E.rect.equals(p_rect)) return;
        E.rect.copy(p_rect);
        this.changed = true;
    }
    /**
     * @param {Viewport} p_viewport
     */
    _remove_viewport(p_viewport) {
        /** @type {VisibilityNotifier2D[]} */
        const removed = [];
        for (const [k] of this.viewports.get(p_viewport).notifiers) {
            removed.push(k);
        }

        while (removed.length > 0) {
            removed.shift()._exit_viewport(p_viewport);
        }

        this.viewports.delete(p_viewport);
    }

    _update() {
        if (!this.changed) {
            return;
        }

        const begin = Vector2.new();
        const end = Vector2.new();
        for (let [E_key, E_get] of this.viewports) {
            begin.set(E_get.rect.x, E_get.rect.y);
            begin.scale(1 / this.cell_size);
            end.set(E_get.rect.x + E_get.rect.width, E_get.rect.y + E_get.rect.height);
            end.scale(1 / this.cell_size);
            this.pass++;
            /** @type {VisibilityNotifier2D[]} */
            const added = [];
            /** @type {VisibilityNotifier2D[]} */
            const removed = [];

            const visible_cells = (end.x - begin.x) * (end.y - begin.y);

            if (visible_cells > 10000) {
                for (let [ck, F_get] of this.cells) {
                    if (ck.x < begin.x || ck.x > end.x) continue;
                    if (ck.y < begin.y || ck.y > end.y) continue;

                    for (let [G_key, G_get] of F_get.notifiers) {
                        /** @type {VisibilityNotifier2D} */
                        let H = null;
                        for (let [vn, _] of E_get.notifiers) {
                            if (vn === G_key) {
                                H = vn;
                                break;
                            }
                        }
                        if (!H) {
                            E_get.notifiers.set(G_key, this.pass);
                            added.push(G_key);
                        } else {
                            E_get.notifiers.set(H, this.pass);
                        }
                    }
                }
            } else {
                for (let i = begin.x; i < end.x; i++) {
                    for (let j = begin.y; j < end.y; j++) {
                        /** @type {CellKey} */
                        let ck = null;
                        /** @type {CellData} */
                        let F_get = null;
                        for (let [ck_, cd] of this.cells) {
                            if (ck_.x === i && ck_.y === j) {
                                ck = ck;
                                F_get = cd;
                                break;
                            }
                        }
                        if (!F_get) {
                            continue;
                        }

                        for (let [G_key, G_get] of F_get.notifiers) {
                            /** @type {VisibilityNotifier2D} */
                            let H = null;
                            for (let [vn, _] of E_get.notifiers) {
                                if (vn === G_key) {
                                    H = vn;
                                    break;
                                }
                            }
                            if (!H) {
                                E_get.notifiers.set(G_key, this.pass);
                                added.push(G_key);
                            } else {
                                E_get.notifiers.set(H, this.pass);
                            }
                        }
                    }
                }
            }

            for (let [F_key, F_get] of E_get.notifiers) {
                if (F_get !== this.pass) {
                    removed.push(F_key);
                }
            }

            while (added.length > 0) {
                added.shift()._enter_viewport(E_key);
            }

            while (removed.length > 0) {
                const front = removed.shift();
                E_get.notifiers.delete(front);
                front._exit_viewport(E_key);
            }
        }
        Vector2.free(end);
        Vector2.free(begin);

        this.changed = false;
    }
}

export class World2D {
    get direct_space_state() {
        return this.space.direct_access;
    }

    constructor() {
        this.canvas = VSG.canvas.canvas_create();
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

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _register_notifier(p_notifier, p_rect) {
        this.indexer._notifier_add(p_notifier, p_rect);
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _update_notifier(p_notifier, p_rect) {
        this.indexer._notifier_update(p_notifier, p_rect);
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     */
    _remove_notifier(p_notifier) {
        this.indexer._notifier_remove(p_notifier);
    }

    _update() {
        this.indexer._update();
    }
}
