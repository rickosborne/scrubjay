var path = require('path');

module.exports = {
  mode: 'none',
  entry: './feeder.ts',
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
    filename: 'feeder.js'
  },
  target: 'node',
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    modules: ['node_modules']
  }
};
