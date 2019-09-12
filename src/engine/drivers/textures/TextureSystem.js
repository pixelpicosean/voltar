import BaseTexture from './BaseTexture';
import GLTexture from './GLTexture';
import { MIPMAP_MODES, WRAP_MODES, SCALE_MODES, TYPES } from '../constants';
import { remove_items } from 'engine/dep/index';
import { OS, VIDEO_DRIVER_GLES3 } from 'engine/core/os/os';
import Texture from './Texture';


/**
 * System plugin to the renderer to manage textures.
 */
export default class TextureSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        // TODO set to max textures...
        /**
         * Bound textures
         * @type {BaseTexture[]}
         * @readonly
         */
        this.boundTextures = [];
        /**
         * Current location
         * @type {number}
         * @readonly
         */
        this.currentLocation = -1;

        /**
         * List of managed textures
         * @type {BaseTexture[]}
         * @readonly
         */
        this.managedTextures = [];

        /**
         * Did someone temper with textures state? We'll overwrite them when we need to unbind something.
         * @type {boolean}
         * @private
         */
        this._unknownBoundTextures = false;

        /**
         * BaseTexture value that shows that we don't know what is bound
         * @type {BaseTexture}
         * @readonly
         */
        this.unknownTexture = new BaseTexture();
    }

    /**
     * Sets up the renderer context and necessary buffers.
     */
    contextChange()
    {
        const gl = this.gl = this.renderer.gl;

        this.CONTEXT_UID = this.renderer.CONTEXT_UID;

        const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        this.boundTextures.length = maxTextures;

        for (let i = 0; i < maxTextures; i++)
        {
            this.boundTextures[i] = null;
        }

        // TODO move this.. to a nice make empty textures class..
        this.emptyTextures = {};

        const emptyTexture2D = new GLTexture(gl.createTexture());

        gl.bindTexture(gl.TEXTURE_2D, emptyTexture2D.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

        this.emptyTextures[gl.TEXTURE_2D] = emptyTexture2D;
        this.emptyTextures[gl.TEXTURE_CUBE_MAP] = new GLTexture(gl.createTexture());

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.emptyTextures[gl.TEXTURE_CUBE_MAP].texture);

        for (let i = 0; i < 6; i++)
        {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        for (let i = 0; i < this.boundTextures.length; i++)
        {
            this.bind(null, i);
        }
    }

    /**
     * Bind a texture to a specific location
     *
     * If you want to unbind something, please use `unbind(texture)` instead of `bind(null, textureLocation)`
     *
     * @param {Texture|BaseTexture} texture - Texture to bind
     * @param {number} [location=0] - Location to bind at
     */
    bind(texture, location = 0)
    {
        const { gl } = this;

        if (texture)
        {
            texture = texture.baseTexture || texture;

            if (texture.valid)
            {
                texture.touched = this.renderer.textureGC.count;

                const glTexture = texture._glTextures[this.CONTEXT_UID] || this.initTexture(texture);

                if (this.currentLocation !== location)
                {
                    this.currentLocation = location;
                    gl.activeTexture(gl.TEXTURE0 + location);
                }

                if (this.boundTextures[location] !== texture)
                {
                    gl.bindTexture(texture.target, glTexture.texture);
                }

                if (glTexture.dirtyId !== texture.dirtyId)
                {
                    this.updateTexture(texture);
                }

                this.boundTextures[location] = texture;
            }
        }
        else
        {
            if (this.currentLocation !== location)
            {
                this.currentLocation = location;
                gl.activeTexture(gl.TEXTURE0 + location);
            }

            gl.bindTexture(gl.TEXTURE_2D, this.emptyTextures[gl.TEXTURE_2D].texture);
            this.boundTextures[location] = null;
        }
    }

    /**
     * Resets texture location and bound textures
     *
     * Actual `bind(null, i)` calls will be performed at next `unbind()` call
     */
    reset()
    {
        this._unknownBoundTextures = true;
        this.currentLocation = -1;

        for (let i = 0; i < this.boundTextures.length; i++)
        {
            this.boundTextures[i] = this.unknownTexture;
        }
    }

    /**
     * Unbind a texture
     * @param {Texture|BaseTexture} texture - Texture to bind
     */
    unbind(texture)
    {
        const { gl, boundTextures } = this;

        if (this._unknownBoundTextures)
        {
            this._unknownBoundTextures = false;
            // someone changed webGL state,
            // we have to be sure that our texture does not appear in multi-texture renderer samplers
            for (let i = 0; i < boundTextures.length; i++)
            {
                if (boundTextures[i] === this.unknownTexture)
                {
                    this.bind(null, i);
                }
            }
        }

        for (let i = 0; i < boundTextures.length; i++)
        {
            if (boundTextures[i] === texture)
            {
                if (this.currentLocation !== i)
                {
                    gl.activeTexture(gl.TEXTURE0 + i);
                    this.currentLocation = i;
                }

                gl.bindTexture(gl.TEXTURE_2D, this.emptyTextures[texture.target].texture);
                boundTextures[i] = null;
            }
        }
    }

    /**
     * Initialize a texture
     *
     * @private
     * @param {BaseTexture} texture - Texture to initialize
     */
    initTexture(texture)
    {
        const glTexture = new GLTexture(this.gl.createTexture());

        // guarantee an update..
        glTexture.dirtyId = -1;

        texture._glTextures[this.CONTEXT_UID] = glTexture;

        this.managedTextures.push(texture);
        texture.emit_signal('dispose', this.destroyTexture, this);

        return glTexture;
    }

    initTextureType(texture, glTexture)
    {
        glTexture.internalFormat = texture.format;
        glTexture.type = texture.type;
        if (OS.get_singleton().video_driver_index !== VIDEO_DRIVER_GLES3)
        {
            return;
        }
        const gl = this.renderer.gl;

        if (texture.type === gl.FLOAT
            && texture.format === gl.RGBA)
        {
            glTexture.internalFormat = gl.RGBA32F;
        }
        // that's WebGL1 HALF_FLOAT_OES
        // we have to convert it to WebGL HALF_FLOAT
        if (texture.type === TYPES.HALF_FLOAT)
        {
            glTexture.type = gl.HALF_FLOAT;
        }
        if (glTexture.type === gl.HALF_FLOAT
            && texture.format === gl.RGBA)
        {
            glTexture.internalFormat = gl.RGBA16F;
        }
    }

    /**
     * Update a texture
     *
     * @private
     * @param {BaseTexture} texture - Texture to initialize
     */
    updateTexture(texture)
    {
        const glTexture = texture._glTextures[this.CONTEXT_UID];

        if (!glTexture)
        {
            return;
        }

        const renderer = this.renderer;

        this.initTextureType(texture, glTexture);

        if (texture.resource && texture.resource.upload(renderer, texture, glTexture))
        {
            // texture is uploaded, dont do anything!
        }
        else
        {
            // default, renderTexture-like logic
            const width = texture.realWidth;
            const height = texture.realHeight;
            const gl = renderer.gl;

            if (glTexture.width !== width
                || glTexture.height !== height
                || glTexture.dirtyId < 0)
            {
                glTexture.width = width;
                glTexture.height = height;

                gl.texImage2D(texture.target, 0,
                    glTexture.internalFormat,
                    width,
                    height,
                    0,
                    texture.format,
                    glTexture.type,
                    null);
            }
        }

        // lets only update what changes..
        if (texture.dirtyStyleId !== glTexture.dirtyStyleId)
        {
            this.updateTextureStyle(texture);
        }
        glTexture.dirtyId = texture.dirtyId;
    }

    /**
     * Deletes the texture from WebGL
     *
     * @private
     * @param {BaseTexture|Texture} texture - the texture to destroy
     * @param {boolean} [skipRemove=false] - Whether to skip removing the texture from the TextureManager.
     */
    destroyTexture(texture, skipRemove)
    {
        const { gl } = this;

        texture = texture.baseTexture || texture;

        if (texture._glTextures[this.CONTEXT_UID])
        {
            this.unbind(texture);

            gl.deleteTexture(texture._glTextures[this.CONTEXT_UID].texture);
            texture.disconnect('dispose', this.destroyTexture, this);

            delete texture._glTextures[this.CONTEXT_UID];

            if (!skipRemove)
            {
                const i = this.managedTextures.indexOf(texture);

                if (i !== -1)
                {
                    remove_items(this.managedTextures, i, 1);
                }
            }
        }
    }

    /**
     * Update texture style such as mipmap flag
     *
     * @private
     * @param {BaseTexture} texture - Texture to update
     */
    updateTextureStyle(texture)
    {
        const glTexture = texture._glTextures[this.CONTEXT_UID];

        if (!glTexture)
        {
            return;
        }

        if ((texture.mipmap === MIPMAP_MODES.POW2 || OS.get_singleton().video_driver_index !== VIDEO_DRIVER_GLES3) && !texture.isPowerOfTwo)
        {
            glTexture.mipmap = 0;
            glTexture.wrapMode = WRAP_MODES.CLAMP;
        }
        else
        {
            glTexture.mipmap = texture.mipmap >= 1;
            glTexture.wrapMode = texture.wrapMode;
        }

        if (texture.resource && texture.resource.style(this.renderer, texture, glTexture))
        {
            // style is set, dont do anything!
        }
        else
        {
            this.setStyle(texture, glTexture);
        }

        glTexture.dirtyStyleId = texture.dirtyStyleId;
    }

    /**
     * Set style for texture
     *
     * @private
     * @param {BaseTexture} texture - Texture to update
     * @param {GLTexture} glTexture
     */
    setStyle(texture, glTexture)
    {
        const gl = this.gl;

        if (glTexture.mipmap)
        {
            gl.generateMipmap(texture.target);
        }

        gl.texParameteri(texture.target, gl.TEXTURE_WRAP_S, glTexture.wrapMode);
        gl.texParameteri(texture.target, gl.TEXTURE_WRAP_T, glTexture.wrapMode);

        if (glTexture.mipmap)
        {
            /* eslint-disable max-len */
            gl.texParameteri(texture.target, gl.TEXTURE_MIN_FILTER, texture.scaleMode ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST);
            /* eslint-disable max-len */

            const anisotropicExt = this.renderer.extensions.anisotropicFiltering;

            if (anisotropicExt && texture.anisotropicLevel > 0 && texture.scaleMode === SCALE_MODES.LINEAR)
            {
                const level = Math.min(texture.anisotropicLevel, gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT));

                gl.texParameterf(texture.target, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, level);
            }
        }
        else
        {
            gl.texParameteri(texture.target, gl.TEXTURE_MIN_FILTER, texture.scaleMode ? gl.LINEAR : gl.NEAREST);
        }

        gl.texParameteri(texture.target, gl.TEXTURE_MAG_FILTER, texture.scaleMode ? gl.LINEAR : gl.NEAREST);
    }
}
