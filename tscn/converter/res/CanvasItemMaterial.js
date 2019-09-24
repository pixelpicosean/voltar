const {
    int,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'CanvasItemMaterial',
        blend_mode: data.prop.blend_mode,
    };
};

module.exports.is_tres = () => true;
