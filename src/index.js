const coreJsMeta = {
  2: {
    prefixes: {
      es6: 'es6',
      es7: 'es7'
    },
    builtIns: '@babel/preset-env/data/built-ins.json.js'
  },
  3: {
    prefixes: {
      es6: 'es',
      es7: 'es'
    },
    builtIns: 'core-js-compat/data'
  }
}

function getDefaultPolyfills (corejs) {
  const { prefixes: { es6, es7 } } = coreJsMeta[corejs.version]
  return [
    // Promise polyfill alone doesn't work in IE,
    // Needs this as well. see: #1642
    `${es6}.array.iterator`,
    // This is required for webpack code splitting, vuex etc.
    `${es6}.promise`,
    // this is needed for object rest spread support in templates
    // as vue-template-es2015-compiler 1.8+ compiles it to Object.assign() calls.
    `${es6}.object.assign`,
    // #2012 es7.promise replaces native Promise in FF and causes missing finally
    `${es7}.promise.finally`
  ]
}

function getPolyfills (targets, includes, { ignoreBrowserslistConfig, configPath, corejs }) {
  const { isPluginRequired } = require('@babel/preset-env')
  const builtInsList = require(coreJsMeta[corejs.version].builtIns)
  const getTargets = require('@babel/preset-env/lib/targets-parser').default
  const builtInTargets = getTargets(targets, {
    ignoreBrowserslistConfig,
    configPath
  })

  return includes.filter(item => isPluginRequired(builtInTargets, builtInsList[item]))
}

function polyfillList(api, options = {}) {
  const presets = []
  const plugins = []

  const envName = 'client';

  const {
    polyfills: userPolyfills,
    loose = false,
    debug = false,
    useBuiltIns = 'usage',
    modules = false,
    spec,
    ignoreBrowserslistConfig = envName === 'modern',
    configPath,
    include,
    exclude,
    shippedProposals,
    forceAllTransforms,
    decoratorsBeforeExport,
    decoratorsLegacy,
    absoluteRuntime
  } = options

  let { corejs = { version: 2 } } = options

  if (typeof corejs !== 'object') {
    corejs = { version: Number(corejs) }
  }

  const defaultTargets = {
    server: { node: 'current' },
    client: { ie: 9 },
    modern: { esmodules: true }
  }

  let { targets = defaultTargets[envName] } = options

  // modern mode can only be { esmodules: true }
  if (envName === 'modern') {
    targets = defaultTargets.modern
  }

  const polyfills = []

  if (envName === 'client' && useBuiltIns === 'usage') {
    polyfills.push(
      ...getPolyfills(
        targets,
        userPolyfills || getDefaultPolyfills(corejs),
        {
          ignoreBrowserslistConfig,
          configPath,
          corejs
        }
      )
    )
    plugins.push([require('./polyfills-plugin'), { polyfills }])
  }

  // Pass options along to babel-preset-env
  presets.push([
    require('@babel/preset-env'), {
      spec,
      loose,
      debug,
      modules,
      targets,
      useBuiltIns,
      corejs,
      ignoreBrowserslistConfig,
      configPath,
      include,
      exclude: polyfills.concat(exclude || []),
      shippedProposals,
      forceAllTransforms
    }
  ])

  plugins.push(
    [require('@babel/plugin-proposal-decorators'), {
      decoratorsBeforeExport,
      legacy: decoratorsLegacy !== false
    }],
    [require('@babel/plugin-proposal-class-properties'), { loose: true }]
  )

  // Transform runtime, but only for helpers
  plugins.push([require('@babel/plugin-transform-runtime'), {
    regenerator: useBuiltIns !== 'usage',
    corejs: false,
    helpers: useBuiltIns === 'usage',
    useESModules: envName !== 'server',
    absoluteRuntime
  }])

  return {
    presets,
    plugins
  }
}

class PolyfillIoUsageWebpackPlugin {
  constructor(options) {
    let plugins = polyfillList();
    console.log('presets: ', plugins.presets[0]);
    console.log('plugins: ', plugins.plugins);
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
        // console.log('polyfills: ', getPolyfills())
        const script = this.buildScriptTag()
        data.head.unshift(script)
      })
    })
  }
}

module.exports = PolyfillIoUsageWebpackPlugin
