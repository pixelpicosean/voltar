const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
    devtool: "inline-source-map",
    mode: "development",
    devServer: {
        contentBase: __dirname,
        publicPath: "/",
        compress: true,
        port: 4000,
    },
});
