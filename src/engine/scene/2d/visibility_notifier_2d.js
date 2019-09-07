import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Rect2 } from "engine/core/math/rect2";

import { AnimationPlayer } from "../animation/animation_player";
import { Viewport } from "../main/viewport";
import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from "../main/node";
import {
    NOTIFICATION_TRANSFORM_CHANGED,
    NOTIFICATION_DRAW,
} from "./canvas_item";
import { Node2D } from "./node_2d";


export class VisibilityNotifier2D extends Node2D {
    /** @property {Rect2} */
    get rect() {
        return this._rect;
    }
    set rect(p_rect) {
        this._rect.copy(p_rect);
        if (this.is_inside_tree()) {
            this.get_world_2d()._update_notifier(this, this.get_global_transform().xform_rect(this._rect));
        }
    }

    constructor() {
        super();

        this.class = 'VisibilityNotifier2D';

        this._rect = new Rect2(-10, 10, 20, 20);

        /**
         * @type {Set<Viewport>}
         */
        this.viewports = new Set();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.rect !== undefined) {
            this.rect = data.rect;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.get_world_2d()._register_notifier(this, this.get_global_transform().xform_rect(this._rect));
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                this.get_world_2d()._update_notifier(this, this.get_global_transform().xform_rect(this._rect));
            } break;
            case NOTIFICATION_DRAW: {
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.get_world_2d()._remove_notifier(this);
            } break;
        }
    }

    is_on_screen() {
        return this.viewports.size > 0;
    }

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

    _screen_enter() { }
    _screen_exit() { }
}
node_class_map['VisibilityEnabler2D'] = GDCLASS(VisibilityNotifier2D, Node2D)


export class VisibilityEnabler2D extends VisibilityNotifier2D {
    constructor() {
        super();

        this.class = 'VisibilityEnabler2D';

        this.freeze_bodies = true;
        this.pause_animated_sprites = true;
        this.pause_animations = true;
        this.pause_particles = true;
        this.physics_process_parent = false;
        this.process_parent = false;

        this.notifier_visible = false;
        /**
         * @type {Map<Node2D, any>}
         */
        this.nodes = new Map();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.freeze_bodies !== undefined) {
            this.freeze_bodies = data.freeze_bodies;
        }
        if (data.pause_animated_sprites !== undefined) {
            this.pause_animated_sprites = data.pause_animated_sprites;
        }
        if (data.pause_animations !== undefined) {
            this.pause_animations = data.pause_animations;
        }
        if (data.pause_particles !== undefined) {
            this.pause_particles = data.pause_particles;
        }
        if (data.physics_process_parent !== undefined) {
            this.physics_process_parent = data.physics_process_parent;
        }
        if (data.process_parent !== undefined) {
            this.process_parent = data.process_parent;
        }

        return this;
    }

    _propagate_enter_tree() {
        super._propagate_enter_tree();

        /** @type {Node2D} */
        let from = this;
        while (from.parent && from.filename.length === 0) {
            from = from.parent;
        }

        this._find_nodes(from);

        if (this.parent) {
            if (this.physics_process_parent) {
                this.parent.set_physics_process(false);
            }
            if (this.process_parent) {
                this.parent.set_process(false);
            }
        }
    }

    _propagate_exit_tree() {
        super._propagate_exit_tree();

        for (let [E] of this.nodes) {
            if (!this.notifier_visible) {
                this._change_node_state(E, true);
            }
            E.disconnect('tree_exiting', this._node_removed, this);
        }

        this.nodes.clear();
    }

    /**
     * @param {Node2D} p_node
     */
    _find_nodes(p_node) {
        let add = false;

        if (this.freeze_bodies) {
            // TODO: freeze RigidBody2D
        }

        if (this.pause_animations) {
            if (p_node.class === 'AnimationPlayer') {
                add = true;
            }
        }

        if (this.pause_animated_sprites) {
            if (p_node.class === 'AnimatedSprite') {
                add = true;
            }
        }

        if (this.pause_particles) {
            if (p_node.class === 'Particle') {
                add = true;
            }
        }

        if (add) {
            p_node.connect('tree_exiting', this._node_removed, this);
            this.nodes.set(p_node, {});
            this._change_node_state(p_node, false);
        }

        for (let c of this.children) {
            if (c.filename.length > 0) {
                continue;
            }

            this._find_nodes(c);
        }
    }

    _screen_enter() {
        for (let [n] of this.nodes) {
            this._change_node_state(n, true);
        }

        if (this.parent) {
            if (this.physics_process_parent) {
                this.parent.set_physics_process(true);
            }
            if (this.process_parent) {
                this.parent.set_process(true);
            }
        }

        this.notifier_visible = true;
    }
    _screen_exit() {
        for (let [n] of this.nodes) {
            this._change_node_state(n, false);
        }

        if (this.parent) {
            if (this.physics_process_parent) {
                this.parent.set_physics_process(false);
            }
            if (this.process_parent) {
                this.parent.set_process(false);
            }
        }

        this.notifier_visible = false;
    }

    /**
     * @param {Node2D} p_node
     * @param {boolean} p_enabled
     */
    _change_node_state(p_node, p_enabled) {
        if (p_node.class === 'RigidBody2D') {
            // TODO: sleep RigidBody2D
        }
        if (p_node.class === 'AnimationPlayer') {
            /** @type {AnimationPlayer} */ (p_node).playback_active = p_enabled;
        }
        if (p_node.class === 'AnimatedSprite') {
            if (p_enabled) {
                /** @type {AnimatedSprite} */ (p_node).play();
            } else {
                /** @type {AnimatedSprite} */ (p_node).stop();
            }
        }
        if (p_node.class === 'RigidBody2D') {
            // TODO: disable particle
        }
    }

    /**
     * @param {Node2D} p_node
     */
    _node_removed(p_node) {
        if (!this.notifier_visible) {
            this._change_node_state(p_node, true);
        }
        this.nodes.delete(p_node);
    }
}
node_class_map['VisibilityEnabler2D'] = GDCLASS(VisibilityEnabler2D, VisibilityNotifier2D)
