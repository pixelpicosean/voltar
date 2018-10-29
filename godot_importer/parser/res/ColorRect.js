const {
    Color,
} = require('../parse_utils');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'ColorRect',
    });

    res.color = Color(data.prop.color);

    return res;
};
