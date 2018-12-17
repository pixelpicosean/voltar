const {
    boolean,
    Vector2,
    Nullable,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'TileSet',
        path: data.attr.path,
    }
};
