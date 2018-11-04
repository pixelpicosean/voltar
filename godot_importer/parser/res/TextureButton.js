const {
    int,
    boolean,
    Nullable,
} = require('../parse_utils');

const BaseButton = require('./BaseButton');

module.exports = (data) => {
    const res = Object.assign({}, BaseButton(data), {
        type: 'TextureButton',
    });

    res.expand = boolean(data.prop.expand);
    res.stretch_mode = int(data.prop.stretch_mode);

    res.texture_disabled = Nullable(data.prop.texture_disabled);
    res.texture_hover = Nullable(data.prop.texture_hover);
    res.texture_normal = Nullable(data.prop.texture_normal);
    res.texture_pressed = Nullable(data.prop.texture_pressed);

    return res;
};
