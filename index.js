'use strict'

// let { targets } = options
// if (modern === true) {
//   targets = { esmodules: true }
// } else if (targets === undefined && typeof buildTarget === 'string') {
//   targets = buildTarget === 'server' ? { node: 'current' } : { ie: 9 }
// }

function getPolyfills() {
  const { isPluginRequired } = require('@babel/preset-env')
  const builtInsList = require('@babel/preset-env/data/built-ins.json')
  const getTargets = require('@babel/preset-env/lib/targets-parser').default
  // const builtInTargets = getTargets(targets, {
  //   ignoreBrowserslistConfig,
  //   configPath
  // })
  console.log('builtInsList: ', builtInsList);
  console.log('getTargets: ', getTargets());

  // return includes.filter(item => isPluginRequired(builtInTargets, builtInsList[item]))
}

class PolyfillIoUsageWebpackPlugin {
  constructor(options) {
    this.options = options
  }

  buildSrc() {
    const base = 'https://polyfill.io/v3/polyfill.min.js'
    const options = []

    if (this.options.gated)
      options.push(['flags', ['gated']].join('='))

    if (this.options.features)
      options.push(['features', this.options.features].join('='))

    return [`${base}`, options.join('&')].filter(Boolean).join('?')
  }

  buildScriptAttrs() {
    const attrs = {}

    attrs.src = this.buildSrc()
    attrs.crossorigin = 'anonymous'

    return attrs
  }

  buildScriptTag() {
    return {
      tagName: 'script',
      closeTag: true,
      attributes: this.buildScriptAttrs(),
    }
  }

  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-alter-asset-tags', data => {
        // console.log('script: ', this.buildScriptTag());
        // console.log('data.head: ', data.head);
        console.log('polyfills: ', getPolyfills())
        const script = this.buildScriptTag()
        data.head.unshift(script)
      })
    })
  }
}

module.exports = PolyfillIoUsageWebpackPlugin
