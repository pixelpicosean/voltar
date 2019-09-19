const {
    PoolRealArray,
} = require('../parse_utils');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: 'ConvexPolygonShape2D',
        points: PoolRealArray(data.prop.points),
    };

    return res;
};
