"use strict";
/**
 * @doc2book/creator
 * 原创内容生成模块
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyleAdapter = exports.Humanizer = exports.Translator = exports.ContentRewriter = void 0;
var rewriter_1 = require("./rewriter");
Object.defineProperty(exports, "ContentRewriter", { enumerable: true, get: function () { return rewriter_1.ContentRewriter; } });
var translator_1 = require("./translator");
Object.defineProperty(exports, "Translator", { enumerable: true, get: function () { return translator_1.Translator; } });
var humanizer_1 = require("./humanizer");
Object.defineProperty(exports, "Humanizer", { enumerable: true, get: function () { return humanizer_1.Humanizer; } });
var style_adapter_1 = require("./style-adapter");
Object.defineProperty(exports, "StyleAdapter", { enumerable: true, get: function () { return style_adapter_1.StyleAdapter; } });
