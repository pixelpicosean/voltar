const {
    PoolRealArray,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: 'ConvexPolygonShape2D',
        points: PoolRealArray(data.prop.points),
    };

    return res;
};

module.exports.is_tres = () => true;
