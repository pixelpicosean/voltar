import Node2D from '../Node2D';
import { BLEND_MODES } from '../../const';
import { hex2rgb } from '../../utils';

/**
 * The ParticleNode2D class is a really fast version of the Node2D built solely for speed,
 * so use when you need a lot of sprites or particles. The tradeoff of the ParticleNode2D is that advanced
 * functionality will not work. ParticleNode2D implements only the basic object transform (position, scale, rotation).
 * Any other functionality like tinting, masking, etc will not work on sprites in this batch.
 *
 * It's extremely easy to use :
 *
 * ```js
 * let container = new ParticleNode2D();
 *
 * for (let i = 0; i < 100; ++i)
 * {
 *     let sprite = new V.Sprite.fromImage("myImage.png");
 *     container.add_child(sprite);
 * }
 * ```
 *
 * And here you have a hundred sprites that will be renderer at the speed of light.
 *
 * @class
 * @extends V.Node2D
 * @memberof V.particles
 */
export default class ParticleNode2D extends Node2D
{
    /**
     * @param {number} [maxSize=15000] - The maximum number of particles that can be renderer by the container.
     * @param {object} [properties] - The properties of children that should be uploaded to the gpu and applied.
     * @param {boolean} [properties.scale=false] - When true, scale be uploaded and applied.
     * @param {boolean} [properties.position=true] - When true, position be uploaded and applied.
     * @param {boolean} [properties.rotation=false] - When true, rotation be uploaded and applied.
     * @param {boolean} [properties.uvs=false] - When true, uvs be uploaded and applied.
     * @param {boolean} [properties.alpha=false] - When true, alpha be uploaded and applied.
     * @param {number} [batchSize=15000] - Number of particles per batch.
     */
    constructor(maxSize = 1500, properties, batchSize = 16384)
    {
        super();

        // Making sure the batch size is valid
        // 65535 is max vertex index in the index buffer (see ParticleRenderer)
        // so max number of particles is 65536 / 4 = 16384
        const maxBatchSize = 16384;

        if (batchSize > maxBatchSize)
        {
            batchSize = maxBatchSize;
        }

        if (batchSize > maxSize)
        {
            batchSize = maxSize;
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
        this._batchSize = batchSize;

        /**
         * @member {object<number, WebGLBuffer>}
         * @private
         */
        this._glBuffers = {};

        /**
         * @member {number}
         * @private
         */
        this._bufferToUpdate = 0;

        /**
         * @member {boolean}
         *
         */
        this.interactiveChildren = false;

        /**
         * The blend mode to be applied to the sprite. Apply a value of `V.BLEND_MODES.NORMAL`
         * to reset the blend mode.
         *
         * @member {number}
         * @default V.BLEND_MODES.NORMAL
         * @see V.BLEND_MODES
         */
        this.blendMode = BLEND_MODES.NORMAL;

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
        this.baseTexture = null;

        this.setProperties(properties);

        /**
         * The tint applied to the container.
         * This is a hex value. A value of 0xFFFFFF will remove any tint effect.
         *
         * @private
         * @member {number}
         * @default 0xFFFFFF
         */
        this._tint = 0;
        this.tintRgb = new Float32Array(4);
        this.tint = 0xFFFFFF;
    }

    /**
     * Sets the private properties array to dynamic / static based on the passed properties object
     *
     * @param {object} properties - The properties to be uploaded
     */
    setProperties(properties)
    {
        if (properties)
        {
            this._properties[0] = 'scale' in properties ? !!properties.scale : this._properties[0];
            this._properties[1] = 'position' in properties ? !!properties.position : this._properties[1];
            this._properties[2] = 'rotation' in properties ? !!properties.rotation : this._properties[2];
            this._properties[3] = 'uvs' in properties ? !!properties.uvs : this._properties[3];
            this._properties[4] = 'alpha' in properties ? !!properties.alpha : this._properties[4];
        }
    }

    /**
     * Updates the object transform for rendering
     *
     * @private
     */
    update_transform()
    {
        // TODO don't need to!
        this.displayObjectUpdateTransform();
        //  V.Node2D.prototype.update_transform.call( this );
    }

    /**
     * The tint applied to the container. This is a hex value.
     * A value of 0xFFFFFF will remove any tint effect.
     ** IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * @member {number}
     * @default 0xFFFFFF
     */
    get tint()
    {
        return this._tint;
    }

    set tint(value) // eslint-disable-line require-jsdoc
    {
        this._tint = value;
        hex2rgb(value, this.tintRgb);
    }

    /**
     * Renders the container using the WebGL renderer
     *
     * @private
     * @param {V.WebGLRenderer} renderer - The webgl renderer
     */
    render_webGL(renderer)
    {
        if (!this.visible || this.world_alpha <= 0 || !this.children.length || !this.renderable)
        {
            return;
        }

        if (!this.baseTexture)
        {
            this.baseTexture = this.children[0]._texture.baseTexture;
            if (!this.baseTexture.hasLoaded)
            {
                this.baseTexture.once('update', () => this.on_children_change(0));
            }
        }

        renderer.setObjectRenderer(renderer.plugins.particle);
        renderer.plugins.particle.render(this);
    }

    /**
     * Set the flag that static data should be updated to true
     *
     * @private
     * @param {number} smallestChildIndex - The smallest child index
     */
    on_children_change(smallestChildIndex)
    {
        const bufferIndex = Math.floor(smallestChildIndex / this._batchSize);

        if (bufferIndex < this._bufferToUpdate)
        {
            this._bufferToUpdate = bufferIndex;
        }
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @private
     * @param {V.CanvasRenderer} renderer - The canvas renderer
     */
    render_canvas(renderer)
    {
        if (!this.visible || this.world_alpha <= 0 || !this.children.length || !this.renderable)
        {
            return;
        }

        const context = renderer.context;
        const transform = this.world_transform;
        let isRotated = true;

        let positionX = 0;
        let positionY = 0;

        let finalWidth = 0;
        let finalHeight = 0;

        const compositeOperation = renderer.blendModes[this.blendMode];

        if (compositeOperation !== context.globalCompositeOperation)
        {
            context.globalCompositeOperation = compositeOperation;
        }

        context.globalAlpha = this.world_alpha;

        this.displayObjectUpdateTransform();

        for (let i = 0; i < this.children.length; ++i)
        {
            const child = this.children[i];

            if (!child.visible)
            {
                continue;
            }

            const frame = child._texture.frame;

            context.globalAlpha = this.world_alpha * child.alpha;

            if (child.rotation % (Math.PI * 2) === 0)
            {
                // this is the fastest  way to optimise! - if rotation is 0 then we can avoid any kind of set_transform call
                if (isRotated)
                {
                    context.set_transform(
                        transform.a,
                        transform.b,
                        transform.c,
                        transform.d,
                        transform.tx * renderer.resolution,
                        transform.ty * renderer.resolution
                    );

                    isRotated = false;
                }

                positionX = ((child.anchor.x) * (-frame.width * child.scale.x)) + child.position.x + 0.5;
                positionY = ((child.anchor.y) * (-frame.height * child.scale.y)) + child.position.y + 0.5;

                finalWidth = frame.width * child.scale.x;
                finalHeight = frame.height * child.scale.y;
            }
            else
            {
                if (!isRotated)
                {
                    isRotated = true;
                }

                child.displayObjectUpdateTransform();

                const childTransform = child.world_transform;

                if (renderer.pixel_snap)
                {
                    context.set_transform(
                        childTransform.a,
                        childTransform.b,
                        childTransform.c,
                        childTransform.d,
                        (childTransform.tx * renderer.resolution) | 0,
                        (childTransform.ty * renderer.resolution) | 0
                    );
                }
                else
                {
                    context.set_transform(
                        childTransform.a,
                        childTransform.b,
                        childTransform.c,
                        childTransform.d,
                        childTransform.tx * renderer.resolution,
                        childTransform.ty * renderer.resolution
                    );
                }

                positionX = ((child.anchor.x) * (-frame.width)) + 0.5;
                positionY = ((child.anchor.y) * (-frame.height)) + 0.5;

                finalWidth = frame.width;
                finalHeight = frame.height;
            }

            const resolution = child._texture.baseTexture.resolution;

            context.drawImage(
                child._texture.baseTexture.source,
                frame.x * resolution,
                frame.y * resolution,
                frame.width * resolution,
                frame.height * resolution,
                positionX * renderer.resolution,
                positionY * renderer.resolution,
                finalWidth * renderer.resolution,
                finalHeight * renderer.resolution
            );
        }
    }

    /**
     * Destroys the container
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have their
     *  destroy method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the texture of the child sprite
     * @param {boolean} [options.baseTexture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the base texture of the child sprite
     */
    destroy(options)
    {
        super.destroy(options);

        if (this._buffers)
        {
            for (let i = 0; i < this._buffers.length; ++i)
            {
                this._buffers[i].destroy();
            }
        }

        this._properties = null;
        this._buffers = null;
    }
}
