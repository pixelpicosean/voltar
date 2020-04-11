const {
    PoolRealArray,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'Polygon2D',
        texture: data.prop.texture,
        polygon: PoolRealArray(data.prop.polygon),
        uv: PoolRealArray(data.prop.uv),
    });

    return res;
};

module.exports.is_tres = true;
