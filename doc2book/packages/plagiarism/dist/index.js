"use strict";
/**
 * @doc2book/plagiarism
 * 抄袭检测模块 - 确保生成内容的原创性
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = exports.VectorStore = exports.SimilarityChecker = void 0;
var similarity_checker_1 = require("./similarity-checker");
Object.defineProperty(exports, "SimilarityChecker", { enumerable: true, get: function () { return similarity_checker_1.SimilarityChecker; } });
var vector_store_1 = require("./vector-store");
Object.defineProperty(exports, "VectorStore", { enumerable: true, get: function () { return vector_store_1.VectorStore; } });
var report_generator_1 = require("./report-generator");
Object.defineProperty(exports, "ReportGenerator", { enumerable: true, get: function () { return report_generator_1.ReportGenerator; } });
