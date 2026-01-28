"use strict";
/**
 * @doc2book/understanding
 * 内容理解模块 - 类似 Google NotebookLM 的深度内容理解
 *
 * 功能：
 * - 内容分析：理解文档的核心主题和论点
 * - 摘要生成：生成文档摘要
 * - 结构识别：识别文档结构
 * - 章节分割：智能分割章节
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterSplitter = exports.StructureDetector = exports.Summarizer = exports.ContentAnalyzer = void 0;
// 核心功能
var analyzer_1 = require("./analyzer");
Object.defineProperty(exports, "ContentAnalyzer", { enumerable: true, get: function () { return analyzer_1.ContentAnalyzer; } });
var summarizer_1 = require("./summarizer");
Object.defineProperty(exports, "Summarizer", { enumerable: true, get: function () { return summarizer_1.Summarizer; } });
var structure_detector_1 = require("./structure-detector");
Object.defineProperty(exports, "StructureDetector", { enumerable: true, get: function () { return structure_detector_1.StructureDetector; } });
var chapter_splitter_1 = require("./chapter-splitter");
Object.defineProperty(exports, "ChapterSplitter", { enumerable: true, get: function () { return chapter_splitter_1.ChapterSplitter; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7R0FTRzs7O0FBRUgsT0FBTztBQUNQLHVDQUE0QztBQUFuQywyR0FBQSxlQUFlLE9BQUE7QUFDeEIsMkNBQXlDO0FBQWhDLHdHQUFBLFVBQVUsT0FBQTtBQUNuQiwyREFBd0Q7QUFBL0MsdUhBQUEsaUJBQWlCLE9BQUE7QUFDMUIsdURBQW9EO0FBQTNDLG1IQUFBLGVBQWUsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGRvYzJib29rL3VuZGVyc3RhbmRpbmdcbiAqIOWGheWuueeQhuino+aooeWdlyAtIOexu+S8vCBHb29nbGUgTm90ZWJvb2tMTSDnmoTmt7HluqblhoXlrrnnkIbop6NcbiAqXG4gKiDlip/og73vvJpcbiAqIC0g5YaF5a655YiG5p6Q77ya55CG6Kej5paH5qGj55qE5qC45b+D5Li76aKY5ZKM6K6654K5XG4gKiAtIOaRmOimgeeUn+aIkO+8mueUn+aIkOaWh+aho+aRmOimgVxuICogLSDnu5PmnoTor4bliKvvvJror4bliKvmlofmoaPnu5PmnoRcbiAqIC0g56ug6IqC5YiG5Ymy77ya5pm66IO95YiG5Ymy56ug6IqCXG4gKi9cblxuLy8g5qC45b+D5Yqf6IO9XG5leHBvcnQgeyBDb250ZW50QW5hbHl6ZXIgfSBmcm9tICcuL2FuYWx5emVyJ1xuZXhwb3J0IHsgU3VtbWFyaXplciB9IGZyb20gJy4vc3VtbWFyaXplcidcbmV4cG9ydCB7IFN0cnVjdHVyZURldGVjdG9yIH0gZnJvbSAnLi9zdHJ1Y3R1cmUtZGV0ZWN0b3InXG5leHBvcnQgeyBDaGFwdGVyU3BsaXR0ZXIgfSBmcm9tICcuL2NoYXB0ZXItc3BsaXR0ZXInXG5cbi8vIOexu+Wei1xuZXhwb3J0IHR5cGUge1xuICBBbmFseXNpc1Jlc3VsdCxcbiAgU3VtbWFyeVJlc3VsdCxcbiAgU3RydWN0dXJlUmVzdWx0LFxuICBDaGFwdGVyU3BsaXRSZXN1bHQsXG4gIERvY3VtZW50VGhlbWUsXG4gIEtleVBvaW50LFxufSBmcm9tICcuL3R5cGVzJ1xuIl19