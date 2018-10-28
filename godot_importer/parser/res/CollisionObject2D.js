const {
    int,
    boolean,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'CollisionObject2D',
    });

    res.monitoring = boolean(data.prop.monitoring);
    res.monitorable = boolean(data.prop.monitorable);
    res.collision_layer = int(data.prop.collision_layer);
    res.collision_mask = int(data.prop.collision_mask);

    return res;
};
