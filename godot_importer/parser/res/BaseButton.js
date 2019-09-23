const {
    int,
    real,
    boolean,
    Vector2,
} = require('../type_converters');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'BaseButton',
    });

    res.action_mode = int(data.prop.action_mode);
    res.disabled = boolean(data.prop.disabled);
    res.pressed = boolean(data.prop.pressed);
    res.toggle_mode = boolean(data.prop.toggle_mode);

    return res;
};
