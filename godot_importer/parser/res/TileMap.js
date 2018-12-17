const {
    int,
    boolean,
    Vector2,
    Nullable,
    PoolIntArray,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'TileMap',
        cell_size: Vector2(data.prop.cell_size),
        mode: int(data.prop.mode),
        tile_set: data.prop.tile_set,
    });

    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);

    const tile_data = [];
    const encoded_data = PoolIntArray(data.prop.tile_data);
    for (let i = 0; i < encoded_data.length - 3; i += 3) {
        // Insert int32 data
        view.setInt32(0, encoded_data[i + 0]); // 0 - 4 byte
        view.setInt32(4, encoded_data[i + 1]); // 4 - 8 byte
        view.setInt32(8, encoded_data[i + 2]); // 8 - 12 byte

        // Decode real data from the buffer
        const x = view.getUint16(0); // 0 - 2 byte
        const y = view.getUint16(2); // 2 - 4 byte
        const t = view.getUint32(4); // 4 - 8 byte

        // TODO: parse tile flags `view.getUint32(8)` // 8 - 12 byte

        tile_data.push(x, y, t);
    }
    res.tile_data = tile_data;

    return res;
};
