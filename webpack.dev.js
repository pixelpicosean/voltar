const path = require("path");

const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
    entry: {
        engine: {
            import: path.resolve(__dirname, "./src/engine/index.ts"),
        },
        main: {
            import: path.resolve(__dirname, "./src/game/main.ts"),
            dependOn: "engine",
        },
    },
    optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,

        runtimeChunk: true,
    },

    devtool: "inline-source-map",
    mode: "development",
    devServer: {
        host: "0.0.0.0",
        port: 4000,
    },
});
