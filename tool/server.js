'use strict';

const BASE_PORT = 4000;

const path = require('path');
const portfinder = require('portfinder');
portfinder.basePort = BASE_PORT;

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const colors = require('colors/safe');
const cliPrefix = require('./utils').cliPrefix;

const services = [
    require('./standalone_image_sync'),
    require('./bmfont_convert'),
]

function getIPAddress() {
    const interfaces = require('os').networkInterfaces();
    for (let devName in interfaces) {
        let iface = interfaces[devName];

        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }
    return '0.0.0.0';
}

function server(gameDir, port) {
    const ipAddress = getIPAddress();
    const fullAddress = `${ipAddress}:${port}`;

    const config = {
        mode: 'development',
        devtool: 'source-map',

        entry: path.resolve(gameDir, `src/game/main.ts`),
        output: {
            path: path.resolve(gameDir, 'dist'),
            filename: '[name].js',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    include: path.resolve(gameDir, 'src'),
                    use: [
                        {
                            loader: 'ts-loader',
                        },
                    ],
                },

                // Shaders
                {
                    test: /\.(vert|frag|vs|fs)$/,
                    include: [path.resolve(gameDir)],
                    loader: 'raw-loader',
                },
                // styles
                {
                    test: /\.css$/,
                    include: [path.resolve(gameDir)],
                    use: [
                        {
                            loader: 'style-loader',
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                modules: true,
                            },
                        },
                    ],
                },
                // binary resources packed as base64
                {
                    test: /\.(jpe?g|png|ttf|eot|svg|woff(2)?|mp3)(\?[a-z0-9=&.]+)?$/,
                    include: [path.resolve(gameDir)],
                    loader: 'base64-inline-loader',
                },
            ],
        },
        resolve: {
            extensions: ['.js', '.ts', '.json', '.css'],
            modules: [
                path.join(gameDir, 'src'),
                path.join(gameDir, 'assets'),
                path.join(gameDir, 'node_modules'),
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.resolve(gameDir, 'index.html'),
                inject: 'body',
            }),
        ],
    };

    const compiler = webpack(config);

    const devServer = new WebpackDevServer(compiler, {
        hot: false,
        contentBase: gameDir,
    });

    devServer.listen(port, null, function () {
        console.log(cliPrefix + colors.green(` Server is starting...`));
        console.log(cliPrefix + colors.bold(` Access URLS:`));
        console.log(colors.grey('--------------------------------------'));
        console.log(`      Local: ${colors.magenta('http://localhost:' + port)}`);
        console.log(`   External: ${colors.magenta('http://' + fullAddress)}`);
        console.log(colors.grey('--------------------------------------'));
    });

    // start services
    services.forEach(service => service(gameDir))
}

function start(gameDir) {
    portfinder.basePort = 4000;

    portfinder.getPort(function (err, realPort) {
        if (err) {
            throw err;
        }
        server(gameDir, realPort);
    });
};

start(path.resolve(__dirname, '..'))
