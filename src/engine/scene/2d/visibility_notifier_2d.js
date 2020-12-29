import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Rect2 } from "engine/core/math/rect2.js";

import { AnimationPlayer } from "../animation/animation_player.js";
import { Viewport } from "../main/viewport.js";
import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    Node,
} from "../main/node.js";
import { Node2D } from "./node_2d.js";
import { CPUParticles2D } from "./cpu_particles_2d.js";
import { NOTIFICATION_TRANSFORM_CHANGED } from "../const";
import { AnimatedSprite } from "./animated_sprite.js";


export class VisibilityNotifier2D extends Node2D {
    get class() { return 'VisibilityNotifier2D' }

    constructor() {
        super();

        this.rect = new Rect2(-10, 10, 20, 20);

        /**
         * @type {Set<Viewport>}
         */
        this.viewports = new Set();

        this.set_notify_transform(true);
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.rect !== undefined) {
            this.set_rect(data.rect);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                let rect = this.get_global_transform().xform_rect(this.rect);
                this.get_world_2d()._register_notifier(this, rect);
                Rect2.free(rect);
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                let rect = this.get_global_transform().xform_rect(this.rect);
                this.get_world_2d()._update_notifier(this, rect);
                Rect2.free(rect);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.get_world_2d()._remove_notifier(this);
            } break;
        }
    }

    _screen_enter() { }
    _screen_exit() { }

    /* public */

    is_on_screen() {
        return this.viewports.size > 0;
    }

    /**
     * @param {Rect2} p_rect
     */
    set_rect(p_rect) {
        this.rect.copy(p_rect);
        if (this.is_inside_tree()) {
            let rect = this.get_global_transform().xform_rect(this.rect);
            this.get_world_2d()._update_notifier(this, rect);
            Rect2.free(rect);
        }
    }

    /* private */

    /**
     * @param {Viewport} viewport
     */
    _enter_viewport(viewport) {
        this.viewports.add(viewport);

        if (this.viewports.size === 1) {
            this.emit_signal('screen_entered');
            this._screen_enter();
        }
        this.emit_signal('viewport_entered', viewport);
    }
    /**
     * @param {Viewport} viewport
     */
    _exit_viewport(viewport) {
        this.viewports.delete(viewport);

        this.emit_signal('viewport_exited', viewport);
        if (this.viewports.size === 0) {
            this.emit_signal('screen_exited');
            this._screen_exit();
        }
    }
}
node_class_map['VisibilityNotifier2D'] = GDCLASS(VisibilityNotifier2D, Node2D)


export const ENABLER_PAUSE_ANIMATIONS = 0;
export const ENABLER_FREEZE_BODIES = 1;
export const ENABLER_PAUSE_PARTICLES = 2;
export const ENABLER_PARENT_PROCESS = 3;
export const ENABLER_PARENT_PHYSICS_PROCESS = 4;
export const ENABLER_PAUSE_ANIMATED_SPRITES = 5;

export class VisibilityEnabler2D extends VisibilityNotifier2D {
    get class() { return 'VisibilityEnabler2D' }
    constructor() {
        super();

        this.visible = false;
        this.enabler = [
            true,
            true,
            true,
            false,
            false,
            true,
        ];

        /**
         * @type {Map<Node, any>}
         */
        this.nodes = new Map();
    }

