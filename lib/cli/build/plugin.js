// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createProcessor", {
    enumerable: true,
    get: function() {
        return createProcessor;
    }
});
const _packagejson = /*#__PURE__*/ _interop_require_default(require("../../../package.json"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _postcssloadconfig = /*#__PURE__*/ _interop_require_default(require("postcss-load-config"));
const _browserslist = /*#__PURE__*/ _interop_require_default(require("browserslist"));
const _lightningcss = /*#__PURE__*/ _interop_require_wildcard(require("lightningcss"));
const _lilconfig = require("lilconfig");
const _plugins = /*#__PURE__*/ _interop_require_default(require("postcss-load-config/src/plugins" // Little bit scary, looking at private/internal API
));
const _options = /*#__PURE__*/ _interop_require_default(require("postcss-load-config/src/options" // Little bit scary, looking at private/internal API
));
const _processTailwindFeatures = /*#__PURE__*/ _interop_require_default(require("../../processTailwindFeatures"));
const _utils = require("./utils");
const _sharedState = require("../../lib/sharedState");
const _resolveConfig = /*#__PURE__*/ _interop_require_default(require("../../../resolveConfig.js"));
const _content = require("../../lib/content.js");
const _watching = require("./watching.js");
const _fastglob = /*#__PURE__*/ _interop_require_default(require("fast-glob"));
const _findAtConfigPath = require("../../lib/findAtConfigPath.js");
const _log = /*#__PURE__*/ _interop_require_default(require("../../util/log"));
const _loadconfig = require("../../lib/load-config");
const _getModuleDependencies = /*#__PURE__*/ _interop_require_default(require("../../lib/getModuleDependencies"));
const _validateConfig = require("../../util/validateConfig");
const _handleImportAtRules = require("../../lib/handleImportAtRules");
const _featureFlags = require("../../featureFlags");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function license() {
    return `/* ! tailwindcss v${_packagejson.default.version} | MIT License | https://tailwindcss.com */\n`;
}
async function lightningcss(result, { map = true, minify = true } = {}) {
    try {
        var _browserslist_findConfig;
        var _result_opts_from;
        let resolvedBrowsersListConfig = (_browserslist_findConfig = _browserslist.default.findConfig((_result_opts_from = result.opts.from) !== null && _result_opts_from !== void 0 ? _result_opts_from : process.cwd())) === null || _browserslist_findConfig === void 0 ? void 0 : _browserslist_findConfig.defaults;
        let defaultBrowsersListConfig = _packagejson.default.browserslist;
        let browsersListConfig = resolvedBrowsersListConfig !== null && resolvedBrowsersListConfig !== void 0 ? resolvedBrowsersListConfig : defaultBrowsersListConfig;
        let transformed = _lightningcss.default.transform({
            filename: result.opts.from || 'input.css',
            code: Buffer.from(result.css, 'utf-8'),
            minify,
            sourceMap: result.map === undefined ? map : !!result.map,
            inputSourceMap: result.map ? result.map.toString() : undefined,
            targets: _lightningcss.default.browserslistToTargets((0, _browserslist.default)(browsersListConfig)),
            include: _lightningcss.Features.Nesting,
            exclude: _lightningcss.Features.LogicalProperties
        });
        return Object.assign(result, {
            css: transformed.code.toString(),
            map: result.map ? Object.assign(result.map, {
                toString () {
                    var _transformed_map;
                    return (_transformed_map = transformed.map) === null || _transformed_map === void 0 ? void 0 : _transformed_map.toString();
                }
            }) : result.map
        });
    } catch (err) {
        console.error('Unable to use Lightning CSS. Using raw version instead.');
        console.error(err);
        return result;
    }
}
/**
 *
 * @param {string} [customPostCssPath ]
 * @returns
 */ async function loadPostCssPlugins(customPostCssPath) {
    let config = customPostCssPath ? await (async ()=>{
        let file = _path.default.resolve(customPostCssPath);
        // Implementation, see: https://unpkg.com/browse/postcss-load-config@3.1.0/src/index.js
        // @ts-ignore
        let { config = {} } = await (0, _lilconfig.lilconfig)('postcss').load(file);
        if (typeof config === 'function') {
            config = config();
        } else {
            config = Object.assign({}, config);
        }
        if (!config.plugins) {
            config.plugins = [];
        }
        return {
            file,
            plugins: (0, _plugins.default)(config, file),
            options: (0, _options.default)(config, file)
        };
    })() : await (0, _postcssloadconfig.default)();
    let configPlugins = config.plugins;
    let configPluginTailwindIdx = configPlugins.findIndex((plugin)=>{
        if (typeof plugin === 'function' && plugin.name === 'tailwindcss') {
            return true;
        }
        if (typeof plugin === 'object' && plugin !== null && plugin.postcssPlugin === 'tailwindcss') {
            return true;
        }
        return false;
    });
    let beforePlugins = configPluginTailwindIdx === -1 ? [] : configPlugins.slice(0, configPluginTailwindIdx);
    let afterPlugins = configPluginTailwindIdx === -1 ? configPlugins : configPlugins.slice(configPluginTailwindIdx + 1);
    return [
        beforePlugins,
        afterPlugins,
        config.options
    ];
}
let state = {
    /** @type {any} */ context: null,
    /** @type {ReturnType<typeof createWatcher> | null} */ watcher: null,
    /** @type {{content: string, extension: string}[]} */ changedContent: [],
    /** @type {{config: import('../../../types').Config, dependencies: Set<string>, dispose: Function } | null} */ configBag: null,
    contextDependencies: new Set(),
    /** @type {import('../../lib/content.js').ContentPath[]} */ contentPaths: [],
    refreshContentPaths () {
        var _this_context;
        this.contentPaths = (0, _content.parseCandidateFiles)(this.context, (_this_context = this.context) === null || _this_context === void 0 ? void 0 : _this_context.tailwindConfig);
    },
    get config () {
        return this.context.tailwindConfig;
    },
    get contentPatterns () {
        return {
            all: this.contentPaths.map((contentPath)=>contentPath.pattern),
            dynamic: this.contentPaths.filter((contentPath)=>contentPath.glob !== undefined).map((contentPath)=>contentPath.pattern)
        };
    },
    loadConfig (configPath, content) {
        if (this.watcher && configPath) {
            this.refreshConfigDependencies();
        }
        let config = (0, _loadconfig.loadConfig)(configPath);
        let dependencies = (0, _getModuleDependencies.default)(configPath);
        this.configBag = {
            config,
            dependencies,
            dispose () {
                for (let file of dependencies){
                    delete require.cache[require.resolve(file)];
                }
            }
        };
        this.configBag.config = (0, _validateConfig.validateConfig)((0, _resolveConfig.default)(this.configBag.config));
        // Override content files if `--content` has been passed explicitly
        if ((content === null || content === void 0 ? void 0 : content.length) > 0) {
            this.configBag.config.content.files = content;
        }
        return this.configBag.config;
    },
    refreshConfigDependencies () {
        var _this_configBag;
        _sharedState.env.DEBUG && console.time('Module dependencies');
        (_this_configBag = this.configBag) === null || _this_configBag === void 0 ? void 0 : _this_configBag.dispose();
        _sharedState.env.DEBUG && console.timeEnd('Module dependencies');
    },
    readContentPaths () {
        let content = [];
        // Resolve globs from the content config
        // TODO: When we make the postcss plugin async-capable this can become async
        let files = _fastglob.default.sync(this.contentPatterns.all);
        for (let file of files){
            if ((0, _featureFlags.flagEnabled)(this.config, 'oxideParser')) {
                content.push({
                    file,
                    extension: _path.default.extname(file).slice(1)
                });
            } else {
                content.push({
                    content: _fs.default.readFileSync(_path.default.resolve(file), 'utf8'),
                    extension: _path.default.extname(file).slice(1)
                });
            }
        }
        // Resolve raw content in the tailwind config
        let rawContent = this.config.content.files.filter((file)=>{
            return file !== null && typeof file === 'object';
        });
        for (let { raw: htmlContent, extension = 'html' } of rawContent){
            content.push({
                content: htmlContent,
                extension
            });
        }
        return content;
    },
    getContext ({ createContext, cliConfigPath, root, result, content }) {
        _sharedState.env.DEBUG && console.time('Searching for config');
        var _findAtConfigPath1;
        let configPath = (_findAtConfigPath1 = (0, _findAtConfigPath.findAtConfigPath)(root, result)) !== null && _findAtConfigPath1 !== void 0 ? _findAtConfigPath1 : cliConfigPath;
        _sharedState.env.DEBUG && console.timeEnd('Searching for config');
        if (this.context) {
            this.context.changedContent = this.changedContent.splice(0);
            return this.context;
        }
        _sharedState.env.DEBUG && console.time('Loading config');
        let config = this.loadConfig(configPath, content);
        _sharedState.env.DEBUG && console.timeEnd('Loading config');
        _sharedState.env.DEBUG && console.time('Creating context');
        this.context = createContext(config, []);
        Object.assign(this.context, {
            userConfigPath: configPath
        });
        _sharedState.env.DEBUG && console.timeEnd('Creating context');
        _sharedState.env.DEBUG && console.time('Resolving content paths');
        this.refreshContentPaths();
        _sharedState.env.DEBUG && console.timeEnd('Resolving content paths');
        if (this.watcher) {
            _sharedState.env.DEBUG && console.time('Watch new files');
            this.watcher.refreshWatchedFiles();
            _sharedState.env.DEBUG && console.timeEnd('Watch new files');
        }
        for (let file of this.readContentPaths()){
            this.context.changedContent.push(file);
        }
        return this.context;
    }
};
async function createProcessor(args, cliConfigPath) {
    var _args_content;
    let input = args['--input'];
    let output = args['--output'];
    let includePostCss = args['--postcss'];
    let customPostCssPath = typeof args['--postcss'] === 'string' ? args['--postcss'] : undefined;
    let [beforePlugins, afterPlugins, postcssOptions] = includePostCss ? await loadPostCssPlugins(customPostCssPath) : [
        [],
        [],
        {}
    ];
    beforePlugins.unshift(...(0, _handleImportAtRules.handleImportAtRules)());
    if (args['--purge']) {
        _log.default.warn('purge-flag-deprecated', [
            'The `--purge` flag has been deprecated.',
            'Please use `--content` instead.'
        ]);
        if (!args['--content']) {
            args['--content'] = args['--purge'];
        }
    }
    var _args_content_split;
    let content = (_args_content_split = (_args_content = args['--content']) === null || _args_content === void 0 ? void 0 : _args_content.split(RegExp("(?<!{[^}]+),"))) !== null && _args_content_split !== void 0 ? _args_content_split : [];
    let tailwindPlugin = ()=>{
        return {
            postcssPlugin: 'tailwindcss',
            async Once (root, { result }) {
                _sharedState.env.DEBUG && console.time('Compiling CSS');
                await (0, _processTailwindFeatures.default)(({ createContext })=>{
                    console.error();
                    console.error('Rebuilding...');
                    return ()=>{
                        return state.getContext({
                            createContext,
                            cliConfigPath,
                            root,
                            result,
                            content
                        });
                    };
                })(root, result);
                _sharedState.env.DEBUG && console.timeEnd('Compiling CSS');
            }
        };
    };
    tailwindPlugin.postcss = true;
    let plugins = [
        ...beforePlugins,
        tailwindPlugin,
        !args['--minify'] && _utils.formatNodes,
        ...afterPlugins
    ].filter(Boolean);
    /** @type {import('postcss').Processor} */ // @ts-ignore
    let processor = (0, _postcss.default)(plugins);
    async function readInput() {
        // Piping in data, let's drain the stdin
        if (input === '-') {
            return (0, _utils.drainStdin)();
        }
        // Input file has been provided
        if (input) {
            return _fs.default.promises.readFile(_path.default.resolve(input), 'utf8');
        }
        // No input file provided, fallback to default atrules
        return '@tailwind base; @tailwind components; @tailwind utilities';
    }
    async function build() {
        let start = process.hrtime.bigint();
        let options = {
            ...postcssOptions,
            from: input,
            to: output
        };
        return readInput().then((css)=>processor.process(css, options)).then((result)=>lightningcss(result, {
                ...options,
                minify: !!args['--minify']
            })).then((result)=>{
            if (!state.watcher) {
                return result;
            }
            _sharedState.env.DEBUG && console.time('Recording PostCSS dependencies');
            for (let message of result.messages){
                if (message.type === 'dependency') {
                    state.contextDependencies.add(message.file);
                }
            }
            _sharedState.env.DEBUG && console.timeEnd('Recording PostCSS dependencies');
            // TODO: This needs to be in a different spot
            _sharedState.env.DEBUG && console.time('Watch new files');
            state.watcher.refreshWatchedFiles();
            _sharedState.env.DEBUG && console.timeEnd('Watch new files');
            return result;
        }).then((result)=>{
            if (!output) {
                process.stdout.write(license() + result.css);
                return;
            }
            return Promise.all([
                (0, _utils.outputFile)(result.opts.to, license() + result.css),
                result.map && (0, _utils.outputFile)(result.opts.to + '.map', result.map.toString())
            ]);
        }).then(()=>{
            let end = process.hrtime.bigint();
            console.error();
            console.error('Done in', (end - start) / BigInt(1e6) + 'ms.');
        }).then(()=>{}, (err)=>{
            // TODO: If an initial build fails we can't easily pick up any PostCSS dependencies
            // that were collected before the error occurred
            // The result is not stored on the error so we have to store it externally
            // and pull the messages off of it here somehow
            // This results in a less than ideal DX because the watcher will not pick up
            // changes to imported CSS if one of them caused an error during the initial build
            // If you fix it and then save the main CSS file so there's no error
            // The watcher will start watching the imported CSS files and will be
            // resilient to future errors.
            if (state.watcher) {
                console.error(err);
            } else {
                return Promise.reject(err);
            }
        });
    }
    /**
   * @param {{file: string, content(): Promise<string>, extension: string}[]} changes
   */ async function parseChanges(changes) {
        return Promise.all(changes.map(async (change)=>({
                content: await change.content(),
                extension: change.extension
            })));
    }
    if (input !== undefined && input !== '-') {
        state.contextDependencies.add(_path.default.resolve(input));
    }
    return {
        build,
        watch: async ()=>{
            state.watcher = (0, _watching.createWatcher)(args, {
                state,
                /**
         * @param {{file: string, content(): Promise<string>, extension: string}[]} changes
         */ async rebuild (changes) {
                    let needsNewContext = changes.some((change)=>{
                        var _state_configBag;
                        return ((_state_configBag = state.configBag) === null || _state_configBag === void 0 ? void 0 : _state_configBag.dependencies.has(change.file)) || state.contextDependencies.has(change.file);
                    });
                    if (needsNewContext) {
                        state.context = null;
                    } else {
                        for (let change of (await parseChanges(changes))){
                            state.changedContent.push(change);
                        }
                    }
                    return build();
                }
            });
            await build();
        }
    };
}