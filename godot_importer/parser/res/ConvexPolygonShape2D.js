const {
    PoolRealArray,
} = require('../type_converters');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: 'ConvexPolygonShape2D',
        points: PoolRealArray(data.prop.points),
    };

    return res;
};
