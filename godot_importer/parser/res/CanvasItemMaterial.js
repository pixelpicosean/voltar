const {
    int,
    url,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'CanvasItemMaterial',
        blend_mode: data.prop.blend_mode,
    };
};
