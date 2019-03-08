var path = require('path');

module.exports = {
  mode: 'development',
  entry: './scrubjay.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  output: {
    path: path.join(__dirname, './dist'),
    filename: 'scrubjay.js'
  },
  target: 'node',
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    modules: ['node_modules']
  }
};
