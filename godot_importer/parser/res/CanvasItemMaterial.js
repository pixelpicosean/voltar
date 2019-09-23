const {
    int,
    url,
} = require('../type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'CanvasItemMaterial',
        blend_mode: data.prop.blend_mode,
    };
};
