const _ = require('lodash');

module.exports = (data) => {
    const tileset = {
        id: data.attr.id,
        type: 'TileSet',
        resource: data.prop,
    }

    tileset.resource.forEach((tile) => {
        for (const k in tile) {
            tile.autotile = tile.autotile || {};
            if (k.startsWith('autotile/')) {
                const prop_key = k.replace('autotile/', '');
                if (!_.isEmpty(tile[k])) {
                    tile.autotile[prop_key] = tile[k];
                }
                delete tile[k];
            }
        }

        for (const k in tile) {
            if (_.isObjectLike(tile[k]) && _.isEmpty(tile[k])) {
                tile[k] = undefined;
            }
        }
    })

    return tileset;
};

module.exports.is_tres = true;
