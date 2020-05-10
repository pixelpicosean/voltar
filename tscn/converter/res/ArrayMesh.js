/**
 * @param {any} data
 * @param {string} key
 */
function parse_as_array(data, key) {
    const key_s = `${key}/`;

    let result = [];

    for (let k in data) {
        if (k.indexOf(key_s) >= 0) {
            let index_str = k.substr(k.indexOf(key_s) + key_s.length);
            let index = parseInt(index_str);
            if (Number.isFinite(index)) {
                result[index] = data[k];
            }
        }
    }

    return result;
}

module.exports = (data) => {
    let surfaces = parse_as_array(data.prop, 'surfaces');
    for (let s of surfaces) {
        let arrays = s.arrays.map(arr => arr ? ({
            compressed: false,
            normalized: false,
            array: arr,
        }) : null)
        let meta = s.arrays[0].__meta__;
        if (meta && meta.func) {
            s.is_2d = (meta.func != "Vector3Array");
        }
        s.arrays = arrays;
    }
    return {
        id: data.attr.id,
        type: 'ArrayMesh',

        surfaces,
    }
};

module.exports.is_tres = true;
