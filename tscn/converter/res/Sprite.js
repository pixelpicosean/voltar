const {
    int,
    boolean,
    Vector2,
    Nullable,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'Sprite',
        centered: boolean(data.prop.centered),
        flip_h: boolean(data.prop.flip_h),
        flip_v: boolean(data.prop.flip_v),
        frame: int(data.prop.frame),
        frame_coords: Vector2(data.prop.frame_coords),
        hframe: int(data.prop.hframe),
        vframe: int(data.prop.vframe),
        offset: Vector2(data.prop.offset),
        region_enabled: boolean(data.prop.region_enabled),
        region_rect: Vector2(data.prop.region_rect),
        texture: Nullable(data.prop.texture),
    });
    return res;
};

module.exports.is_tres = () => true;
