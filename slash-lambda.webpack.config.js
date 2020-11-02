const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');

module.exports = {
    context: __dirname,
    mode: 'none',
    entry: './slash-lambda.ts',
    // externals: [
    //     nodeExternals(),
    // ],
    // devtool: 'inline-source-map',
    devtool: false,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader?configFile=tsconfig.webpack.json',
                exclude: /node_modules/
            }
        ]
    },
    output: {
        path: path.join(__dirname, './dist'),
        filename: 'slash-lambda.js',
        library: 'slash-lambda',
        libraryTarget: 'commonjs2'
    },
    target: 'node',
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
        modules: ['node_modules']
    }
};
