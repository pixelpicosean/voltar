import { UPDATE_PRIORITY } from 'engine/const';
import { shared as SharedTicker } from 'engine/ticker/index';
import SystemRenderer from 'engine/renderers/SystemRenderer';
import WebGLRenderer from 'engine/renderers/webgl/WebGLRenderer';
import Node2D from 'engine/scene/Node2D';
import Texture from 'engine/textures/Texture';
import BaseTexture from 'engine/textures/BaseTexture';
import Text from 'engine/scene/text/Text';
import TextMetrics from 'engine/scene/text/TextMetrics';
import TextStyle from 'engine/scene/text/TextStyle';

import CanvasPrepare from './canvas/CanvasPrepare';
import CountLimiter from './limiters/CountLimiter';
import TimeLimiter from './limiters/TimeLimiter';
import Graphics from 'engine/scene/graphics/Graphics';

/**
 * Default number of uploads per frame using prepare plugin.
 *
 * @static
 * @type {number}
 * @default 4
 */
settings.UPLOADS_PER_FRAME = 4;

/**
 * The prepare manager provides functionality to upload content to the GPU. BasePrepare handles
 * basic queuing functionality and is extended by {@link WebGLPrepare} and {@link CanvasPrepare}
 * to provide preparation capabilities specific to their respective renderers.
 *
 * @example
 * // Create a sprite
 * const sprite = new Sprite.from_image('something.png');
 *
 * // Load object into GPU
 * app.renderer.plugins.upload(sprite, () => {
 *
 *     //Texture(s) has been uploaded to GPU
 *     app.stage.add_child(sprite);
 *
 * })
 *
 * @abstract
 */
export default class BasePrepare {
    /**
     * @param {SystemRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer) {
        /**
         * The limiter to be used to control how quickly items are prepared.
         * @type {CountLimiter|TimeLimiter}
         */
        this.limiter = new CountLimiter(settings.UPLOADS_PER_FRAME);

        /**
         * Reference to the renderer.
         * @type {SystemRenderer}
         * @protected
         */
        this.renderer = renderer;

        /**
         * The only real difference between CanvasPrepare and WebGLPrepare is what they pass
         * to upload hooks. That different parameter is stored here.
         * @type {CanvasPrepare|WebGLRenderer}
         * @protected
         */
        this.upload_hook_helper = null;

        /**
         * Collection of items to uploads at once.
         * @type {Array<*>}
         * @private
         */
        this.queue = [];

        /**
         * Collection of additional hooks for finding assets.
         * @type {Array<Function>}
         * @private
         */
        this.addHooks = [];

        /**
         * Collection of additional hooks for processing assets.
         * @type {Array<Function>}
         * @private
         */
        this.uploadHooks = [];

        /**
         * Callback to call after completed.
         * @type {Array<Function>}
         * @private
         */
        this.completes = [];

        /**
         * If prepare is ticking (running).
         * @type {boolean}
         * @private
         */
        this.ticking = false;

        /**
         * 'bound' call for prepareItems().
         * @type {Function}
         * @private
         */
        this.delayedTick = () => {
            // unlikely, but in case we were destroyed between tick() and delayedTick()
            if (!this.queue) {
                return;
            }
            this.prepareItems();
        };

        // hooks to find the correct texture
        this.register_find_hook(findText);
        this.register_find_hook(findTextStyle);
        this.register_find_hook(findMultipleBaseTextures);
        this.register_find_hook(findBaseTexture);
        this.register_find_hook(findTexture);

