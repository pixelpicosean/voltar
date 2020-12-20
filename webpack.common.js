const path = require('path');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, `./src/game/main.ts`),
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: [
                    path.resolve(__dirname, "node_modules"),
                ],
            },
            // Shaders
            {
                test: /\.(vert|frag|vs|fs)$/,
                include: [
                    path.resolve(__dirname, "src"),
                ],
                loader: 'raw-loader',
            },
            // binary resources packed as base64
            {
                test: /\.(jpe?g|png|ttf|eot|svg|woff(2)?|mp3)(\?[a-z0-9=&.]+)?$/,
                include: [
                    path.resolve(__dirname),
                ],
                loader: 'base64-inline-loader',
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new CleanWebpackPlugin,
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'index.html'),
        }),
    ],
};
