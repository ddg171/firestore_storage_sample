// 絶対パス指定したい時は必ずImportする。
// const path = require("path");

// eslint-disable-next-line no-undef
module.exports = {
  mode: "development",
  entry: "./src/main.ts",
  output: {
    // eslint-disable-next-line no-undef
    path: __dirname+"/dist",
    filename: "app.js",
  },
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    ie: "11",
                  },
                  useBuiltIns: "usage",
                  corejs: 3,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".ts"],
    alias: {
      vue$: "vue/dist/vue.esm.js", // 'vue/dist/vue.common.js' webpack 1 用
    },
  },
  // optimization: {
  //   splitChunks: {
  //     cacheGroups: {
  //       commons: {
  //         test: /[\\/]node_modules[\\/]/,
  //         name: "vendor",
  //         chunks: "initial",
  //       },
  //     },
  //   },
  // },
};
