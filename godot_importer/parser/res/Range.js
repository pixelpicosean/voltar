const {
    int,
    real,
    boolean,
    Vector2,
    Color,
    Nullable,
} = require('../parse_utils');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'Range',
    });

    res.allow_greater = boolean(data.prop.allow_greater);
    res.allow_lesser = boolean(data.prop.allow_lesser);

    res.exp_edit = boolean(data.prop.exp_edit);

    res.max_value = real(data.prop.max_value);
    res.min_value = real(data.prop.min_value);

    res.page = real(data.prop.page);

    res.ratio = real(data.prop.ratio);

    res.rounded = boolean(data.prop.rounded);

    res.step = real(data.prop.step);

    res.value = real(data.prop.value);

    return res;
};
