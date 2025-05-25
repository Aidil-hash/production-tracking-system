const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  target: 'electron-renderer',
  entry: './src/index.jsx',
  output: {
    filename: 'renderer.bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
});