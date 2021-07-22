const {
    int,
    boolean,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'RayCast2D',
        cast_to: data.prop.cast_to,
        collide_with_areas: boolean(data.prop.collide_with_areas),
        collide_with_bodies: boolean(data.prop.collide_with_bodies),
        collision_mask: int(data.prop.collision_mask),
        enabled: boolean(data.prop.enabled),
        exclude_parent: boolean(data.prop.exclude_parent),
    });

    return res;
};

module.exports.is_tres = true;
