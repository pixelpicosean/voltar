module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'TileSet',
        resource: data.prop,
    }
};

module.exports.is_tres = true;
