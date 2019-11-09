module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'TileSet',
        path: data.attr.path,
    }
};

module.exports.is_tres = true;
