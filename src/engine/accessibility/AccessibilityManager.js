import * as core from '../core';
import Device from 'ismobilejs';
import accessible_target from './accessible_target';

// add some extra variables to the container..
core.utils.mixins.delay_mixin(
    core.Node2D.prototype,
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
 *
 * @class
 * @memberof V.accessibility
 */
export default class AccessibilityManager
{
    /**
     * @param {V.CanvasRenderer|V.WebGLRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer)
    {
        if ((Device.tablet || Device.phone) && !navigator.isCocoonJS)
        {
            this.create_touch_hook();
        }

        // first we create a div that will sit over the pixi element. This is where the div overlays will go.
        const div = document.createElement('div');

        div.style.width = `${DIV_TOUCH_SIZE}px`;
        div.style.height = `${DIV_TOUCH_SIZE}px`;
        div.style.position = 'absolute';
        div.style.top = `${DIV_TOUCH_POS_X}px`;
        div.style.left = `${DIV_TOUCH_POS_Y}px`;
        div.style.zIndex = DIV_TOUCH_ZINDEX;

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
         * @type {*}
         * @private
         */
        this.pool = [];

        /**
         * This is a tick used to check if an object is no longer being rendered.
         *
         * @type {Number}
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
         * @member {V.SystemRenderer}
         */
        this.renderer = renderer;

        /**
         * The array of currently active accessible items.
         *
         * @member {Array<*>}
         * @private
         */
        this.children = [];

        /**
         * pre-bind the functions
         *
         * @private
         */
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);

        /**
         * stores the state of the manager. If there are no accessible objects or the mouse is moving, this will be false.
         *
         * @member {Array<*>}
         * @private
         */
        this.is_active = false;
        this.is_mobile_accessabillity = false;

        // let listen for tab.. once pressed we can fire up and show the accessibility layer
        window.addEventListener('keydown', this._onKeyDown, false);
    }

    /**
     * Creates the touch hooks.
     *
     */
    create_touch_hook()
    {
        const hookDiv = document.createElement('button');

        hookDiv.style.width = `${DIV_HOOK_SIZE}px`;
        hookDiv.style.height = `${DIV_HOOK_SIZE}px`;
        hookDiv.style.position = 'absolute';
        hookDiv.style.top = `${DIV_HOOK_POS_X}px`;
        hookDiv.style.left = `${DIV_HOOK_POS_Y}px`;
        hookDiv.style.zIndex = DIV_HOOK_ZINDEX;
        hookDiv.style.backgroundColor = '#FF0000';
        hookDiv.title = 'HOOK DIV';

        hookDiv.addEventListener('focus', () =>
        {
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
    activate()
    {
        if (this.is_active)
        {
            return;
        }

        this.is_active = true;

        window.document.addEventListener('mousemove', this._onMouseMove, true);
        window.removeEventListener('keydown', this._onKeyDown, false);

        this.renderer.on('postrender', this.update, this);

        if (this.renderer.view.parentNode)
        {
            this.renderer.view.parentNode.appendChild(this.div);
        }
    }

    /**
     * Deactivating will cause the Accessibility layer to be hidden. This is called when a user moves
     * the mouse.
     *
     * @private
     */
    deactivate()
    {
        if (!this.is_active || this.is_mobile_accessabillity)
        {
            return;
        }

        this.is_active = false;

        window.document.removeEventListener('mousemove', this._onMouseMove);
        window.addEventListener('keydown', this._onKeyDown, false);

        this.renderer.off('postrender', this.update);

        if (this.div.parentNode)
        {
            this.div.parentNode.removeChild(this.div);
        }
    }

    /**
     * This recursive function will run through the scene graph and add any new accessible objects to the DOM layer.
     *
     * @private
     * @param {V.Node2D} displayObject - The Node2D to check.
     */
    update_accessible_objects(displayObject)
    {
        if (!displayObject.visible)
        {
            return;
        }

        if (displayObject.accessible && displayObject.interactive)
        {
            if (!displayObject._accessibleActive)
            {
                this.add_child(displayObject);
            }

            displayObject.render_id = this.render_id;
        }

        const children = displayObject.children;

        for (let i = children.length - 1; i >= 0; i--)
        {
            this.update_accessible_objects(children[i]);
        }
    }

    /**
     * Before each render this function will ensure that all divs are mapped correctly to their Node2Ds.
     *
     * @private
     */
    update()
    {
        if (!this.renderer.renderingToScreen)
        {
            return;
        }

        // update children...
        this.update_accessible_objects(this.renderer._lastObjectRendered);

        const rect = this.renderer.view.getBoundingClientRect();
        const sx = rect.width / this.renderer.width;
        const sy = rect.height / this.renderer.height;

        let div = this.div;

        div.style.left = `${rect.left}px`;
        div.style.top = `${rect.top}px`;
        div.style.width = `${this.renderer.width}px`;
        div.style.height = `${this.renderer.height}px`;

        for (let i = 0; i < this.children.length; i++)
        {
            const child = this.children[i];

            if (child.render_id !== this.render_id)
            {
                child._accessibleActive = false;

                core.utils.removeItems(this.children, i, 1);
                this.div.removeChild(child._accessibleDiv);
                this.pool.push(child._accessibleDiv);
                child._accessibleDiv = null;

                i--;

                if (this.children.length === 0)
                {
                    this.deactivate();
                }
            }
            else
            {
                // map div to display..
                div = child._accessibleDiv;
                let hit_area = child.hit_area;
                const wt = child.world_transform;

                if (child.hit_area)
                {
                    div.style.left = `${(wt.tx + (hit_area.x * wt.a)) * sx}px`;
                    div.style.top = `${(wt.ty + (hit_area.y * wt.d)) * sy}px`;

                    div.style.width = `${hit_area.width * wt.a * sx}px`;
                    div.style.height = `${hit_area.height * wt.d * sy}px`;
                }
                else
                {
                    hit_area = child.get_bounds();

                    this.cap_hit_area(hit_area);

                    div.style.left = `${hit_area.x * sx}px`;
                    div.style.top = `${hit_area.y * sy}px`;

                    div.style.width = `${hit_area.width * sx}px`;
                    div.style.height = `${hit_area.height * sy}px`;
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
    cap_hit_area(hit_area)
    {
        if (hit_area.x < 0)
        {
            hit_area.width += hit_area.x;
            hit_area.x = 0;
        }

        if (hit_area.y < 0)
        {
            hit_area.height += hit_area.y;
            hit_area.y = 0;
        }

        if (hit_area.x + hit_area.width > this.renderer.width)
        {
            hit_area.width = this.renderer.width - hit_area.x;
        }

        if (hit_area.y + hit_area.height > this.renderer.height)
        {
            hit_area.height = this.renderer.height - hit_area.y;
        }
    }

    /**
     * Adds a Node2D to the accessibility manager
     *
     * @private
     * @param {Node2D} displayObject - The child to make accessible.
     */
    add_child(displayObject)
    {
        //    this.activate();

        let div = this.pool.pop();

        if (!div)
        {
            div = document.createElement('button');

            div.style.width = `${DIV_TOUCH_SIZE}px`;
            div.style.height = `${DIV_TOUCH_SIZE}px`;
            div.style.backgroundColor = this.debug ? 'rgba(255,0,0,0.5)' : 'transparent';
            div.style.position = 'absolute';
            div.style.zIndex = DIV_TOUCH_ZINDEX;
            div.style.borderStyle = 'none';

            div.addEventListener('click', this._onClick.bind(this));
            div.addEventListener('focus', this._onFocus.bind(this));
            div.addEventListener('focusout', this._onFocusOut.bind(this));
        }

        if (displayObject.accessibleTitle)
        {
            div.title = displayObject.accessibleTitle;
        }
        else if (!displayObject.accessibleTitle && !displayObject.accessibleHint)
        {
            div.title = `displayObject ${this.tabIndex}`;
        }

        if (displayObject.accessibleHint)
        {
            div.setAttribute('aria-label', displayObject.accessibleHint);
        }

        //

        displayObject._accessibleActive = true;
        displayObject._accessibleDiv = div;
        div.displayObject = displayObject;

        this.children.push(displayObject);
        this.div.appendChild(displayObject._accessibleDiv);
        displayObject._accessibleDiv.tabIndex = displayObject.tabIndex;
    }

    /**
     * Maps the div button press to pixi's InteractionManager (click)
     *
     * @private
     * @param {MouseEvent} e - The click event.
     */
    _onClick(e)
    {
        const interactionManager = this.renderer.plugins.interaction;

        interactionManager.dispatch_event(e.target.displayObject, 'click', interactionManager.event_data);
    }

    /**
     * Maps the div focus events to pixi's InteractionManager (mouseover)
     *
     * @private
     * @param {FocusEvent} e - The focus event.
     */
    _onFocus(e)
    {
        const interactionManager = this.renderer.plugins.interaction;

        interactionManager.dispatch_event(e.target.displayObject, 'mouseover', interactionManager.event_data);
    }

    /**
     * Maps the div focus events to pixi's InteractionManager (mouseout)
     *
     * @private
     * @param {FocusEvent} e - The focusout event.
     */
    _onFocusOut(e)
    {
        const interactionManager = this.renderer.plugins.interaction;

        interactionManager.dispatch_event(e.target.displayObject, 'mouseout', interactionManager.event_data);
    }

    /**
     * Is called when a key is pressed
     *
     * @private
     * @param {KeyboardEvent} e - The keydown event.
     */
    _onKeyDown(e)
    {
        if (e.keyCode !== KEY_CODE_TAB)
        {
            return;
        }

        this.activate();
    }

    /**
     * Is called when the mouse moves across the renderer element
     *
     * @private
     */
    _onMouseMove()
    {
        this.deactivate();
    }

    /**
     * Destroys the accessibility manager
     *
     */
    destroy()
    {
        this.div = null;

        for (let i = 0; i < this.children.length; i++)
        {
            this.children[i].div = null;
        }

        window.document.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('keydown', this._onKeyDown);

        this.pool = null;
        this.children = null;
        this.renderer = null;
    }
}

core.WebGLRenderer.registerPlugin('accessibility', AccessibilityManager);
core.CanvasRenderer.registerPlugin('accessibility', AccessibilityManager);
