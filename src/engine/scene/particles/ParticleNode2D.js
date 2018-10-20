import { BLEND_MODES } from 'engine/const';
import { hex2rgb } from 'engine/utils/index';

import Node2D from '../Node2D';

/**
 * The ParticleNode2D class is a really fast version of the Node2D built solely for speed,
 * so use when you need a lot of sprites or particles. The tradeoff of the ParticleNode2D is that most advanced
 * functionality will not work. ParticleNode2D implements the basic object transform (position, scale, rotation)
 * and some advanced functionality like tint (as of v4.5.6).
 * Other more advanced functionality like masking, children, filters, etc will not work on sprites in this batch.
 *
 * It's extremely easy to use :
 *
 * ```js
 * let container = new ParticleNode2D();
 *
 * for (let i = 0; i < 100; ++i)
 * {
 *     let sprite = new Sprite.from_image("myImage.png");
 *     container.add_child(sprite);
 * }
 * ```
 *
 * And here you have a hundred sprites that will be renderer at the speed of light.
 */
export default class ParticleNode2D extends Node2D {
    /**
     * @param {number} [maxSize=1500] - The maximum number of particles that can be renderer by the container.
     * @param {object} [properties] - The properties of children that should be uploaded to the gpu and applied.
     * @param {boolean} [properties.vertices=false] - When true, scale be uploaded and applied. if sprite's ` scale/anchor/trim/frame/orig` is dynamic, please set `true`.
     * @param {boolean} [properties.position=true] - When true, position be uploaded and applied.
     * @param {boolean} [properties.rotation=false] - When true, rotation be uploaded and applied.
     * @param {boolean} [properties.uvs=false] - When true, uvs be uploaded and applied.
     * @param {boolean} [properties.alpha=false] - When true, alpha be uploaded and applied.
     * @param {number} [batch_size=15000] - Number of particles per batch.
     * @param {boolean} [auto_resize=false] If true, container allocates more batches in case
     *  there are more than `maxSize` particles.
     */
    constructor(maxSize = 1500, properties, batch_size = 16384, auto_resize = false) {
        super();

        this.type = 'ParticleNode2D';

        /**
         * @type {Array<import('engine/index').Sprite>}
         */
        this.children;

        // Making sure the batch size is valid
        // 65535 is max vertex index in the index buffer (see ParticleRenderer)
        // so max number of particles is 65536 / 4 = 16384
        const maxBatchSize = 16384;

        if (batch_size > maxBatchSize) {
            batch_size = maxBatchSize;
        }

        if (batch_size > maxSize) {
            batch_size = maxSize;
        }

        /**
         * Set properties to be dynamic (true) / static (false)
         *
         * @member {boolean[]}
         * @private
         */
        this._properties = [false, true, false, false, false];

        /**
         * @member {number}
         * @private
         */
        this._maxSize = maxSize;

        /**
         * @member {number}
         * @private
         */
        this._batchSize = batch_size;

        /**
         * @member {object<number, WebGLBuffer>}
         * @private
         */
        this._glBuffers = {};

        /**
         * for every batch stores _updateID corresponding to the last change in that batch
         * @member {number[]}
         * @private
         */
        this._buffer_update_ids = [];

        /**
         * when child inserted, removed or changes position this number goes up
         * @member {number[]}
         * @private
         */
        this._update_id = 0;

        /**
         * @member {boolean}
         */
        this.interactive_children = false;

        /**
         * The blend mode to be applied to the sprite. Apply a value of `BLEND_MODES.NORMAL`
         * to reset the blend mode.
         *
         * @member {number}
         * @default BLEND_MODES.NORMAL
         * @see BLEND_MODES
         */
        this.blend_mode = BLEND_MODES.NORMAL;

        /**
         * If true, container allocates more batches in case there are more than `maxSize` particles.
         * @member {boolean}
         * @default false
         */
        this.auto_resize = auto_resize;

        /**
         * Used for canvas renderering. If true then the elements will be positioned at the
         * nearest pixel. This provides a nice speed boost.
         *
         * @member {boolean}
         * @default true;
         */
        this.pixel_snap = true;

        /**
         * The texture used to render the children.
         *
         * @readonly
         * @member {BaseTexture}
         */
        this.base_texture = null;

        this.set_properties(properties);

        /**
         * The tint applied to the container.
         * This is a hex value. A value of 0xFFFFFF will remove any tint effect.
         *
         * @private
         * @member {number}
         * @default 0xFFFFFF
         */
        this._tint = 0;
        this.tint_rgb = new Float32Array(4);
        this.tint = 0xFFFFFF;
    }

    /**
     * Sets the private properties array to dynamic / static based on the passed properties object
     *
     * @param {object} properties - The properties to be uploaded
     */
    set_properties(properties) {
        if (properties) {
            this._properties[0] = 'vertices' in properties || 'scale' in properties ? !!properties.vertices || !!properties.scale : this._properties[0];
            this._properties[1] = 'position' in properties ? !!properties.position : this._properties[1];
            this._properties[2] = 'rotation' in properties ? !!properties.rotation : this._properties[2];
            this._properties[3] = 'uvs' in properties ? !!properties.uvs : this._properties[3];
            this._properties[4] = 'tint' in properties || 'alpha' in properties
                ? !!properties.tint || !!properties.alpha : this._properties[4];
        }
    }

    /**
     * Updates the object transform for rendering
     *
     * @private
     */
    update_transform() {
        // TODO don't need to!
        this.node2d_update_transform();
        //  Node2D.prototype.update_transform.call( this );
    }

    /**
     * The tint applied to the container. This is a hex value.
     * A value of 0xFFFFFF will remove any tint effect.
     ** IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * @member {number}
     * @default 0xFFFFFF
     */
    get tint() {
        return this._tint;
    }

    set tint(value) // eslint-disable-line require-jsdoc
    {
        this._tint = value;
        hex2rgb(value, this.tint_rgb);
    }

    /**
     * Renders the container using the WebGL renderer
     *
     * @private
     * @param {import('engine/renderers/WebGLRenderer').default} renderer - The webgl renderer
     */
    render_webgl(renderer) {
        if (!this.visible || this.world_alpha <= 0 || !this.children.length || !this.renderable) {
            return;
        }

        if (!this.base_texture) {
            this.base_texture = this.children[0]._texture.base_texture;
            if (!this.base_texture.has_loaded) {
                this.base_texture.once('update', () => this.on_children_change(0));
            }
        }

        renderer.set_object_renderer(renderer.plugins.particle);
        renderer.plugins.particle.render(this);
    }

    /**
     * Set the flag that static data should be updated to true
     *
     * @private
     * @param {number} smallestChildIndex - The smallest child index
     */
    on_children_change(smallestChildIndex) {
        const bufferIndex = Math.floor(smallestChildIndex / this._batchSize);

        while (this._buffer_update_ids.length < bufferIndex) {
            this._buffer_update_ids.push(0);
        }
        this._buffer_update_ids[bufferIndex] = ++this._update_id;
    }

    /**
     * Destroys the container
     */
    destroy() {
        super.destroy();

        if (this._buffers) {
            for (let i = 0; i < this._buffers.length; ++i) {
                this._buffers[i].destroy();
            }
        }

        this._properties = null;
        this._buffers = null;
        this._buffer_update_ids = null;
    }
}
