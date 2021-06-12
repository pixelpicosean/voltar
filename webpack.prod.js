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
                    parse: {},
                    compress: {},
                    warnings: false,
                    module: false,
                    output: null,
                    toplevel: false,
                    nameCache: null,

                    mangle: true,
                    keep_classnames: false,
                    keep_fnames: false,

                    ie8: false,
                    safari10: false,
                },
            }),
        ],
    },
    mode: "production",
});
