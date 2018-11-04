const {
    int,
    boolean,
    Nullable,
} = require('../parse_utils');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'TextureRect',
    });

    res.texture = Nullable(data.prop.texture);
    res.expand = boolean(data.prop.expand);
    res.stretch_mode = int(data.prop.stretch_mode);

    return res;
};
