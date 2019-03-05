import Node2D from "./node_2d";
import { node_class_map } from "engine/registry";
import { Rectangle } from "engine/math/index";
import { Viewport, AnimationPlayer, AnimatedSprite } from "engine/index";

export class VisibilityNotifier2D extends Node2D {
    constructor() {
        super();

        this.type = 'VisibilityNotifier2D';

        this.rect = new Rectangle(-10, 10, 20, 20);
        this._rect_on_screen = new Rectangle();

        /**
         * @type {Set<Viewport>}
         */
        this.viewports = new Set();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.rect !== undefined) {
            this.rect.copy(data.rect);
        }

        return this;
    }

    is_on_screen() {
        return this.viewports.size > 0;
    }

    /**
     * @param {number} delta
     */
    _propagate_process(delta) {
        super._propagate_process(delta);

        // TODO: move the rect check to transform change event
        this.world_transform.xform_rect(this.rect, this._rect_on_screen);

        const viewport = this.scene_tree.viewport;
        const v_rect_origin = this.scene_tree.viewport_rect;
        const v_rect = Rectangle.new(v_rect_origin.position.x, v_rect_origin.position.y, v_rect_origin.size.x, v_rect_origin.size.y);
        const is_overlapping = (
            v_rect.contains(this._rect_on_screen.left, this._rect_on_screen.top)
            ||
            v_rect.contains(this._rect_on_screen.right, this._rect_on_screen.top)
            ||
            v_rect.contains(this._rect_on_screen.left, this._rect_on_screen.bottom)
            ||
            v_rect.contains(this._rect_on_screen.right, this._rect_on_screen.bottom)
        );
        if (is_overlapping && !this.viewports.has(viewport)) {
            this._enter_viewport(viewport);
        }
        if (!is_overlapping && this.viewports.has(viewport)) {
            this._exit_viewport(viewport);
        }
        Rectangle.free(v_rect);
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
        this.emit_signal('viewport_entered');
    }
    /**
     * @param {Viewport} viewport
     */
    _exit_viewport(viewport) {
        this.viewports.delete(viewport);

        this.emit_signal('viewport_exited');
        if (this.viewports.size === 0) {
            this.emit_signal('screen_exited');
            this._screen_exit();
        }
    }

    _screen_enter() { }
    _screen_exit() { }
}

export class VisibilityEnabler2D extends VisibilityNotifier2D {
    constructor() {
        super();

        this.type = 'VisibilityEnabler2D';

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
            if (p_node.type === 'AnimationPlayer') {
                add = true;
            }
        }

        if (this.pause_animated_sprites) {
            if (p_node.type === 'AnimatedSprite') {
                add = true;
            }
        }

        if (this.pause_particles) {
            if (p_node.type === 'Particle') {
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
        if (p_node.type === 'RigidBody2D') {
            // TODO: sleep RigidBody2D
        }
        if (p_node.type === 'AnimationPlayer') {
            /** @type {AnimationPlayer} */ (p_node).playback_active = p_enabled;
        }
        if (p_node.type === 'AnimatedSprite') {
            if (p_enabled) {
                /** @type {AnimatedSprite} */ (p_node).play();
            } else {
                /** @type {AnimatedSprite} */ (p_node).stop();
            }
        }
        if (p_node.type === 'RigidBody2D') {
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

node_class_map['VisibilityNotifier2D'] = VisibilityNotifier2D;
node_class_map['VisibilityEnabler2D'] = VisibilityEnabler2D;
