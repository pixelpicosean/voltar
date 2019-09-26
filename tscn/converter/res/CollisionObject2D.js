const {
    int,
    boolean,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

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

module.exports.is_tres = () => true;
