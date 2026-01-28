"use strict";
/**
 * @doc2book/sanitizer
 * 去痕迹处理模块 - 移除原资料中的广告、人名、品牌等
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sanitizer = exports.SanitizeValidator = exports.ContentReplacer = exports.EntityDetector = void 0;
var entity_detector_1 = require("./entity-detector");
Object.defineProperty(exports, "EntityDetector", { enumerable: true, get: function () { return entity_detector_1.EntityDetector; } });
var replacer_1 = require("./replacer");
Object.defineProperty(exports, "ContentReplacer", { enumerable: true, get: function () { return replacer_1.ContentReplacer; } });
var validator_1 = require("./validator");
Object.defineProperty(exports, "SanitizeValidator", { enumerable: true, get: function () { return validator_1.SanitizeValidator; } });
var sanitizer_1 = require("./sanitizer");
Object.defineProperty(exports, "Sanitizer", { enumerable: true, get: function () { return sanitizer_1.Sanitizer; } });
