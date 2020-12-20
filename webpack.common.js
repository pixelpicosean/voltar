const path = require("path");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { TsconfigPathsPlugin } = require("tsconfig-paths-webpack-plugin");

module.exports = {
    entry: path.resolve(__dirname, "./src/game/main.ts"),
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
            },
            // Shaders
            {
                test: /\.(vert|frag|vs|fs)$/,
                include: [
                    path.resolve(__dirname, "src"),
                ],
                loader: "raw-loader",
            },
            // binary resources packed as base64
            {
                test: /\.(jpe?g|png|ttf|eot|svg|woff(2)?|mp3)(\?[a-z0-9=&.]+)?$/,
                include: [
                    path.resolve(__dirname),
                ],
                loader: "base64-inline-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
        plugins: [
            new TsconfigPathsPlugin,
        ],
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [
        new CleanWebpackPlugin,
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "index.html"),
        }),
    ],
};
