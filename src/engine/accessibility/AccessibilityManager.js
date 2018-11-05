import { mixins } from '../utils/index';
import { remove_items, device } from 'engine/dep/index';
import accessible_target from './accessible_target';
import SystemRenderer from '../renderers/SystemRenderer';
import Node2D from '../scene/Node2D';
import { Rectangle } from '../math/index';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';


// add some extra variables to the container..
mixins.delay_mixin(
    Node2D.prototype,
    accessible_target
);

const KEY_CODE_TAB = 9;

const DIV_TOUCH_SIZE = 100;
const DIV_TOUCH_POS_X = 0;
const DIV_TOUCH_POS_Y = 0;
const DIV_TOUCH_ZINDEX = 2;

const DIV_HOOK_SIZE = 1;
const DIV_HOOK_POS_X = -1000;
const DIV_HOOK_POS_Y = -1000;
const DIV_HOOK_ZINDEX = 2;

/**
 * The Accessibility manager recreates the ability to tab and have content read by screen
 * readers. This is very important as it can possibly help people with disabilities access pixi
 * content.
 *
 * Much like interaction any Node2D can be made accessible. This manager will map the
 * events as if the mouse was being used, minimizing the effort required to implement.
 *
 * An instance of this class is automatically created by default, and can be found at renderer.plugins.accessibility
 */
export default class AccessibilityManager {
    /**
     * @param {SystemRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer) {
        // @ts-ignore
        if ((device.tablet || device.phone) && !navigator.isCocoonJS) {
            this.create_touch_hook();
        }

        // first we create a div that will sit over the pixi element. This is where the div overlays will go.
        const div = document.createElement('div');

        div.style.width = `${DIV_TOUCH_SIZE}px`;
        div.style.height = `${DIV_TOUCH_SIZE}px`;
        div.style.position = 'absolute';
        div.style.top = `${DIV_TOUCH_POS_X}px`;
        div.style.left = `${DIV_TOUCH_POS_Y}px`;
        div.style.zIndex = `${DIV_TOUCH_ZINDEX}`;

        /**
         * This is the dom element that will sit over the pixi element. This is where the div overlays will go.
         *
         * @type {HTMLElement}
         * @private
         */
        this.div = div;

        /**
         * A simple pool for storing divs.
         *
         * @type {Array<HTMLElement>}
         * @private
         */
        this.pool = [];

        /**
         * This is a tick used to check if an object is no longer being rendered.
         *
         * @type {number}
         * @private
         */
        this.render_id = 0;

        /**
         * Setting this to true will visually show the divs.
         *
         * @type {boolean}
         */
        this.debug = false;

        /**
         * The renderer this accessibility manager works for.
         *
         * @type {SystemRenderer}
         */
        this.renderer = renderer;

        /**
         * The array of currently active accessible items.
         *
         * @type {Array<Node2D>}
         * @private
         */
        this.children = [];

        /**
         * pre-bind the functions
         *
         * @private
         */
        this._on_key_down = this._on_key_down.bind(this);
        this._on_mouse_move = this._on_mouse_move.bind(this);

        /**
         * stores the state of the manager. If there are no accessible objects or the mouse is moving, this will be false.
         *
         * @private
         */
        this.is_active = false;
        this.is_mobile_accessabillity = false;

