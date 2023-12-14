"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _lightningcss = /*#__PURE__*/ _interop_require_wildcard(require("lightningcss"));
const _browserslist = /*#__PURE__*/ _interop_require_default(require("browserslist"));
const _setupTrackingContext = /*#__PURE__*/ _interop_require_default(require("./lib/setupTrackingContext"));
const _processTailwindFeatures = /*#__PURE__*/ _interop_require_wildcard(require("./processTailwindFeatures"));
const _sharedState = require("./lib/sharedState");
const _findAtConfigPath = require("./lib/findAtConfigPath");
const _handleImportAtRules = require("./lib/handleImportAtRules");
const _packagejson = require("../package.json");
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
    return `/* ! tailwindcss v${_packagejson.version} | MIT License | https://tailwindcss.com */\n`;
}
module.exports = function tailwindcss(configOrPath) {
    return {
        postcssPlugin: 'tailwindcss',
        plugins: [
            _sharedState.env.DEBUG && function(root) {
                console.log('\n');
                console.time('JIT TOTAL');
                return root;
            },
            ...(0, _handleImportAtRules.handleImportAtRules)(),
            async function(root, result) {
                var _findAtConfigPath1;
                // Use the path for the `@config` directive if it exists, otherwise use the
                // path for the file being processed
                configOrPath = (_findAtConfigPath1 = (0, _findAtConfigPath.findAtConfigPath)(root, result)) !== null && _findAtConfigPath1 !== void 0 ? _findAtConfigPath1 : configOrPath;
                let context = (0, _setupTrackingContext.default)(configOrPath);
                if (root.type === 'document') {
                    let roots = root.nodes.filter((node)=>node.type === 'root');
                    for (const root of roots){
                        if (root.type === 'root') {
                            await (0, _processTailwindFeatures.default)(context)(root, result);
                        }
                    }
                    return;
                }
                await (0, _processTailwindFeatures.default)(context)(root, result);
            },
            function lightningCssPlugin(_root, result) {
                var _intermediateResult_map_toJSON, _intermediateResult_map;
                var _result_map;
                let map = (_result_map = result.map) !== null && _result_map !== void 0 ? _result_map : result.opts.map;
                let intermediateResult = result.root.toResult({
                    map: map ? {
                        inline: true
                    } : false
                });
                var _intermediateResult_map_toJSON1;
                let intermediateMap = (_intermediateResult_map_toJSON1 = (_intermediateResult_map = intermediateResult.map) === null || _intermediateResult_map === void 0 ? void 0 : (_intermediateResult_map_toJSON = _intermediateResult_map.toJSON) === null || _intermediateResult_map_toJSON === void 0 ? void 0 : _intermediateResult_map_toJSON.call(_intermediateResult_map)) !== null && _intermediateResult_map_toJSON1 !== void 0 ? _intermediateResult_map_toJSON1 : map;
                try {
                    var _browserslist_findConfig;
                    var _result_opts_from;
                    let resolvedBrowsersListConfig = (_browserslist_findConfig = _browserslist.default.findConfig((_result_opts_from = result.opts.from) !== null && _result_opts_from !== void 0 ? _result_opts_from : process.cwd())) === null || _browserslist_findConfig === void 0 ? void 0 : _browserslist_findConfig.defaults;
                    let defaultBrowsersListConfig = require('../package.json').browserslist;
                    let browsersListConfig = resolvedBrowsersListConfig !== null && resolvedBrowsersListConfig !== void 0 ? resolvedBrowsersListConfig : defaultBrowsersListConfig;
                    let transformed = _lightningcss.default.transform({
                        filename: result.opts.from,
                        code: Buffer.from(intermediateResult.css),
                        minify: false,
                        sourceMap: !!intermediateMap,
                        targets: _lightningcss.default.browserslistToTargets((0, _browserslist.default)(browsersListConfig)),
                        errorRecovery: true,
                        drafts: {
                            customMedia: true
                        },
                        nonStandard: {
                            deepSelectorCombinator: true
                        },
                        include: _lightningcss.Features.Nesting,
                        exclude: _lightningcss.Features.LogicalProperties
                    });
                    let code = transformed.code.toString();
                    // https://postcss.org/api/#sourcemapoptions
                    if (intermediateMap && transformed.map != null) {
                        let prev = transformed.map.toString();
                        if (typeof intermediateMap === 'object') {
                            intermediateMap.prev = prev;
                        } else {
                            code = `${code}\n/*# sourceMappingURL=data:application/json;base64,${Buffer.from(prev).toString('base64')} */`;
                        }
                    }
                    result.root = _postcss.default.parse(license() + code, {
                        ...result.opts,
                        map: intermediateMap
                    });
                } catch (err) {
                    if (err.source && typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
                        let lines = err.source.split('\n');
                        err = new Error([
                            'Error formatting using Lightning CSS:',
                            '',
                            ...[
                                '```css',
                                ...lines.slice(Math.max(err.loc.line - 3, 0), err.loc.line),
                                ' '.repeat(err.loc.column - 1) + '^-- ' + err.toString(),
                                ...lines.slice(err.loc.line, err.loc.line + 2),
                                '```'
                            ]
                        ].join('\n'));
                    }
                    if (Error.captureStackTrace) {
                        Error.captureStackTrace(err, lightningCssPlugin);
                    }
                    throw err;
                }
            },
            _sharedState.env.DEBUG && function(root) {
                console.timeEnd('JIT TOTAL');
                console.log('\n');
                return root;
            }
        ].filter(Boolean)
    };
};
module.exports.postcss = true;
module.exports.mod = _processTailwindFeatures.mod;