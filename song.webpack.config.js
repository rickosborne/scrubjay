var path = require('path');

module.exports = {
  mode: 'none',
  entry: './song.ts',
  devtool: 'inline-source-map',
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
    filename: 'song.js'
  },
  target: 'node',
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    modules: ['node_modules']
  }
};
