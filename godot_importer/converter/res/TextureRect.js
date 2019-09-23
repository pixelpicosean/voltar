const {
    int,
    boolean,
    Nullable,
} = require('../../parser/type_converters');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'TextureRect',
        texture: Nullable(data.prop.texture),
        expand: boolean(data.prop.expand),
        stretch_mode: int(data.prop.stretch_mode),
    });

    return res;
};

module.exports.is_tres = () => true;