        // upload hooks
        this.register_upload_hook(drawText);
        this.register_upload_hook(calculateTextStyle);
    }

    /**
     * Upload all the textures and graphics to the GPU.
     *
     * @param {Function|Node2D|Node2D|BaseTexture|Texture|Graphics|Text} item -
     *        Either the container or display object to search for items to upload, the items to upload themselves,
     *        or the callback function, if items have been added using `add`.
     * @param {Function} [done] - Optional callback when all queued uploads have completed
     */
    upload(item, done) {
        if (typeof item === 'function') {
            done = item;
            item = null;
        }

        // If a display object, search for items
        // that we could upload
        if (item) {
            this.add(item);
        }

        // Get the items for upload from the display
        if (this.queue.length) {
            if (done) {
                this.completes.push(done);
            }

            if (!this.ticking) {
                this.ticking = true;
                SharedTicker.add_once(this.tick, this, UPDATE_PRIORITY.UTILITY);
            }
        }
        else if (done) {
            done();
        }
    }

    /**
     * Handle tick update
     *
     * @private
     */
    tick() {
        setTimeout(this.delayedTick, 0);
    }

    /**
     * Actually prepare items. This is handled outside of the tick because it will take a while
     * and we do NOT want to block the current animation frame from rendering.
     *
     * @private
     */
    prepareItems() {
        this.limiter.beginFrame();
        // Upload the graphics
        while (this.queue.length && this.limiter.allowedToUpload()) {
            const item = this.queue[0];
            let uploaded = false;

            if (item && !item._destroyed) {
                for (let i = 0, len = this.uploadHooks.length; i < len; i++) {
                    if (this.uploadHooks[i](this.upload_hook_helper, item)) {
                        this.queue.shift();
                        uploaded = true;
                        break;
                    }
                }
            }

            if (!uploaded) {
                this.queue.shift();
            }
        }

        // We're finished
        if (!this.queue.length) {
            this.ticking = false;

            const completes = this.completes.slice(0);

            this.completes.length = 0;

            for (let i = 0, len = completes.length; i < len; i++) {
                completes[i]();
            }
        }
        else {
            // if we are not finished, on the next rAF do this again
            SharedTicker.add_once(this.tick, this, UPDATE_PRIORITY.UTILITY);
        }
    }

    /**
     * Adds hooks for finding items.
     *
     * @param {Function} addHook - Function call that takes two parameters: `item:*, queue:Array`
     *          function must return `true` if it was able to add item to the queue.
     * @return {BasePrepare} Instance of plugin for chaining.
     */
    register_find_hook(addHook) {
        if (addHook) {
            this.addHooks.push(addHook);
        }

        return this;
    }

    /**
     * Adds hooks for uploading items.
     *
     * @param {Function} uploadHook - Function call that takes two parameters: `prepare:CanvasPrepare, item:*` and
     *          function must return `true` if it was able to handle upload of item.
     * @return {BasePrepare} Instance of plugin for chaining.
     */
    register_upload_hook(uploadHook) {
        if (uploadHook) {
            this.uploadHooks.push(uploadHook);
        }

        return this;
    }

    /**
     * Manually add an item to the uploading queue.
     *
     * @param {Node2D|Node2D|BaseTexture|Texture|Graphics|Text|*} item - Object to
     *        add to the queue
     * @return {CanvasPrepare} Instance of plugin for chaining.
     */
    add(item) {
        // Add additional hooks for finding elements on special
        // types of objects that
        for (let i = 0, len = this.addHooks.length; i < len; i++) {
            if (this.addHooks[i](item, this.queue)) {
                break;
            }
        }

        // Get childen recursively
        if (item instanceof Node2D) {
            for (let i = item.children.length - 1; i >= 0; i--) {
                this.add(item.children[i]);
            }
        }

        return this;
    }

    /**
     * Destroys the plugin, don't use after this.
     *
     */
    destroy() {
        if (this.ticking) {
            SharedTicker.remove(this.tick, this);
        }
        this.ticking = false;
        this.addHooks = null;
        this.uploadHooks = null;
        this.renderer = null;
        this.completes = null;
        this.queue = null;
        this.limiter = null;
        this.upload_hook_helper = null;
    }

}

/**
 * Built-in hook to find multiple textures from objects like AnimatedSprites.
 *
 * @private
 * @param {Node2D} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a Texture object was found.
 */
function findMultipleBaseTextures(item, queue) {
    let result = false;

    // Objects with mutliple textures
    if (item && item._textures && item._textures.length) {
        for (let i = 0; i < item._textures.length; i++) {
            if (item._textures[i] instanceof Texture) {
                const base_texture = item._textures[i].base_texture;

                if (queue.indexOf(base_texture) === -1) {
                    queue.push(base_texture);
                    result = true;
                }
            }
        }
    }

    return result;
}

/**
 * Built-in hook to find BaseTextures from Sprites.
 *
 * @private
 * @param {Node2D} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a Texture object was found.
 */
function findBaseTexture(item, queue) {
    // Objects with textures, like Sprites/Text
    if (item instanceof BaseTexture) {
        if (queue.indexOf(item) === -1) {
            queue.push(item);
        }

        return true;
    }

    return false;
}

/**
 * Built-in hook to find textures from objects.
 *
 * @private
 * @param {Node2D} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a Texture object was found.
 */
function findTexture(item, queue) {
    if (item._texture && item._texture instanceof Texture) {
        const texture = item._texture.base_texture;

        if (queue.indexOf(texture) === -1) {
            queue.push(texture);
        }

        return true;
    }

    return false;
}

/**
 * Built-in hook to draw Text to its texture.
 *
 * @private
 * @param {WebGLRenderer|CanvasPrepare} helper - Not used by this upload handler
 * @param {Node2D} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function drawText(helper, item) {
    if (item instanceof Text) {
        // updating text will return early if it is not dirty
        item.update_text(true);

        return true;
    }

    return false;
}

/**
 * Built-in hook to calculate a text style for a Text object.
 *
 * @private
 * @param {WebGLRenderer|CanvasPrepare} helper - Not used by this upload handler
 * @param {Node2D} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function calculateTextStyle(helper, item) {
    if (item instanceof TextStyle) {
        const font = item.toFontString();

        TextMetrics.measureFont(font);

        return true;
    }

    return false;
}

/**
 * Built-in hook to find Text objects.
 *
 * @private
 * @param {Node2D} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a Text object was found.
 */
function findText(item, queue) {
    if (item instanceof Text) {
        // push the text style to prepare it - this can be really expensive
        if (queue.indexOf(item.style) === -1) {
            queue.push(item.style);
        }
        // also push the text object so that we can render it (to canvas/texture) if needed
        if (queue.indexOf(item) === -1) {
            queue.push(item);
        }
        // also push the Text's texture for upload to GPU
        const texture = item._texture.base_texture;

        if (queue.indexOf(texture) === -1) {
            queue.push(texture);
        }

        return true;
    }

    return false;
}

/**
 * Built-in hook to find TextStyle objects.
 *
 * @private
 * @param {TextStyle} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a TextStyle object was found.
 */
function findTextStyle(item, queue) {
    if (item instanceof TextStyle) {
        if (queue.indexOf(item) === -1) {
            queue.push(item);
        }

        return true;
    }

    return false;
}
