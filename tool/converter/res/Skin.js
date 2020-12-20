module.exports = (data) => {
    let binds = [];

    for (let i = 0; i < data.prop.bind_count; i++) {
        let bone_pre = `bind/${i}`;

        binds.push({
            bone: data.prop[`${bone_pre}/bone`],
            name: data.prop[`${bone_pre}/name`],
            pose: data.prop[`${bone_pre}/pose`],
        });
    }

    return {
        id: data.attr.id,
        type: data.attr.type,

        binds,
    };
};

module.exports.is_tres = true;
