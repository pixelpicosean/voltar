const {
    NodePath,
    get_function_params,
} = require("../../parser/type_converters");

module.exports = (data) => {
    let users = [];
    let user_data = data.prop.user_data;
    for (let i = 0; i < data.prop.user_data.length; i += 3) {
        users.push({
            path: NodePath(get_function_params(user_data[i + 0])[0]),
            lightmap: user_data[i + 1],
            instance_index: user_data[i + 2],
        });
    }

    let bounds_param = get_function_params(data.prop.bounds);
    let bounds = {
        position: {
            x: parseFloat(bounds_param[0]),
            y: parseFloat(bounds_param[1]),
            z: parseFloat(bounds_param[2]),
        },
        size: {
            x: parseFloat(bounds_param[3]),
            y: parseFloat(bounds_param[4]),
            z: parseFloat(bounds_param[5]),
        },
    };

    return {
        type: data.attr.type,

        energy: data.prop.energy,
        bounds,
        users,
    };
};

module.exports.is_tres = true;
