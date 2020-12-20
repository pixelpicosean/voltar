const {
    real,
    boolean,
} = require('../../parser/type_converters');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'Range',
        allow_greater: boolean(data.prop.allow_greater),
        allow_lesser: boolean(data.prop.allow_lesser),
        exp_edit: boolean(data.prop.exp_edit),
        max_value: real(data.prop.max_value),
        min_value: real(data.prop.min_value),
        page: real(data.prop.page),
        ratio: real(data.prop.ratio),
        rounded: boolean(data.prop.rounded),
        step: real(data.prop.step),
        value: real(data.prop.value),
    });

    return res;
};

module.exports.is_tres = true;
