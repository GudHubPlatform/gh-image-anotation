import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';

export default {
    experiments: { outputModule: true },
    entry: './index.js',
    output: {
        path: path.resolve('dist'),
        filename: 'main.js',
        library: { type: 'module' },
        clean: true
    },
    module: {
        rules: [
            // HTML inside components
            {
                test: /\.html$/i,
                loader: 'html-loader',
                options: { minimize: false }
            },
            // SCSS for Shadow DOM components
            {
                test: /\.scss$/i,
                include: path.resolve('src/components'),
                use: [
                    'to-string-loader',
                    {
                        loader: 'css-loader',
                        options: { esModule: false }
                    },
                    'sass-loader'
                ]
            },
            // Global SCSS
            {
                test: /\.scss$/i,
                exclude: path.resolve('src/components'),
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: { importLoaders: 1, esModule: false }
                    },
                    'sass-loader'
                ]
            },
            // Global CSS
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: 'bundle.css' })
    ],
    resolve: {
        extensions: ['.js', '.scss', '.css', '.html']
    }
};
