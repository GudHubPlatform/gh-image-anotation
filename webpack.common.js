import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export default {
	experiments: {
		outputModule: true
	},
	entry: {
		imageAnotation: './src/components/image-anotation/image-anotation.js',
		anotationsEditor: './src/components/anotations-editor/anotations-editor.js',
		anotationsViewer: './src/components/anotations-viewer/anotations-viewer.js'
	},
	output: {
		filename: '[name].js',
		library: {
			type: 'module'
		}
	},
	module: {
		rules: [
			{
				test: /\.html$/i,
				loader: 'html-loader',
				options: {
					minimize: false
				}
			},
			{
				test: /\.(sass|scss|css)$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
						options: {
							importLoaders: 2,
							sourceMap: false,
							modules: false
						}
					},
					'sass-loader'
				]
			}
		]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: 'style.css'
		})
	]
};
