const {
    PoolRealArray,
} = require('../../parser/type_converters');
const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'CollisionPolygon2D',
        polygon: PoolRealArray(data.prop.polygon),
    });

    return res;
};

module.exports.is_tres = true;
