module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'Curve',
        data: data.prop._data,
    }
};
