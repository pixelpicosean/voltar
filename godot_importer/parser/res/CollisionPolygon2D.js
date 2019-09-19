const {
    PoolRealArray,
} = require('../parse_utils');
const Node2D = require('./CanvasItem');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'CollisionPolygon2D',
        polygon: PoolRealArray(data.prop.polygon),
    });

    return res;
};
