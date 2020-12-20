const Node = require('./Node');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        size: data.prop.size,
        render_target_v_flip: data.prop.render_target_v_flip,
    });

    return res;
};

module.exports.is_tres = true;
