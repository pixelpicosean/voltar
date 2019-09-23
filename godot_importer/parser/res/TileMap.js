const {
    int,
    Vector2,
    PoolIntArray,
} = require('../type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'TileMap',
        cell_size: Vector2(data.prop.cell_size),
        mode: int(data.prop.mode),
        tile_set: data.prop.tile_set,
        tile_data: undefined,
    });

    if (!data.prop.tile_data) {
        return res;
    }

    const encoded_data = PoolIntArray(data.prop.tile_data);
    res.tile_data = encoded_data;;

    return res;
};
