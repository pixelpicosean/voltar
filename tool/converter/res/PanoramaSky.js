module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'PanoramaSky',

        panorama: data.prop.panorama,
    };
};

module.exports.is_tres = true;
