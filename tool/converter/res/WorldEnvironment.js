const Node = require('./Node');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        type: 'WorldEnvironment',
        environment: data.prop.environment,
    });

    return res;
};

module.exports.is_tres = true;
