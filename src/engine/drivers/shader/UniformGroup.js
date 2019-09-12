let UID = 0;

/**
 * Uniform group holds uniform map and some ID's for work
 */
class UniformGroup
{
    /**
     * @param {object} [uniforms] - Custom uniforms to use to augment the built-in ones.
     * @param {boolean} [_static] - Uniforms wont be changed after creation
     */
    constructor(uniforms, _static)
    {
        /**
         * uniform values
         * @type {object}
         * @readonly
         */
        this.uniforms = uniforms;

        /**
         * Its a group and not a single uniforms
         * @type {boolean}
         * @readonly
         * @default true
         */
        this.group = true;

        // lets generate this when the shader ?
        this.syncUniforms = {};

        /**
         * dirty version
         * @protected
         * @type {number}
         */
        this.dirtyId = 0;

        /**
         * unique id
         * @protected
         * @type {number}
         */
        this.id = UID++;

        /**
         * Uniforms wont be changed after creation
         * @type {boolean}
         */
        this.static = !!_static;
    }

    update()
    {
        this.dirtyId++;
    }

    add(name, uniforms, _static)
    {
        this.uniforms[name] = new UniformGroup(uniforms, _static);
    }

    static from(uniforms, _static)
    {
        return new UniformGroup(uniforms, _static);
    }
}

export default UniformGroup;
