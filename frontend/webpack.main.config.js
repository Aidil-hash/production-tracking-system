const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  target: 'electron-main',
  entry: './electron.jsx',
  output: {
    filename: 'electron.bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  externals: {
    electron: 'commonjs electron',
    fs: 'commonjs fs',
    path: 'commonjs path'
  }
});