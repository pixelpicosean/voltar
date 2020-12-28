import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2.js";

import { VSG } from "engine/servers/visual/visual_server_globals.js";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server.js";

import { Viewport } from "../main/viewport.js";
import { VisibilityNotifier2D } from "../2d/visibility_notifier_2d.js";

/** @type {CellData[]} */
const CellData_pool = [];
class CellData {
    static create() {
        let d = CellData_pool.pop();
        if (!d) d = new CellData;
        return d;
    }
    /**
     * @param {CellData} data
     */
    static free(data) {
        data.x = 0;
        data.y = 0;
        data.notifiers = Object.create(null);
        CellData_pool.push(data);
    }
    constructor() {
        this.x = 0;
        this.y = 0;
        /** @type {{ [id: number]: { notifier: VisibilityNotifier2D, rc: number } }} */
        this.notifiers = Object.create(null);
    }
}

/** @type {ViewportData[]} */
const ViewportData_pool = [];
class ViewportData {
    static create() {
        let d = ViewportData_pool.pop();
        if (!d) d = new ViewportData;
        return d;
    }
    /**
     * @param {ViewportData} data
     */
    static free(data) {
        data.viewport = null;
        data.notifiers = Object.create(null);
        data.rect.set(0, 0, 0, 0);
        ViewportData_pool.push(data);
    }
    constructor() {
        /** @type {Viewport} */
        this.viewport = null;
        /** @type {{ [id: number]: { notifier: VisibilityNotifier2D, pass: number } }} */
        this.notifiers = Object.create(null);
        this.rect = new Rect2;
    }
}

/** @type {NotifierData[]} */
const NotifierData_pool = [];
class NotifierData {
    /**
     * @param {VisibilityNotifier2D} notifier
     * @param {Rect2} rect
     */
    static create(notifier, rect) {
        let d = NotifierData_pool.pop();
        if (!d) d = new NotifierData();
        return d.set(notifier, rect);
    }
    /**
     * @param {NotifierData} data
     */
    static free(data) {
        data.notifier = null;
        data.rect.set(0, 0, 0, 0);
        NotifierData_pool.push(data);
    }

    constructor() {
        /** @type {VisibilityNotifier2D} */
        this.notifier = null;
        this.rect = new Rect2;
    }
    /**
     * @param {VisibilityNotifier2D} notifier
     * @param {Rect2} rect
     */
    set(notifier, rect) {
        this.notifier = notifier;
        this.rect.copy(rect);
        return this;
    }
}

