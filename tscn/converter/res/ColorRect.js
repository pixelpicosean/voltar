const {
    Color,
} = require('../../parser/type_converters');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'ColorRect',
        color: Color(data.prop.color),
    });

    return res;
};

module.exports.is_tres = () => true;
