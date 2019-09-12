import * as settings from '../settings';
import Framebuffer from './Framebuffer';
import { Rect2 } from 'engine/core/math/rect2';
import { OS, VIDEO_DRIVER_GLES2, VIDEO_DRIVER_GLES2_LEGACY } from 'engine/core/os/os';

/**
 * System plugin to the renderer to manage framebuffers.
 */
export default class FramebufferSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        /**
         * A list of managed framebuffers
         * @member {PIXI.Framebuffer[]}
         * @readonly
         */
        this.managedFramebuffers = [];

        /**
         * Framebuffer value that shows that we don't know what is bound
         * @member {Framebuffer}
         * @readonly
         */
        this.unknownFramebuffer = new Framebuffer(10, 10);
    }

    /**
     * Sets up the renderer context and necessary buffers.
     */
    contextChange()
    {
        const gl = this.gl = this.renderer.gl;

        this.CONTEXT_UID = this.renderer.CONTEXT_UID;
        this.current = this.unknownFramebuffer;
        this.viewport = new Rect2();
        this.hasMRT = true;
        this.writeDepthTexture = true;

        this.disposeAll(true);

        // webgl2
        if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2)
        {
            // webgl 1!
            let nativeDrawBuffersExtension = this.renderer.extensions.drawBuffers;
            let nativeDepthTextureExtension = this.renderer.extensions.depthTexture;

            if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2_LEGACY)
            {
                nativeDrawBuffersExtension = null;
                nativeDepthTextureExtension = null;
            }

            if (nativeDrawBuffersExtension)
            {
                // @ts-ignore
                gl.drawBuffers = (activeTextures) =>
                    nativeDrawBuffersExtension.drawBuffersWEBGL(activeTextures);
            }
            else
            {
                this.hasMRT = false;
                // @ts-ignore
                gl.drawBuffers = () =>
                {
                    // empty
                };
            }

            if (!nativeDepthTextureExtension)
            {
                this.writeDepthTexture = false;
            }
        }
    }

    /**
     * Bind a framebuffer
     *
     * @param {Framebuffer} [framebuffer]
     * @param {Rect2} [frame] frame, default is framebuffer size
     */
    bind(framebuffer, frame)
    {
        const { gl } = this;

        if (framebuffer)
        {
            // TODO caching layer!

            const fbo = framebuffer.glFramebuffers[this.CONTEXT_UID] || this.initFramebuffer(framebuffer);

            if (this.current !== framebuffer)
            {
                this.current = framebuffer;
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
            }
            // make sure all textures are unbound..

            // now check for updates...
            if (fbo.dirtyId !== framebuffer.dirtyId)
            {
                fbo.dirtyId = framebuffer.dirtyId;

                if (fbo.dirtyFormat !== framebuffer.dirtyFormat)
                {
                    fbo.dirtyFormat = framebuffer.dirtyFormat;
                    this.updateFramebuffer(framebuffer);
                }
                else if (fbo.dirtySize !== framebuffer.dirtySize)
                {
                    fbo.dirtySize = framebuffer.dirtySize;
                    this.resizeFramebuffer(framebuffer);
                }
            }

            for (let i = 0; i < framebuffer.colorTextures.length; i++)
            {
                if (framebuffer.colorTextures[i].texturePart)
                {
                    this.renderer.texture.unbind(framebuffer.colorTextures[i].texture);
                }
                else
                {
                    this.renderer.texture.unbind(framebuffer.colorTextures[i]);
                }
            }

            if (framebuffer.depthTexture)
            {
                this.renderer.texture.unbind(framebuffer.depthTexture);
            }

            if (frame)
            {
                this.setViewport(frame.x, frame.y, frame.width, frame.height);
            }
            else
            {
                this.setViewport(0, 0, framebuffer.width, framebuffer.height);
            }
        }
        else
        {
            if (this.current)
            {
                this.current = null;
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }

            if (frame)
            {
                this.setViewport(frame.x, frame.y, frame.width, frame.height);
            }
            else
            {
                const size = OS.get_singleton().get_window_size();
                this.setViewport(0, 0, size.width, size.height);
            }
        }
    }

    /**
     * Set the WebGLRenderingContext's viewport.
     *
     * @param {Number} x - X position of viewport
     * @param {Number} y - Y position of viewport
     * @param {Number} width - Width of viewport
     * @param {Number} height - Height of viewport
     */
    setViewport(x, y, width, height)
    {
        const v = this.viewport;

        if (v.width !== width || v.height !== height || v.x !== x || v.y !== y)
        {
            v.x = x;
            v.y = y;
            v.width = width;
            v.height = height;

            this.gl.viewport(x, y, width, height);
        }
    }

    /**
     * Get the size of the current width and height. Returns object with `width` and `height` values.
     *
     * @member {object}
     * @readonly
     */
    get size()
    {
        if (this.current)
        {
            // TODO store temp
            return { x: 0, y: 0, width: this.current.width, height: this.current.height };
        }

        const size = OS.get_singleton().get_window_size();
        return { x: 0, y: 0, width: size.width, height: size.height };
    }

    /**
     * Clear the color of the context
     *
     * @param {Number} r - Red value from 0 to 1
     * @param {Number} g - Green value from 0 to 1
     * @param {Number} b - Blue value from 0 to 1
     * @param {Number} a - Alpha value from 0 to 1
     */
    clear(r, g, b, a)
    {
        const { gl } = this;

        // TODO clear color can be set only one right?
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    /**
     * Initialize framebuffer
     *
     * @protected
     * @param {Framebuffer} framebuffer
     */
    initFramebuffer(framebuffer)
    {
        const { gl } = this;

        // TODO - make this a class?
        const fbo = {
            framebuffer: gl.createFramebuffer(),
            stencil: null,
            dirtyId: 0,
            dirtyFormat: 0,
            dirtySize: 0,
        };

        framebuffer.glFramebuffers[this.CONTEXT_UID] = fbo;

        this.managedFramebuffers.push(framebuffer);
        framebuffer.disposeRunner.add(this);

        return fbo;
    }

    /**
     * Resize the framebuffer
     *
     * @protected
     * @param {Framebuffer} framebuffer
     */
    resizeFramebuffer(framebuffer)
    {
        const { gl } = this;

        const fbo = framebuffer.glFramebuffers[this.CONTEXT_UID];

        if (fbo.stencil)
        {
            gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.stencil);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, framebuffer.width, framebuffer.height);
        }

        const colorTextures = framebuffer.colorTextures;

        for (let i = 0; i < colorTextures.length; i++)
        {
            this.renderer.texture.bind(colorTextures[i], 0);
        }

        if (framebuffer.depthTexture)
        {
            this.renderer.texture.bind(framebuffer.depthTexture, 0);
        }
    }

    /**
     * Update the framebuffer
     *
     * @protected
     * @param {Framebuffer} framebuffer
     */
    updateFramebuffer(framebuffer)
    {
        const { gl } = this;

        const fbo = framebuffer.glFramebuffers[this.CONTEXT_UID];

        // bind the color texture
        const colorTextures = framebuffer.colorTextures;

        let count = colorTextures.length;

        // @ts-ignore
        if (!gl.drawBuffers)
        {
            count = Math.min(count, 1);
        }

        const activeTextures = [];

        for (let i = 0; i < count; i++)
        {
            const texture = framebuffer.colorTextures[i];

            if (texture.texturePart)
            {
                this.renderer.texture.bind(texture.texture, 0);

                gl.framebufferTexture2D(gl.FRAMEBUFFER,
                    gl.COLOR_ATTACHMENT0 + i,
                    gl.TEXTURE_CUBE_MAP_NEGATIVE_X + texture.side,
                    texture.texture._glTextures[this.CONTEXT_UID].texture,
                    0);
            }
            else
            {
                this.renderer.texture.bind(texture, 0);

                gl.framebufferTexture2D(gl.FRAMEBUFFER,
                    gl.COLOR_ATTACHMENT0 + i,
                    gl.TEXTURE_2D,
                    texture._glTextures[this.CONTEXT_UID].texture,
                    0);
            }

            activeTextures.push(gl.COLOR_ATTACHMENT0 + i);
        }

        if (activeTextures.length > 1)
        {
            // @ts-ignore
            gl.drawBuffers(activeTextures);
        }

        if (framebuffer.depthTexture)
        {
            const writeDepthTexture = this.writeDepthTexture;

            if (writeDepthTexture)
            {
                const depthTexture = framebuffer.depthTexture;

                this.renderer.texture.bind(depthTexture, 0);

                gl.framebufferTexture2D(gl.FRAMEBUFFER,
                    gl.DEPTH_ATTACHMENT,
                    gl.TEXTURE_2D,
                    depthTexture._glTextures[this.CONTEXT_UID].texture,
                    0);
            }
        }

        if (!fbo.stencil && (framebuffer.stencil || framebuffer.depth))
        {
            fbo.stencil = gl.createRenderbuffer();

            gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.stencil);

            // TODO.. this is depth AND stencil?
            if (!framebuffer.depthTexture)
            { // you can't have both, so one should take priority if enabled
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, fbo.stencil);
            }
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, framebuffer.width, framebuffer.height);
            // fbo.enableStencil();
        }
    }

    /**
     * Disposes framebuffer
     * @param {Framebuffer} framebuffer framebuffer that has to be disposed of
     * @param {boolean} [contextLost=false] If context was lost, we suppress all delete function calls
     */
    disposeFramebuffer(framebuffer, contextLost)
    {
        const fbo = framebuffer.glFramebuffers[this.CONTEXT_UID];
        const gl = this.gl;

        if (!fbo)
        {
            return;
        }

        delete framebuffer.glFramebuffers[this.CONTEXT_UID];

        const index = this.managedFramebuffers.indexOf(framebuffer);

        if (index >= 0)
        {
            this.managedFramebuffers.splice(index, 1);
        }

        framebuffer.disposeRunner.remove(this);

        if (!contextLost)
        {
            gl.deleteFramebuffer(fbo.framebuffer);
            if (fbo.stencil)
            {
                gl.deleteRenderbuffer(fbo.stencil);
            }
        }
    }

    /**
     * Disposes all framebuffers, but not textures bound to them
     * @param {boolean} [contextLost=false] If context was lost, we suppress all delete function calls
     */
    disposeAll(contextLost)
    {
        const list = this.managedFramebuffers;

        this.managedFramebuffers = [];

        for (let i = 0; i < list.length; i++)
        {
            this.disposeFramebuffer(list[i], contextLost);
        }
    }

    /**
     * resets framebuffer stored state, binds screen framebuffer
     *
     * should be called before renderTexture reset()
     */
    reset()
    {
        this.current = this.unknownFramebuffer;
        this.viewport = new Rect2();
    }
}
