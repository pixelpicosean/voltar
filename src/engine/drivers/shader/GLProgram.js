/**
 * Helper class to create a WebGL Program
 */
export default class GLProgram
{
    /**
     * Makes a new Pixi program
     *
     * @param program {WebGLProgram} webgl program
     * @param uniformData {Object} uniforms
     */
    constructor(program, uniformData)
    {
        /**
         * The shader program
         *
         * @type {WebGLProgram}
         */
        this.program = program;

        /**
         * holds the uniform data which contains uniform locations
         * and current uniform values used for caching and preventing unneeded GPU commands
         * @type {Object}
         */
        this.uniformData = uniformData;

        /**
         * uniformGroups holds the various upload functions for the shader. Each uniform group
         * and program have a unique upload function generated.
         * @type {Object}
         */
        this.uniformGroups = {};
    }

    /**
     * Destroys this program
     */
    destroy()
    {
        this.uniformData = null;
        this.uniformGroups = null;
        this.program = null;
    }
}
