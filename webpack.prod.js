const path = require("path");

const common = require("./webpack.common.js");

const { merge } = require("webpack-merge");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = merge(common, {
    entry: path.resolve(__dirname, "./src/game/main.ts"),

    plugins: [
        new CopyPlugin({
            patterns: [
                "fonts.css",
            ],
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: undefined,
                    warnings: false,
                    parse: {},
                    compress: {},
                    mangle: true,
                    module: false,
                    output: null,
                    toplevel: false,
                    nameCache: null,
                    ie8: false,
                    keep_classnames: undefined,
                    keep_fnames: false,
                    safari10: false,
                },
            }),
        ],
    },
    mode: "production",
});