class SpatialIndexer2D {
    constructor() {
        /** @type {{ [key: string]: CellData }} */
        this.cells = Object.create(null);
        this.cell_size = 100;

        /** @type {{ [id: number]: NotifierData }} */
        this.notifiers = Object.create(null);

        /** @type {{ [id: number]: ViewportData }} */
        this.viewports = Object.create(null);

        this.changed = false;

        this.pass = 0;
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     * @param {boolean} p_add
     */
    _notifier_update_cells(p_notifier, p_rect, p_add) {
        let begin = Vector2.create(p_rect.x, p_rect.y);
        begin.scale(1 / this.cell_size).floor();
        let end = Vector2.create(p_rect.x + p_rect.width, p_rect.y + p_rect.height);
        end.scale(1 / this.cell_size).floor();
        for (let i = begin.x; i <= end.x; i++) {
            for (let j = begin.y; j <= end.y; j++) {
                let key = `${i}.${j}`;
                let data = this.cells[key];

                if (p_add) {
                    if (!data) {
                        data = CellData.create();
                        data.x = i;
                        data.y = j;
                        this.cells[key] = data;
                    }
                    if (!data.notifiers[p_notifier.instance_id]) {
                        data.notifiers[p_notifier.instance_id] = {
                            notifier: p_notifier,
                            rc: 0,
                        };
                    }
                    data.notifiers[p_notifier.instance_id].rc += 1;
                } else {
                    data.notifiers[p_notifier.instance_id].rc -= 1;
                    if (data.notifiers[p_notifier.instance_id].rc === 0) {
                        delete data.notifiers[p_notifier.instance_id];
                        let has_notifier = false;
                        for (let id in data.notifiers) {
                            if (data.notifiers[id] !== undefined) {
                                has_notifier = true;
                                break;
                            }
                        }
                        if (!has_notifier) {
                            delete this.cells[key];
                            CellData.free(data);
                        };
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
        this.notifiers[p_notifier.instance_id] = NotifierData.create(p_notifier, p_rect);
        this._notifier_update_cells(p_notifier, p_rect, true);
        this.changed = true;
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     * @param {Rect2} p_rect
     */
    _notifier_update(p_notifier, p_rect) {
        let data = this.notifiers[p_notifier.instance_id];
        if (!data || data.rect.equals(p_rect)) return;

        this._notifier_update_cells(p_notifier, p_rect, true);
        this._notifier_update_cells(p_notifier, data.rect, false);
        data.rect.copy(p_rect);
        this.changed = true;
    }

    /**
     * @param {VisibilityNotifier2D} p_notifier
     */
    _notifier_remove(p_notifier) {
        let data = this.notifiers[p_notifier.instance_id];
        this._notifier_update_cells(p_notifier, data.rect, false);
        delete this.notifiers[p_notifier.instance_id];
        NotifierData.free(data);

        /** @type {Viewport[]} */
        let removed = [];
        for (let id in this.viewports) {
            let vd = this.viewports[id];

            let count = vd.notifiers[p_notifier.instance_id];
            if (count !== undefined) {
                delete vd.notifiers[p_notifier.instance_id];
                removed.push(vd.viewport);
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
        let vd = ViewportData.create();
        vd.rect.copy(p_rect);
        vd.viewport = p_viewport;
        this.viewports[p_viewport.instance_id] = vd;
        this.changed = true;
    }
    /**
     * @param {Viewport} p_viewport
     * @param {Rect2} p_rect
     */
    _update_viewport(p_viewport, p_rect) {
        let vd = this.viewports[p_viewport.instance_id];
        if (!vd || vd.rect.equals(p_rect)) return;

        vd.rect.copy(p_rect);
        this.changed = true;
    }
    /**
     * @param {Viewport} p_viewport
     */
    _remove_viewport(p_viewport) {
        /** @type {VisibilityNotifier2D[]} */
        let removed = [];
        let notifiers = this.viewports[p_viewport.instance_id].notifiers;
        for (let id in notifiers) {
            removed.push(notifiers[id].notifier);
        }

        while (removed.length > 0) {
            removed.shift()._exit_viewport(p_viewport);
        }

        ViewportData.free(this.viewports[p_viewport.instance_id]);
        delete this.viewports[p_viewport.instance_id];
    }

    _update() {
        if (!this.changed) {
            return;
        }

        let begin = Vector2.create();
        let end = Vector2.create();
        for (let id in this.viewports) {
            let vd = this.viewports[id];
            begin.set(vd.rect.x, vd.rect.y);
            begin.scale(1 / this.cell_size).floor();
            end.set(vd.rect.x + vd.rect.width, vd.rect.y + vd.rect.height);
            end.scale(1 / this.cell_size).floor();
            this.pass++;
            /** @type {VisibilityNotifier2D[]} */
            let added = [];
            /** @type {VisibilityNotifier2D[]} */
            let removed = [];

            let visible_cells = (end.x - begin.x) * (end.y - begin.y);

            if (visible_cells > 10000) {
                for (let key in this.cells) {
                    let cell = this.cells[key];

                    if (cell.x < begin.x || cell.x > end.x) continue;
                    if (cell.y < begin.y || cell.y > end.y) continue;

                    for (let id in cell.notifiers) {
                        let n_data = vd.notifiers[id];
                        if (!n_data) {
                            n_data = vd.notifiers[id] = {
                                notifier: cell.notifiers[id].notifier,
                                pass: this.pass,
                            };
                            added.push(n_data.notifier);
                        } else {
                            n_data.pass = this.pass;
                        }
                    }
                }
            } else {
                for (let i = begin.x; i <= end.x; i++) {
                    for (let j = begin.y; j <= end.y; j++) {
                        let cell = this.cells[`${i}.${j}`];
                        if (!cell) {
                            continue;
                        }

                        for (let id in cell.notifiers) {
                            let n_data = vd.notifiers[id];
                            if (!n_data) {
                                n_data = vd.notifiers[id] = {
                                    notifier: cell.notifiers[id].notifier,
                                    pass: this.pass,
                                };
                                added.push(n_data.notifier);
                            } else {
                                n_data.pass = this.pass;
                            }
                        }
                    }
                }
            }

            for (let id in vd.notifiers) {
                if (vd.notifiers[id].pass !== this.pass) {
                    removed.push(vd.notifiers[id].notifier);
                }
            }

            while (added.length > 0) {
                added.shift()._enter_viewport(vd.viewport);
            }

            while (removed.length > 0) {
                let front = removed.shift();
                delete vd.notifiers[front.instance_id];
                front._exit_viewport(vd.viewport);
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
