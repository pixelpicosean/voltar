import { TYPES } from '../constants';
import Geometry from '../geometry/Geometry';
import Buffer from '../geometry/Buffer';

/**
 * Geometry used to batch standard PIXI content (e.g. Mesh, Sprite, Graphics objects).
 */
export default class BatchGeometry extends Geometry
{
    /**
     * @param {boolean} [_static=false] Optimization flag, where `false`
     *        is updated every frame, `true` doesn't change frame-to-frame.
     */
    constructor(_static = false)
    {
        super();

        /**
         * Buffer used for position, color, texture IDs
         *
         * @type {Buffer}
         * @protected
         */
        this._buffer = new Buffer(null, _static, false);

        /**
         * Index buffer data
         *
         * @type {Buffer}
         * @protected
         */
        this._indexBuffer = new Buffer(null, _static, true);

        this.addAttribute('aVertexPosition', this._buffer, 2, false, TYPES.FLOAT)
            .addAttribute('aTextureCoord', this._buffer, 2, false, TYPES.FLOAT)
            .addAttribute('aColor', this._buffer, 4, true, TYPES.UNSIGNED_BYTE)
            .addAttribute('aTextureId', this._buffer, 1, true, TYPES.FLOAT)
            .addIndex(this._indexBuffer);
    }
}
