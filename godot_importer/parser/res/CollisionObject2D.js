const {
    int,
    boolean,
} = require('../parse_utils');

const Node2D = require('./CanvasItem');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'CollisionObject2D',
        monitoring: boolean(data.prop.monitoring),
        monitorable: boolean(data.prop.monitorable),
        collision_layer: int(data.prop.collision_layer),
        collision_mask: int(data.prop.collision_mask),
    });

    return res;
};
