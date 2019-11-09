const {
    int,
    boolean,
    Nullable,
} = require('../../parser/type_converters');

const BaseButton = require('./BaseButton');

module.exports = (data) => {
    const res = Object.assign({}, BaseButton(data), {
        type: 'TextureButton',
        expand: boolean(data.prop.expand),
        stretch_mode: int(data.prop.stretch_mode),
        texture_disabled: Nullable(data.prop.texture_disabled),
        texture_hover: Nullable(data.prop.texture_hover),
        texture_normal: Nullable(data.prop.texture_normal),
        texture_pressed: Nullable(data.prop.texture_pressed),
    });

    return res;
};

module.exports.is_tres = true;
