const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
    devtool: "inline-source-map",
    mode: "development",
    devServer: {
        host: "0.0.0.0",
        port: 4000,
    },
});
