module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'TileSet',
        path: data.attr.path,
    }
};