    /**
     * @param {number} p_enabler
     * @param {boolean} p_enable
     */
    set_enabler(p_enabler, p_enable) {
        this.enabler[p_enabler] = p_enable;
        return this;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.freeze_bodies !== undefined) {
            this.set_enabler(ENABLER_FREEZE_BODIES, data.freeze_bodies);
        }
        if (data.pause_animated_sprites !== undefined) {
            this.set_enabler(ENABLER_PAUSE_ANIMATED_SPRITES, data.pause_animated_sprites);
        }
        if (data.pause_animations !== undefined) {
            this.set_enabler(ENABLER_PAUSE_ANIMATIONS, data.pause_animations);
        }
        if (data.pause_particles !== undefined) {
            this.set_enabler(ENABLER_PAUSE_PARTICLES, data.pause_particles);
        }
        if (data.physics_process_parent !== undefined) {
            this.set_enabler(ENABLER_PARENT_PHYSICS_PROCESS, data.physics_process_parent);
        }
        if (data.process_parent !== undefined) {
            this.set_enabler(ENABLER_PARENT_PROCESS, data.process_parent);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        if (p_what === NOTIFICATION_ENTER_TREE) {
            /** @type {Node} */
            let from = this;
            while (from.get_parent() && from.filename.length === 0) {
                from = from.get_parent();
            }

            this._find_nodes(from);

            let parent = this.get_parent();
            if (this.enabler[ENABLER_PARENT_PHYSICS_PROCESS] && parent) {
                parent.connect_once('_ready', parent.set_physics_process.bind(parent, false));
            }
            if (this.enabler[ENABLER_PARENT_PROCESS] && parent) {
                parent.connect_once('_ready', parent.set_process.bind(parent, false));
            }
        }

        if (p_what === NOTIFICATION_EXIT_TREE) {
            for (let [E_key, E_get] of this.nodes) {
                if (!this.visible) {
                    this._change_node_state(E_key, true);
                }
                E_key.disconnect('tree_exiting', this._node_removed, this);
            }

            this.nodes.clear();
        }
    }

    /**
     * @param {Node} p_node
     */
    _find_nodes(p_node) {
        let add = false;

        // TODO: freeze RigidBody2D

        if (p_node.class === 'AnimationPlayer') {
            add = true;
        }

        if (p_node.class === 'AnimatedSprite') {
            add = true;
        }

        if (p_node.class === 'Particle') {
            add = true;
        }

        if (add) {
            p_node.connect_once('tree_exiting', this._node_removed.bind(this, p_node));
            this.nodes.set(p_node, {});
            this._change_node_state(p_node, false);
        }

        for (let c of p_node.data.children) {
            if (c.data.filename.length > 0) {
                continue;
            }

            this._find_nodes(c);
        }
    }

    _screen_enter() {
        for (let [E_key] of this.nodes) {
            this._change_node_state(E_key, true);
        }

        let parent = this.get_parent();
        if (this.enabler[ENABLER_PARENT_PHYSICS_PROCESS] && parent) {
            parent.set_physics_process(true);
        }
        if (this.enabler[ENABLER_PARENT_PROCESS] && parent) {
            parent.set_process(true);
        }

        this.visible = true;
    }
    _screen_exit() {
        for (let [E_key] of this.nodes) {
            this._change_node_state(E_key, false);
        }

        let parent = this.get_parent();
        if (this.enabler[ENABLER_PARENT_PHYSICS_PROCESS] && parent) {
            parent.set_physics_process(false);
        }
        if (this.enabler[ENABLER_PARENT_PROCESS] && parent) {
            parent.set_process(false);
        }

        this.visible = false;
    }

    /**
     * @param {Node} p_node
     * @param {boolean} p_enabled
     */
    _change_node_state(p_node, p_enabled) {
        if (this.enabler[ENABLER_FREEZE_BODIES]) {
            if (p_node.class === 'RigidBody2D') {
                // TODO: sleep RigidBody2D
            }
        }

        if (this.enabler[ENABLER_PAUSE_ANIMATIONS]) {
            if (p_node.class === 'AnimationPlayer') {
                /** @type {AnimationPlayer} */(p_node).playback_active = p_enabled;
            }
        }

        if (this.enabler[ENABLER_PAUSE_ANIMATED_SPRITES]) {
            if (p_node.class === 'AnimatedSprite') {
                if (p_enabled) {
                    /** @type {AnimatedSprite} */ (p_node).play();
                } else {
                    /** @type {AnimatedSprite} */ (p_node).stop();
                }
            }
        }

        if (this.enabler[ENABLER_PAUSE_PARTICLES]) {
            if (p_node.class === 'CPUParticle2D') {
                /** @type {CPUParticles2D} */(p_node).emitting = p_enabled;
            }
        }
    }

    /**
     * @param {Node2D} p_node
     */
    _node_removed(p_node) {
        if (!this.visible) {
            this._change_node_state(p_node, true);
        }
        this.nodes.delete(p_node);
    }
}
node_class_map['VisibilityEnabler2D'] = GDCLASS(VisibilityEnabler2D, VisibilityNotifier2D)
