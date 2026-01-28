"use strict";
/**
 * @doc2book/knowledge
 * 知识提取模块 - 构建知识图谱，提取关键信息
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationFinder = exports.GraphBuilder = exports.KnowledgeExtractor = void 0;
var extractor_1 = require("./extractor");
Object.defineProperty(exports, "KnowledgeExtractor", { enumerable: true, get: function () { return extractor_1.KnowledgeExtractor; } });
var graph_builder_1 = require("./graph-builder");
Object.defineProperty(exports, "GraphBuilder", { enumerable: true, get: function () { return graph_builder_1.GraphBuilder; } });
var relation_finder_1 = require("./relation-finder");
Object.defineProperty(exports, "RelationFinder", { enumerable: true, get: function () { return relation_finder_1.RelationFinder; } });
