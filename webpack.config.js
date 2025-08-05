const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true,
  },
  mode: isProduction ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devServer: {
    static: { directory: path.join(__dirname, 'public') },
    compress: true,
    port: 3000,
    open: true,
    historyApiFallback: true,
  },
  devtool: isProduction ? false : 'source-map',
  resolve: {
    extensions: ['.js', '.json'],
  },
};
