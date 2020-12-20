module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
    };

    return res;
};

module.exports.is_tres = true;
