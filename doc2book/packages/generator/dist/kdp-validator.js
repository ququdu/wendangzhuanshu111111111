"use strict";
/**
 * KDP 验证器
 * 验证生成的电子书是否符合亚马逊 KDP 标准
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KdpValidator = void 0;
/**
 * KDP 规范要求
 */
const KDP_REQUIREMENTS = {
    // 封面要求
    cover: {
        minWidth: 625,
        maxWidth: 10000,
        minHeight: 1000,
        maxHeight: 10000,
        aspectRatioMin: 1.6,
        aspectRatioMax: 1.6,
        maxFileSize: 50 * 1024 * 1024, // 50MB
    },
    // 内容要求
    content: {
        minWordCount: 2500,
        maxFileSize: 650 * 1024 * 1024, // 650MB
    },
    // 元数据要求
    metadata: {
        titleMaxLength: 200,
        subtitleMaxLength: 200,
        descriptionMinLength: 150,
        descriptionMaxLength: 4000,
        keywordsMax: 7,
    },
};
/**
 * KDP 验证器类
 */
class KdpValidator {
    /**
     * 验证书籍结构
     */
    validate(book) {
        const errors = [];
        const warnings = [];
        // 验证元数据
        this.validateMetadata(book, errors, warnings);
        // 验证内容
        this.validateContent(book, errors, warnings);
        // 验证结构
        this.validateStructure(book, errors, warnings);
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * 验证 EPUB 文件
     */
    async validateEpub(epubPath) {
        const errors = [];
        const warnings = [];
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const stats = await fs.stat(epubPath);
            // 检查文件大小
            if (stats.size > KDP_REQUIREMENTS.content.maxFileSize) {
                errors.push({
                    code: 'FILE_TOO_LARGE',
                    message: `EPUB 文件大小 (${Math.round(stats.size / 1024 / 1024)}MB) 超过 KDP 限制 (650MB)`,
                    suggestion: '压缩图片或减少内容',
                });
            }
            // TODO: 解压 EPUB 并验证内部结构
            // - 检查 mimetype 文件
            // - 验证 container.xml
            // - 验证 content.opf
            // - 检查所有引用的资源是否存在
        }
        catch (error) {
            errors.push({
                code: 'FILE_READ_ERROR',
                message: error instanceof Error ? error.message : '无法读取 EPUB 文件',
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * 验证封面图片
     */
    async validateCover(coverPath) {
        const errors = [];
        const warnings = [];
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const stats = await fs.stat(coverPath);
            // 检查文件大小
            if (stats.size > KDP_REQUIREMENTS.cover.maxFileSize) {
                errors.push({
                    code: 'COVER_TOO_LARGE',
                    message: `封面文件大小 (${Math.round(stats.size / 1024 / 1024)}MB) 超过限制 (50MB)`,
                    suggestion: '压缩封面图片',
                });
            }
            // TODO: 使用图像处理库检查尺寸
            // - 检查宽度和高度
            // - 检查宽高比
            // - 检查颜色模式（应为 RGB）
        }
        catch (error) {
            errors.push({
                code: 'COVER_READ_ERROR',
                message: error instanceof Error ? error.message : '无法读取封面文件',
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * 验证元数据
     */
    validateMetadata(book, errors, warnings) {
        const { metadata } = book;
        // 标题
        if (!metadata.title || metadata.title.trim().length === 0) {
            errors.push({
                code: 'MISSING_TITLE',
                message: '缺少书籍标题',
                location: 'metadata.title',
            });
        }
        else if (metadata.title.length > KDP_REQUIREMENTS.metadata.titleMaxLength) {
            errors.push({
                code: 'TITLE_TOO_LONG',
                message: `标题长度 (${metadata.title.length}) 超过限制 (${KDP_REQUIREMENTS.metadata.titleMaxLength})`,
                location: 'metadata.title',
                suggestion: '缩短标题',
            });
        }
        // 作者
        if (!metadata.author || metadata.author.trim().length === 0) {
            errors.push({
                code: 'MISSING_AUTHOR',
                message: '缺少作者信息',
                location: 'metadata.author',
            });
        }
        // 描述
        if (!metadata.description || metadata.description.trim().length === 0) {
            warnings.push({
                code: 'MISSING_DESCRIPTION',
                message: '缺少书籍描述',
                location: 'metadata.description',
                suggestion: '添加书籍描述以提高可发现性',
            });
        }
        else {
            if (metadata.description.length < KDP_REQUIREMENTS.metadata.descriptionMinLength) {
                warnings.push({
                    code: 'DESCRIPTION_TOO_SHORT',
                    message: `描述长度 (${metadata.description.length}) 低于建议值 (${KDP_REQUIREMENTS.metadata.descriptionMinLength})`,
                    location: 'metadata.description',
                    suggestion: '扩展书籍描述',
                });
            }
            if (metadata.description.length > KDP_REQUIREMENTS.metadata.descriptionMaxLength) {
                errors.push({
                    code: 'DESCRIPTION_TOO_LONG',
                    message: `描述长度 (${metadata.description.length}) 超过限制 (${KDP_REQUIREMENTS.metadata.descriptionMaxLength})`,
                    location: 'metadata.description',
                    suggestion: '缩短书籍描述',
                });
            }
        }
        // 语言
        if (!metadata.language) {
            errors.push({
                code: 'MISSING_LANGUAGE',
                message: '缺少语言设置',
                location: 'metadata.language',
            });
        }
        // 关键词
        if (metadata.keywords && metadata.keywords.length > KDP_REQUIREMENTS.metadata.keywordsMax) {
            warnings.push({
                code: 'TOO_MANY_KEYWORDS',
                message: `关键词数量 (${metadata.keywords.length}) 超过建议值 (${KDP_REQUIREMENTS.metadata.keywordsMax})`,
                location: 'metadata.keywords',
                suggestion: '减少关键词数量',
            });
        }
        // 版权
        if (!metadata.copyright) {
            warnings.push({
                code: 'MISSING_COPYRIGHT',
                message: '缺少版权信息',
                location: 'metadata.copyright',
                suggestion: '添加版权声明',
            });
        }
    }
    /**
     * 验证内容
     */
    validateContent(book, errors, warnings) {
        // 计算总字数
        let totalWordCount = 0;
        for (const chapter of book.body.chapters) {
            totalWordCount += chapter.wordCount || 0;
            if (chapter.children) {
                for (const subChapter of chapter.children) {
                    totalWordCount += subChapter.wordCount || 0;
                }
            }
        }
        // 检查最小字数
        if (totalWordCount < KDP_REQUIREMENTS.content.minWordCount) {
            warnings.push({
                code: 'LOW_WORD_COUNT',
                message: `总字数 (${totalWordCount}) 低于建议值 (${KDP_REQUIREMENTS.content.minWordCount})`,
                suggestion: '增加内容以提高书籍质量',
            });
        }
        // 检查空章节
        for (const chapter of book.body.chapters) {
            if (!chapter.content || chapter.content.length === 0) {
                warnings.push({
                    code: 'EMPTY_CHAPTER',
                    message: `章节 "${chapter.title}" 没有内容`,
                    location: `chapter.${chapter.id}`,
                    suggestion: '添加章节内容或删除空章节',
                });
            }
        }
    }
    /**
     * 验证结构
     */
    validateStructure(book, errors, warnings) {
        // 检查是否有章节
        if (!book.body.chapters || book.body.chapters.length === 0) {
            errors.push({
                code: 'NO_CHAPTERS',
                message: '书籍没有章节',
                location: 'body.chapters',
            });
        }
        // 检查目录
        if (!book.frontMatter.tableOfContents || book.frontMatter.tableOfContents.length === 0) {
            warnings.push({
                code: 'NO_TOC',
                message: '缺少目录',
                location: 'frontMatter.tableOfContents',
                suggestion: '生成目录以改善导航体验',
            });
        }
        // 检查章节标题
        const titles = new Set();
        for (const chapter of book.body.chapters) {
            if (titles.has(chapter.title)) {
                warnings.push({
                    code: 'DUPLICATE_TITLE',
                    message: `重复的章节标题: "${chapter.title}"`,
                    location: `chapter.${chapter.id}`,
                    suggestion: '使用唯一的章节标题',
                });
            }
            titles.add(chapter.title);
        }
    }
    /**
     * 获取 KDP 要求
     */
    getRequirements() {
        return KDP_REQUIREMENTS;
    }
}
exports.KdpValidator = KdpValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2RwLXZhbGlkYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9rZHAtdmFsaWRhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtIOztHQUVHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixPQUFPO0lBQ1AsS0FBSyxFQUFFO1FBQ0wsUUFBUSxFQUFFLEdBQUc7UUFDYixRQUFRLEVBQUUsS0FBSztRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLEtBQUs7UUFDaEIsY0FBYyxFQUFFLEdBQUc7UUFDbkIsY0FBYyxFQUFFLEdBQUc7UUFDbkIsV0FBVyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFLE9BQU87S0FDdkM7SUFDRCxPQUFPO0lBQ1AsT0FBTyxFQUFFO1FBQ1AsWUFBWSxFQUFFLElBQUk7UUFDbEIsV0FBVyxFQUFFLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFLFFBQVE7S0FDekM7SUFDRCxRQUFRO0lBQ1IsUUFBUSxFQUFFO1FBQ1IsY0FBYyxFQUFFLEdBQUc7UUFDbkIsaUJBQWlCLEVBQUUsR0FBRztRQUN0QixvQkFBb0IsRUFBRSxHQUFHO1FBQ3pCLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsV0FBVyxFQUFFLENBQUM7S0FDZjtDQUNGLENBQUE7QUFFRDs7R0FFRztBQUNILE1BQWEsWUFBWTtJQUN2Qjs7T0FFRztJQUNILFFBQVEsQ0FBQyxJQUFtQjtRQUMxQixNQUFNLE1BQU0sR0FBc0IsRUFBRSxDQUFBO1FBQ3BDLE1BQU0sUUFBUSxHQUF3QixFQUFFLENBQUE7UUFFeEMsUUFBUTtRQUNSLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTdDLE9BQU87UUFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxNQUFN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Q2pCLFFBQVEsRUFBRSxlQUFlO2FBQzFCLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxPQUFPO1FBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2RixRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNaLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxNQUFNO2dCQUNmLFFBQVEsRUFBRSw2QkFBNkI7Z0JBQ3ZDLFVBQVUsRUFBRSxhQUFhO2FBQzFCLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxTQUFTO1FBQ1QsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUNoQyxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNaLElBQUksRUFBRSxpQkFBaUI7b0JBQ3ZCLE9BQU8sRUFBRSxhQUFhLE9BQU8sQ0FBQyxLQUFLLEdBQUc7b0JBQ3RDLFFBQVEsRUFBRSxXQUFXLE9BQU8sQ0FBQyxFQUFFLEVBQUU7b0JBQ2pDLFVBQVUsRUFBRSxXQUFXO2lCQUN4QixDQUFDLENBQUE7WUFDSixDQUFDO1lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWU7UUFDYixPQUFPLGdCQUFnQixDQUFBO0lBQ3pCLENBQUM7Q0FDRjtBQWpTRCxvQ0FpU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEtEUCDpqozor4HlmahcbiAqIOmqjOivgeeUn+aIkOeahOeUteWtkOS5puaYr+WQpuespuWQiOS6mumprOmAiiBLRFAg5qCH5YeGXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBCb29rU3RydWN0dXJlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgVmFsaWRhdGlvblJlc3VsdCwgVmFsaWRhdGlvbkVycm9yLCBWYWxpZGF0aW9uV2FybmluZyB9IGZyb20gJy4vdHlwZXMnXG5cbi8qKlxuICogS0RQIOinhOiMg+imgeaxglxuICovXG5jb25zdCBLRFBfUkVRVUlSRU1FTlRTID0ge1xuICAvLyDlsIHpnaLopoHmsYJcbiAgY292ZXI6IHtcbiAgICBtaW5XaWR0aDogNjI1LFxuICAgIG1heFdpZHRoOiAxMDAwMCxcbiAgICBtaW5IZWlnaHQ6IDEwMDAsXG4gICAgbWF4SGVpZ2h0OiAxMDAwMCxcbiAgICBhc3BlY3RSYXRpb01pbjogMS42LFxuICAgIGFzcGVjdFJhdGlvTWF4OiAxLjYsXG4gICAgbWF4RmlsZVNpemU6IDUwICogMTAyNCAqIDEwMjQsIC8vIDUwTUJcbiAgfSxcbiAgLy8g5YaF5a656KaB5rGCXG4gIGNvbnRlbnQ6IHtcbiAgICBtaW5Xb3JkQ291bnQ6IDI1MDAsXG4gICAgbWF4RmlsZVNpemU6IDY1MCAqIDEwMjQgKiAxMDI0LCAvLyA2NTBNQlxuICB9LFxuICAvLyDlhYPmlbDmja7opoHmsYJcbiAgbWV0YWRhdGE6IHtcbiAgICB0aXRsZU1heExlbmd0aDogMjAwLFxuICAgIHN1YnRpdGxlTWF4TGVuZ3RoOiAyMDAsXG4gICAgZGVzY3JpcHRpb25NaW5MZW5ndGg6IDE1MCxcbiAgICBkZXNjcmlwdGlvbk1heExlbmd0aDogNDAwMCxcbiAgICBrZXl3b3Jkc01heDogNyxcbiAgfSxcbn1cblxuLyoqXG4gKiBLRFAg6aqM6K+B5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBLZHBWYWxpZGF0b3Ige1xuICAvKipcbiAgICog6aqM6K+B5Lmm57GN57uT5p6EXG4gICAqL1xuICB2YWxpZGF0ZShib29rOiBCb29rU3RydWN0dXJlKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgY29uc3QgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSA9IFtdXG4gICAgY29uc3Qgd2FybmluZ3M6IFZhbGlkYXRpb25XYXJuaW5nW10gPSBbXVxuXG4gICAgLy8g6aqM6K+B5YWD5pWw5o2uXG4gICAgdGhpcy52YWxpZGF0ZU1ldGFkYXRhKGJvb2ssIGVycm9ycywgd2FybmluZ3MpXG5cbiAgICAvLyDpqozor4HlhoXlrrlcbiAgICB0aGlzLnZhbGlkYXRlQ29udGVudChib29rLCBlcnJvcnMsIHdhcm5pbmdzKVxuXG4gICAgLy8g6aqM6K+B57uT5p6EXG4gICAgdGhpcy52YWxpZGF0ZVN0cnVjdHVyZShib29rLCBlcnJvcnMsIHdhcm5pbmdzKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxuICAgICAgZXJyb3JzLFxuICAgICAgd2FybmluZ3MsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOmqjOivgSBFUFVCIOaWh+S7tlxuICAgKi9cbiAgYXN5bmMgdmFsaWRhdGVFcHViKFxuICAgIGVwdWJQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxWYWxpZGF0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSA9IFtdXG4gICAgY29uc3Qgd2FybmluZ3M6IFZhbGlkYXRpb25XYXJuaW5nW10gPSBbXVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZzID0gYXdhaXQgaW1wb3J0KCdmcy9wcm9taXNlcycpXG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQoZXB1YlBhdGgpXG5cbiAgICAgIC8vIOajgOafpeaWh+S7tuWkp+Wwj1xuICAgICAgaWYgKHN0YXRzLnNpemUgPiBLRFBfUkVRVUlSRU1FTlRTLmNvbnRlbnQubWF4RmlsZVNpemUpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgIGNvZGU6ICdGSUxFX1RPT19MQVJHRScsXG4gICAgICAgICAgbWVzc2FnZTogYEVQVUIg5paH5Lu25aSn5bCPICgke01hdGgucm91bmQoc3RhdHMuc2l6ZSAvIDEwMjQgLyAxMDI0KX1NQikg6LaF6L+HIEtEUCDpmZDliLYgKDY1ME1CKWAsXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ+WOi+e8qeWbvueJh+aIluWHj+WwkeWGheWuuScsXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE86IOino+WOiyBFUFVCIOW5tumqjOivgeWGhemDqOe7k+aehFxuICAgICAgLy8gLSDmo4Dmn6UgbWltZXR5cGUg5paH5Lu2XG4gICAgICAvLyAtIOmqjOivgSBjb250YWluZXIueG1sXG4gICAgICAvLyAtIOmqjOivgSBjb250ZW50Lm9wZlxuICAgICAgLy8gLSDmo4Dmn6XmiYDmnInlvJXnlKjnmoTotYTmupDmmK/lkKblrZjlnKhcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGNvZGU6ICdGSUxFX1JFQURfRVJST1InLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfml6Dms5Xor7vlj5YgRVBVQiDmlofku7YnLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgICBlcnJvcnMsXG4gICAgICB3YXJuaW5ncyxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6aqM6K+B5bCB6Z2i5Zu+54mHXG4gICAqL1xuICBhc3luYyB2YWxpZGF0ZUNvdmVyKFxuICAgIGNvdmVyUGF0aDogc3RyaW5nXG4gICk6IFByb21pc2U8VmFsaWRhdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IGVycm9yczogVmFsaWRhdGlvbkVycm9yW10gPSBbXVxuICAgIGNvbnN0IHdhcm5pbmdzOiBWYWxpZGF0aW9uV2FybmluZ1tdID0gW11cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBmcyA9IGF3YWl0IGltcG9ydCgnZnMvcHJvbWlzZXMnKVxuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5zdGF0KGNvdmVyUGF0aClcblxuICAgICAgLy8g5qOA5p+l5paH5Lu25aSn5bCPXG4gICAgICBpZiAoc3RhdHMuc2l6ZSA+IEtEUF9SRVFVSVJFTUVOVFMuY292ZXIubWF4RmlsZVNpemUpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgIGNvZGU6ICdDT1ZFUl9UT09fTEFSR0UnLFxuICAgICAgICAgIG1lc3NhZ2U6IGDlsIHpnaLmlofku7blpKflsI8gKCR7TWF0aC5yb3VuZChzdGF0cy5zaXplIC8gMTAyNCAvIDEwMjQpfU1CKSDotoXov4fpmZDliLYgKDUwTUIpYCxcbiAgICAgICAgICBzdWdnZXN0aW9uOiAn5Y6L57yp5bCB6Z2i5Zu+54mHJyxcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETzog5L2/55So5Zu+5YOP5aSE55CG5bqT5qOA5p+l5bC65a+4XG4gICAgICAvLyAtIOajgOafpeWuveW6puWSjOmrmOW6plxuICAgICAgLy8gLSDmo4Dmn6Xlrr3pq5jmr5RcbiAgICAgIC8vIC0g5qOA5p+l6aKc6Imy5qih5byP77yI5bqU5Li6IFJHQu+8iVxuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgY29kZTogJ0NPVkVSX1JFQURfRVJST1InLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfml6Dms5Xor7vlj5blsIHpnaLmlofku7YnLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgICBlcnJvcnMsXG4gICAgICB3YXJuaW5ncyxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6aqM6K+B5YWD5pWw5o2uXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlTWV0YWRhdGEoXG4gICAgYm9vazogQm9va1N0cnVjdHVyZSxcbiAgICBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdLFxuICAgIHdhcm5pbmdzOiBWYWxpZGF0aW9uV2FybmluZ1tdXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHsgbWV0YWRhdGEgfSA9IGJvb2tcblxuICAgIC8vIOagh+mimFxuICAgIGlmICghbWV0YWRhdGEudGl0bGUgfHwgbWV0YWRhdGEudGl0bGUudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBjb2RlOiAnTUlTU0lOR19USVRMRScsXG4gICAgICAgIG1lc3NhZ2U6ICfnvLrlsJHkuabnsY3moIfpopgnLFxuICAgICAgICBsb2NhdGlvbjogJ21ldGFkYXRhLnRpdGxlJyxcbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmIChtZXRhZGF0YS50aXRsZS5sZW5ndGggPiBLRFBfUkVRVUlSRU1FTlRTLm1ldGFkYXRhLnRpdGxlTWF4TGVuZ3RoKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGNvZGU6ICdUSVRMRV9UT09fTE9ORycsXG4gICAgICAgIG1lc3NhZ2U6IGDmoIfpopjplb/luqYgKCR7bWV0YWRhdGEudGl0bGUubGVuZ3RofSkg6LaF6L+H6ZmQ5Yi2ICgke0tEUF9SRVFVSVJFTUVOVFMubWV0YWRhdGEudGl0bGVNYXhMZW5ndGh9KWAsXG4gICAgICAgIGxvY2F0aW9uOiAnbWV0YWRhdGEudGl0bGUnLFxuICAgICAgICBzdWdnZXN0aW9uOiAn57yp55+t5qCH6aKYJyxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8g5L2c6ICFXG4gICAgaWYgKCFtZXRhZGF0YS5hdXRob3IgfHwgbWV0YWRhdGEuYXV0aG9yLnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgY29kZTogJ01JU1NJTkdfQVVUSE9SJyxcbiAgICAgICAgbWVzc2FnZTogJ+e8uuWwkeS9nOiAheS/oeaBrycsXG4gICAgICAgIGxvY2F0aW9uOiAnbWV0YWRhdGEuYXV0aG9yJyxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8g5o+P6L+wXG4gICAgaWYgKCFtZXRhZGF0YS5kZXNjcmlwdGlvbiB8fCBtZXRhZGF0YS5kZXNjcmlwdGlvbi50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKHtcbiAgICAgICAgY29kZTogJ01JU1NJTkdfREVTQ1JJUFRJT04nLFxuICAgICAgICBtZXNzYWdlOiAn57y65bCR5Lmm57GN5o+P6L+wJyxcbiAgICAgICAgbG9jYXRpb246ICdtZXRhZGF0YS5kZXNjcmlwdGlvbicsXG4gICAgICAgIHN1Z2dlc3Rpb246ICfmt7vliqDkuabnsY3mj4/ov7Dku6Xmj5Dpq5jlj6/lj5HnjrDmgKcnLFxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1ldGFkYXRhLmRlc2NyaXB0aW9uLmxlbmd0aCA8IEtEUF9SRVFVSVJFTUVOVFMubWV0YWRhdGEuZGVzY3JpcHRpb25NaW5MZW5ndGgpIHtcbiAgICAgICAgd2FybmluZ3MucHVzaCh7XG4gICAgICAgICAgY29kZTogJ0RFU0NSSVBUSU9OX1RPT19TSE9SVCcsXG4gICAgICAgICAgbWVzc2FnZTogYOaPj+i/sOmVv+W6piAoJHttZXRhZGF0YS5kZXNjcmlwdGlvbi5sZW5ndGh9KSDkvY7kuo7lu7rorq7lgLwgKCR7S0RQX1JFUVVJUkVNRU5UUy5tZXRhZGF0YS5kZXNjcmlwdGlvbk1pbkxlbmd0aH0pYCxcbiAgICAgICAgICBsb2NhdGlvbjogJ21ldGFkYXRhLmRlc2NyaXB0aW9uJyxcbiAgICAgICAgICBzdWdnZXN0aW9uOiAn5omp5bGV5Lmm57GN5o+P6L+wJyxcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGlmIChtZXRhZGF0YS5kZXNjcmlwdGlvbi5sZW5ndGggPiBLRFBfUkVRVUlSRU1FTlRTLm1ldGFkYXRhLmRlc2NyaXB0aW9uTWF4TGVuZ3RoKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICBjb2RlOiAnREVTQ1JJUFRJT05fVE9PX0xPTkcnLFxuICAgICAgICAgIG1lc3NhZ2U6IGDmj4/ov7Dplb/luqYgKCR7bWV0YWRhdGEuZGVzY3JpcHRpb24ubGVuZ3RofSkg6LaF6L+H6ZmQ5Yi2ICgke0tEUF9SRVFVSVJFTUVOVFMubWV0YWRhdGEuZGVzY3JpcHRpb25NYXhMZW5ndGh9KWAsXG4gICAgICAgICAgbG9jYXRpb246ICdtZXRhZGF0YS5kZXNjcmlwdGlvbicsXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ+e8qeefreS5puexjeaPj+i/sCcsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g6K+t6KiAXG4gICAgaWYgKCFtZXRhZGF0YS5sYW5ndWFnZSkge1xuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBjb2RlOiAnTUlTU0lOR19MQU5HVUFHRScsXG4gICAgICAgIG1lc3NhZ2U6ICfnvLrlsJHor63oqIDorr7nva4nLFxuICAgICAgICBsb2NhdGlvbjogJ21ldGFkYXRhLmxhbmd1YWdlJyxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8g5YWz6ZSu6K+NXG4gICAgaWYgKG1ldGFkYXRhLmtleXdvcmRzICYmIG1ldGFkYXRhLmtleXdvcmRzLmxlbmd0aCA+IEtEUF9SRVFVSVJFTUVOVFMubWV0YWRhdGEua2V5d29yZHNNYXgpIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goe1xuICAgICAgICBjb2RlOiAnVE9PX01BTllfS0VZV09SRFMnLFxuICAgICAgICBtZXNzYWdlOiBg5YWz6ZSu6K+N5pWw6YePICgke21ldGFkYXRhLmtleXdvcmRzLmxlbmd0aH0pIOi2hei/h+W7uuiuruWAvCAoJHtLRFBfUkVRVUlSRU1FTlRTLm1ldGFkYXRhLmtleXdvcmRzTWF4fSlgLFxuICAgICAgICBsb2NhdGlvbjogJ21ldGFkYXRhLmtleXdvcmRzJyxcbiAgICAgICAgc3VnZ2VzdGlvbjogJ+WHj+WwkeWFs+mUruivjeaVsOmHjycsXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIOeJiOadg1xuICAgIGlmICghbWV0YWRhdGEuY29weXJpZ2h0KSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKHtcbiAgICAgICAgY29kZTogJ01JU1NJTkdfQ09QWVJJR0hUJyxcbiAgICAgICAgbWVzc2FnZTogJ+e8uuWwkeeJiOadg+S/oeaBrycsXG4gICAgICAgIGxvY2F0aW9uOiAnbWV0YWRhdGEuY29weXJpZ2h0JyxcbiAgICAgICAgc3VnZ2VzdGlvbjogJ+a3u+WKoOeJiOadg+WjsOaYjicsXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDpqozor4HlhoXlrrlcbiAgICovXG4gIHByaXZhdGUgdmFsaWRhdGVDb250ZW50KFxuICAgIGJvb2s6IEJvb2tTdHJ1Y3R1cmUsXG4gICAgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSxcbiAgICB3YXJuaW5nczogVmFsaWRhdGlvbldhcm5pbmdbXVxuICApOiB2b2lkIHtcbiAgICAvLyDorqHnrpfmgLvlrZfmlbBcbiAgICBsZXQgdG90YWxXb3JkQ291bnQgPSAwXG5cbiAgICBmb3IgKGNvbnN0IGNoYXB0ZXIgb2YgYm9vay5ib2R5LmNoYXB0ZXJzKSB7XG4gICAgICB0b3RhbFdvcmRDb3VudCArPSBjaGFwdGVyLndvcmRDb3VudCB8fCAwXG4gICAgICBpZiAoY2hhcHRlci5jaGlsZHJlbikge1xuICAgICAgICBmb3IgKGNvbnN0IHN1YkNoYXB0ZXIgb2YgY2hhcHRlci5jaGlsZHJlbikge1xuICAgICAgICAgIHRvdGFsV29yZENvdW50ICs9IHN1YkNoYXB0ZXIud29yZENvdW50IHx8IDBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOajgOafpeacgOWwj+Wtl+aVsFxuICAgIGlmICh0b3RhbFdvcmRDb3VudCA8IEtEUF9SRVFVSVJFTUVOVFMuY29udGVudC5taW5Xb3JkQ291bnQpIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goe1xuICAgICAgICBjb2RlOiAnTE9XX1dPUkRfQ09VTlQnLFxuICAgICAgICBtZXNzYWdlOiBg5oC75a2X5pWwICgke3RvdGFsV29yZENvdW50fSkg5L2O5LqO5bu66K6u5YC8ICgke0tEUF9SRVFVSVJFTUVOVFMuY29udGVudC5taW5Xb3JkQ291bnR9KWAsXG4gICAgICAgIHN1Z2dlc3Rpb246ICflop7liqDlhoXlrrnku6Xmj5Dpq5jkuabnsY3otKjph48nLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyDmo4Dmn6Xnqbrnq6DoioJcbiAgICBmb3IgKGNvbnN0IGNoYXB0ZXIgb2YgYm9vay5ib2R5LmNoYXB0ZXJzKSB7XG4gICAgICBpZiAoIWNoYXB0ZXIuY29udGVudCB8fCBjaGFwdGVyLmNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHdhcm5pbmdzLnB1c2goe1xuICAgICAgICAgIGNvZGU6ICdFTVBUWV9DSEFQVEVSJyxcbiAgICAgICAgICBtZXNzYWdlOiBg56ug6IqCIFwiJHtjaGFwdGVyLnRpdGxlfVwiIOayoeacieWGheWuuWAsXG4gICAgICAgICAgbG9jYXRpb246IGBjaGFwdGVyLiR7Y2hhcHRlci5pZH1gLFxuICAgICAgICAgIHN1Z2dlc3Rpb246ICfmt7vliqDnq6DoioLlhoXlrrnmiJbliKDpmaTnqbrnq6DoioInLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDpqozor4Hnu5PmnoRcbiAgICovXG4gIHByaXZhdGUgdmFsaWRhdGVTdHJ1Y3R1cmUoXG4gICAgYm9vazogQm9va1N0cnVjdHVyZSxcbiAgICBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdLFxuICAgIHdhcm5pbmdzOiBWYWxpZGF0aW9uV2FybmluZ1tdXG4gICk6IHZvaWQge1xuICAgIC8vIOajgOafpeaYr+WQpuacieeroOiKglxuICAgIGlmICghYm9vay5ib2R5LmNoYXB0ZXJzIHx8IGJvb2suYm9keS5jaGFwdGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgY29kZTogJ05PX0NIQVBURVJTJyxcbiAgICAgICAgbWVzc2FnZTogJ+S5puexjeayoeacieeroOiKgicsXG4gICAgICAgIGxvY2F0aW9uOiAnYm9keS5jaGFwdGVycycsXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIOajgOafpeebruW9lVxuICAgIGlmICghYm9vay5mcm9udE1hdHRlci50YWJsZU9mQ29udGVudHMgfHwgYm9vay5mcm9udE1hdHRlci50YWJsZU9mQ29udGVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKHtcbiAgICAgICAgY29kZTogJ05PX1RPQycsXG4gICAgICAgIG1lc3NhZ2U6ICfnvLrlsJHnm67lvZUnLFxuICAgICAgICBsb2NhdGlvbjogJ2Zyb250TWF0dGVyLnRhYmxlT2ZDb250ZW50cycsXG4gICAgICAgIHN1Z2dlc3Rpb246ICfnlJ/miJDnm67lvZXku6XmlLnlloTlr7zoiKrkvZPpqownLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyDmo4Dmn6Xnq6DoioLmoIfpophcbiAgICBjb25zdCB0aXRsZXMgPSBuZXcgU2V0PHN0cmluZz4oKVxuICAgIGZvciAoY29uc3QgY2hhcHRlciBvZiBib29rLmJvZHkuY2hhcHRlcnMpIHtcbiAgICAgIGlmICh0aXRsZXMuaGFzKGNoYXB0ZXIudGl0bGUpKSB7XG4gICAgICAgIHdhcm5pbmdzLnB1c2goe1xuICAgICAgICAgIGNvZGU6ICdEVVBMSUNBVEVfVElUTEUnLFxuICAgICAgICAgIG1lc3NhZ2U6IGDph43lpI3nmoTnq6DoioLmoIfpopg6IFwiJHtjaGFwdGVyLnRpdGxlfVwiYCxcbiAgICAgICAgICBsb2NhdGlvbjogYGNoYXB0ZXIuJHtjaGFwdGVyLmlkfWAsXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ+S9v+eUqOWUr+S4gOeahOeroOiKguagh+mimCcsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICB0aXRsZXMuYWRkKGNoYXB0ZXIudGl0bGUpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBLRFAg6KaB5rGCXG4gICAqL1xuICBnZXRSZXF1aXJlbWVudHMoKTogdHlwZW9mIEtEUF9SRVFVSVJFTUVOVFMge1xuICAgIHJldHVybiBLRFBfUkVRVUlSRU1FTlRTXG4gIH1cbn1cbiJdfQ==