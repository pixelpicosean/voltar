import ArrayResource from './ArrayResource';
import { TARGETS } from '../../constants';
import TextureResource from './Resource';

/**
 * Resource for a CubeTexture which contains six resources.
 * @param {Array<string|TextureResource>} [source] Collection of URLs or resources
 *        to use as the sides of the cube.
 * @param {object} [options] - ImageResource options
 * @param {number} [options.width] - Width of resource
 * @param {number} [options.height] - Height of resource
 */
export default class CubeResource extends ArrayResource
{
    constructor(source, options)
    {
        options = options || {};

        super(source, options);

        if (this.length !== CubeResource.SIDES)
        {
            throw new Error(`Invalid length. Got ${this.length}, expected 6`);
        }

        for (let i = 0; i < CubeResource.SIDES; i++)
        {
            this.items[i].target = TARGETS.TEXTURE_CUBE_MAP_POSITIVE_X + i;
        }

        if (options.autoLoad !== false)
        {
            this.load();
        }
    }

    /**
     * Add binding
     *
     * @override
     * @param {import('../BaseTexture').default} baseTexture - parent base texture
     */
    bind(baseTexture)
    {
        super.bind(baseTexture);

        baseTexture.target = TARGETS.TEXTURE_CUBE_MAP;
    }

    /**
     * Upload the resource
     *
     * @returns {boolean} true is success
     */
    upload(renderer, baseTexture, glTexture)
    {
        const dirty = this.itemDirtyIds;

        for (let i = 0; i < CubeResource.SIDES; i++)
        {
            const side = this.items[i];

            if (dirty[i] < side.dirtyId)
            {
                dirty[i] = side.dirtyId;
                if (side.valid)
                {
                    side.resource.upload(renderer, side, glTexture);
                }
                else
                {
                    // TODO: upload zero buffer
                }
            }
        }

        return true;
    }
}

/**
 * Number of texture sides to store for CubeResources
 *
 * @name CubeResource.SIDES
 * @static
 * @member {number}
 * @default 6
 */
CubeResource.SIDES = 6;
