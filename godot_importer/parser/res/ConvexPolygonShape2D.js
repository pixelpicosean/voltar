const {
    PoolRealArray,
} = require('../parse_utils');
const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: 'ConvexPolygonShape2D',
        points: PoolRealArray(data.prop.points),
    };

    return res;
};