        // let listen for tab.. once pressed we can fire up and show the accessibility layer
        window.addEventListener('keydown', this._on_key_down, false);
    }

    /**
     * Creates the touch hooks.
     *
     */
    create_touch_hook() {
        const hookDiv = document.createElement('button');

        hookDiv.style.width = `${DIV_HOOK_SIZE}px`;
        hookDiv.style.height = `${DIV_HOOK_SIZE}px`;
        hookDiv.style.position = 'absolute';
        hookDiv.style.top = `${DIV_HOOK_POS_X}px`;
        hookDiv.style.left = `${DIV_HOOK_POS_Y}px`;
        hookDiv.style.zIndex = `${DIV_HOOK_ZINDEX}`;
        hookDiv.style.backgroundColor = '#FF0000';
        hookDiv.title = 'HOOK DIV';

        hookDiv.addEventListener('focus', () => {
            this.is_mobile_accessabillity = true;
            this.activate();
            document.body.removeChild(hookDiv);
        });

        document.body.appendChild(hookDiv);
    }

    /**
     * Activating will cause the Accessibility layer to be shown. This is called when a user
     * preses the tab key.
     *
     * @private
     */
    activate() {
        if (this.is_active) {
            return;
        }

        this.is_active = true;

        window.document.addEventListener('mousemove', this._on_mouse_move, true);
        window.removeEventListener('keydown', this._on_key_down, false);

        this.renderer.connect('postrender', this.update, this);

        if (this.renderer.view.parentNode) {
            this.renderer.view.parentNode.appendChild(this.div);
        }
    }

    /**
     * Deactivating will cause the Accessibility layer to be hidden. This is called when a user moves
     * the mouse.
     *
     * @private
     */
    deactivate() {
        if (!this.is_active || this.is_mobile_accessabillity) {
            return;
        }

        this.is_active = false;

        window.document.removeEventListener('mousemove', this._on_mouse_move, true);
        window.addEventListener('keydown', this._on_key_down, false);

        this.renderer.disconnect('postrender', this.update);

        if (this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
        }
    }

    /**
     * This recursive function will run through the scene graph and add any new accessible objects to the DOM layer.
     *
     * @private
     * @param {Node2D} node - The Node2D to check.
     */
    update_accessible_objects(node) {
        if (!node.visible) {
            return;
        }

        if (node.accessible && node.interactive) {
            if (!node._accessible_active) {
                this.add_child(node);
            }

            node.render_id = this.render_id;
        }

        const children = node.children;

        for (let i = 0; i < children.length; i++) {
            this.update_accessible_objects(children[i]);
        }
    }

    /**
     * Before each render this function will ensure that all divs are mapped correctly to their Node2Ds.
     *
     * @private
     */
    update() {
        if (!this.renderer.rendering_to_screen) {
            return;
        }

        // update children...
        this.update_accessible_objects(this.renderer._last_object_rendered);

        const rect = this.renderer.view.getBoundingClientRect();
        const sx = rect.width / this.renderer.width;
        const sy = rect.height / this.renderer.height;

        let div = this.div;

        div.style.left = `${rect.left}px`;
        div.style.top = `${rect.top}px`;
        div.style.width = `${this.renderer.width}px`;
        div.style.height = `${this.renderer.height}px`;

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];

            if (child.render_id !== this.render_id) {
                child._accessible_active = false;

                remove_items(this.children, i, 1);
                this.div.removeChild(child._accessible_div);
                this.pool.push(child._accessible_div);
                child._accessible_div = null;

                i--;

                if (this.children.length === 0) {
                    this.deactivate();
                }
            }
            else {
                // map div to display..
                div = child._accessible_div;
                let hit_area = child.hit_area;
                const wt = child.world_transform;

                if (child.hit_area) {
                    div.style.left = `${(wt.tx + (hit_area.x * wt.a)) * sx}px`;
                    div.style.top = `${(wt.ty + (hit_area.y * wt.d)) * sy}px`;

                    div.style.width = `${hit_area.width * wt.a * sx}px`;
                    div.style.height = `${hit_area.height * wt.d * sy}px`;
                }
                else {
                    hit_area = child.get_bounds();

                    this.cap_hit_area(hit_area);

                    div.style.left = `${hit_area.x * sx}px`;
                    div.style.top = `${hit_area.y * sy}px`;

                    div.style.width = `${hit_area.width * sx}px`;
                    div.style.height = `${hit_area.height * sy}px`;

                    // update button titles and hints if they exist and they've changed
                    if (div.title !== child.accessible_title && child.accessible_title !== null) {
                        div.title = child.accessible_title;
                    }
                    if (div.getAttribute('aria-label') !== child.accessible_hint
                        && child.accessible_hint !== null) {
                        div.setAttribute('aria-label', child.accessible_hint);
                    }
                }
            }
        }

        // increment the render id..
        this.render_id++;
    }

    /**
     * TODO: docs.
     *
     * @param {Rectangle} hit_area - TODO docs
     */
    cap_hit_area(hit_area) {
        if (hit_area.x < 0) {
            hit_area.width += hit_area.x;
            hit_area.x = 0;
        }

        if (hit_area.y < 0) {
            hit_area.height += hit_area.y;
            hit_area.y = 0;
        }

        if (hit_area.x + hit_area.width > this.renderer.width) {
            hit_area.width = this.renderer.width - hit_area.x;
        }

        if (hit_area.y + hit_area.height > this.renderer.height) {
            hit_area.height = this.renderer.height - hit_area.y;
        }
    }

    /**
     * Adds a Node2D to the accessibility manager
     *
     * @private
     * @param {Node2D} node - The child to make accessible.
     */
    add_child(node) {
        //    this.activate();

        let div = this.pool.pop();

        if (!div) {
            div = document.createElement('button');

            div.style.width = `${DIV_TOUCH_SIZE}px`;
            div.style.height = `${DIV_TOUCH_SIZE}px`;
            div.style.backgroundColor = this.debug ? 'rgba(255,0,0,0.5)' : 'transparent';
            div.style.position = 'absolute';
            div.style.zIndex = `${DIV_TOUCH_ZINDEX}`;
            div.style.borderStyle = 'none';

            // ARIA attributes ensure that button title and hint updates are announced properly
            if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                // Chrome doesn't need aria-live to work as intended; in fact it just gets more confused.
                div.setAttribute('aria-live', 'off');
            }
            else {
                div.setAttribute('aria-live', 'polite');
            }

            if (navigator.userAgent.match(/rv:.*Gecko\//)) {
                // FireFox needs this to announce only the new button name
                div.setAttribute('aria-relevant', 'additions');
            }
            else {
                // required by IE, other browsers don't much care
                div.setAttribute('aria-relevant', 'text');
            }

            div.addEventListener('click', this._on_click.bind(this));
            div.addEventListener('focus', this._on_focus.bind(this));
            div.addEventListener('focusout', this._on_focus_out.bind(this));
        }

        if (node.accessible_title && node.accessible_title !== null) {
            div.title = node.accessible_title;
        }
        else if (!node.accessible_hint || node.accessible_hint === null) {
            div.title = `node ${node.tab_index}`;
        }

        if (node.accessible_hint && node.accessible_hint !== null) {
            div.setAttribute('aria-label', node.accessible_hint);
        }

        //

        node._accessible_active = true;
        node._accessible_div = div;
        div.node = node;

        this.children.push(node);
        this.div.appendChild(node._accessible_div);
        node._accessible_div.tab_index = node.tab_index;
    }

    /**
     * Maps the div button press to pixi's InteractionManager (click)
     *
     * @private
     * @param {MouseEvent} e - The click event.
     */
    _on_click(e) {
        const interaction_manager = this.renderer.plugins.interaction;

        interaction_manager.dispatch_event(e.target.node, 'click', interaction_manager.event_data);
    }

    /**
     * Maps the div focus events to pixi's InteractionManager (mouseover)
     *
     * @private
     * @param {FocusEvent} e - The focus event.
     */
    _on_focus(e) {
        if (!e.target.getAttribute('aria-live', 'off')) {
            e.target.setAttribute('aria-live', 'assertive');
        }
        const interaction_manager = this.renderer.plugins.interaction;

        interaction_manager.dispatch_event(e.target.node, 'mouseover', interaction_manager.event_data);
    }

    /**
     * Maps the div focus events to pixi's InteractionManager (mouseout)
     *
     * @private
     * @param {FocusEvent} e - The focusout event.
     */
    _on_focus_out(e) {
        if (!e.target.getAttribute('aria-live', 'off')) {
            e.target.setAttribute('aria-live', 'polite');
        }
        const interaction_manager = this.renderer.plugins.interaction;

        interaction_manager.dispatch_event(e.target.node, 'mouseout', interaction_manager.event_data);
    }

    /**
     * Is called when a key is pressed
     *
     * @private
     * @param {KeyboardEvent} e - The keydown event.
     */
    _on_key_down(e) {
        if (e.keyCode !== KEY_CODE_TAB) {
            return;
        }

        this.activate();
    }

    /**
     * Is called when the mouse moves across the renderer element
     *
     * @private
     * @param {MouseEvent} e - The mouse event.
     */
    _on_mouse_move(e) {
        if (e.movementX === 0 && e.movementY === 0) {
            return;
        }

        this.deactivate();
    }

    /**
     * Destroys the accessibility manager
     *
     */
    destroy() {
        this.div = null;

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].div = null;
        }

        window.document.removeEventListener('mousemove', this._on_mouse_move, true);
        window.removeEventListener('keydown', this._on_key_down);

        this.pool = null;
        this.children = null;
        this.renderer = null;
    }
}

WebGLRenderer.register_plugin('accessibility', AccessibilityManager);
CanvasRenderer.register_plugin('accessibility', AccessibilityManager);
