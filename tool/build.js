'use strict';

const path = require('path');
const fs = require('fs-extra');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const colors = require('colors/safe');
const cliPrefix = require('./utils').cliPrefix;

// List of ignored files that won't be copied to media folder
const copy_ignores = [
    '.DS_Store',
];

// File with these extensions in `assets/image/standalone` will be copied to media
// during building process
const standalone_copy_exts = [
    '.png',
    '.tiff',
    '.jpg',
    '.jpeg',
];

function build(gameDir) {
    console.log(`${cliPrefix} Start to build...`);

    const config = {
        mode: 'production',

        entry: path.resolve(gameDir, `src/game/main.ts`),
        target: ['web', 'es5'],

        output: {
            path: path.resolve(gameDir, 'dist'),
            filename: '[name].js',
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.resolve(gameDir, 'index.html'),
                inject: 'body',
                minify: {
                    collapseWhitespace: true,
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    useShortDoctype: true,
                },
            }),
        ],
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
                    include: [path.resolve(gameDir, 'src')],
                    loader: 'raw-loader',
                },
                // compressed files
                {
                    test: /\.vt$/,
                    include: [path.resolve(gameDir, 'media')],
                    loader: 'raw-loader',
                },
                // Styles
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
                // images and fonts
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
                path.join(gameDir, 'media'),
                path.join(gameDir, 'node_modules'),
            ],
        },
    };

    const target_dir = path.resolve(gameDir, 'dist');

    const build_error = (err) => {
        console.log(err)
        console.log(`\n${cliPrefix} ${colors.red('Build failed!')}`);
    }

    // Clean up contents of the target dir
    fs.emptyDir(target_dir)
        .then(() => {
            console.log(`${cliPrefix} ${colors.yellow('Compile scripts...')}`);

            // Build with webpack
            const compiler = webpack(config);
            compiler.run(function (err, stats) {
                if (err) {
                    build_error(err);
                    return;
                }

                // Start to copy resources
                console.log(`${cliPrefix} ${colors.yellow('Copy media...')}`);

                const standalone_path = path.resolve(gameDir, 'assets/image/standalone');

                const copy_standalone_images_to_media = () => {
                    fs.readdirSync(standalone_path)
                        .filter(src => standalone_copy_exts.indexOf(path.extname(src).toLowerCase()) >= 0)
                        .forEach(file => {
                            fs.copyFileSync(path.resolve(standalone_path, file), path.resolve(gameDir, 'media', file));
                        })
                }
                const copy_media_to_dist = () => (
                    fs.copy(path.resolve(gameDir, 'media'), path.resolve(gameDir, 'dist/media'), {
                        filter: (src, dest) => {
                            return copy_ignores.indexOf(path.basename(src)) < 0;
                        }
                    })
                )
                const report_copy_complete = () => {
                    console.log(`${cliPrefix} ${colors.green('Build complete!')}`);
                }

                // Copy images in the `standalone` folder if exist
                if (fs.pathExistsSync(standalone_path)) {
                    copy_standalone_images_to_media();
                }

                // Copy if not bundled as single HTML file
                copy_media_to_dist()
                    .then(report_copy_complete)
                    .catch(build_error)
                fs.copyFileSync(path.resolve(gameDir, 'fonts.css'), path.resolve(gameDir, 'dist/fonts.css'))
            });
        })
        .catch(build_error)
}

build(path.resolve(__dirname, '..'))
