const Spatial = require("./Spatial");

module.exports = (data) => {
    let bones = [];

    // Support up to 512 bones per skeleton
    for (let i = 0; i < 512; i++) {
        let bone_pre = `bones/${i}`;
        let bone_name = data.prop[`${bone_pre}/name`];

        if (!bone_name) {
            break;
        }

        bones.push({
            name: bone_name,
            parent: data.prop[`${bone_pre}/parent`],
            enabled: data.prop[`${bone_pre}/enabled`],
            rest: data.prop[`${bone_pre}/rest`],
            pose: data.prop[`${bone_pre}/pose`],
            bound_children: data.prop[`${bone_pre}/bound_children`],
        })
    }

    const res = Object.assign({}, Spatial(data), {
        bones,
    });
    return res;
};

module.exports.is_tres = true;
