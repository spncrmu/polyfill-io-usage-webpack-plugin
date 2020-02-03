const PolyfillIoUsageWebpackPlugin = require('../src/index.js')

module.exports = {
  configureWebpack: {
     plugins: [
        new PolyfillIoUsageWebpackPlugin({
          gated: true,
          features: [
            'Intl',
            'Map',
            'Set',
            'Array.isArray',
            'Array.prototype.find',
            'Array.prototype.some',
            'Object.assign',
            'Promise',
          ]
        }),
     ]
  },
}