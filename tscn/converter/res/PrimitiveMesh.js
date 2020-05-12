module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,

        material: data.prop.material,
        flip_faces: data.prop.flip_faces,
        lightmap_size_hint: data.prop.lightmap_size_hint,
    }
    return res;
};
