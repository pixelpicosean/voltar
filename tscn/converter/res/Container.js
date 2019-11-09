const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'Container',
    });

    return res;
};

module.exports.is_tres = true;
