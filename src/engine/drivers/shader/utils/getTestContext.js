import { OS, VIDEO_DRIVER_GLES3 } from 'engine/core/os/os';


const unknownContext = {};
let context = unknownContext;

/**
 * returns a little WebGL context to use for program inspection.
 */
export default function getTestContext()
{
    if (context === unknownContext)
    {
        const canvas = document.createElement('canvas');

        let gl;

        if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES3)
        {
            gl = canvas.getContext('webgl2', {});
        }

        if (!gl)
        {
            gl = canvas.getContext('webgl', {})
            || canvas.getContext('experimental-webgl', {});

            if (!gl)
            {
                // fail, not able to get a context
                gl = null;
            }
            else
            {
                // for shader testing..
                gl.getExtension('WEBGL_draw_buffers');
            }
        }

        context = gl;
    }

    return /** @type {WebGLRenderingContext} */(context);
}
