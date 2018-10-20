module.exports = (data) => {
    return require(`./res/${data.attr.type}`)(data);
};
