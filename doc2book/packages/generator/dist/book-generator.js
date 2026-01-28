"use strict";
/**
 * 统一书籍生成器
 * 整合所有生成功能
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
exports.BookGenerator = void 0;
exports.createBookGenerator = createBookGenerator;
const epub_generator_1 = require("./epub-generator");
const pdf_generator_1 = require("./pdf-generator");
const toc_generator_1 = require("./toc-generator");
const cover_generator_1 = require("./cover-generator");
const kdp_validator_1 = require("./kdp-validator");
const path = __importStar(require("path"));
/**
 * 书籍生成器类
 */
class BookGenerator {
    epubGenerator;
    pdfGenerator;
    tocGenerator;
    coverGenerator;
    kdpValidator;
    constructor() {
        this.epubGenerator = new epub_generator_1.EpubGenerator();
        this.pdfGenerator = new pdf_generator_1.PdfGenerator();
        this.tocGenerator = new toc_generator_1.TocGenerator();
        this.coverGenerator = new cover_generator_1.CoverGenerator();
        this.kdpValidator = new kdp_validator_1.KdpValidator();
    }
    /**
     * 生成书籍
     */
    async generate(book, options) {
        const startTime = Date.now();
        const files = [];
        let validation;
        try {
            // 确保输出目录存在
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.mkdir(options.outputDir, { recursive: true });
            // 生成目录（如果没有）
            if (!book.frontMatter.tableOfContents || book.frontMatter.tableOfContents.length === 0) {
                book.frontMatter.tableOfContents = this.tocGenerator.generate(book);
            }
            // KDP 验证
            if (options.validateKdp) {
                validation = this.kdpValidator.validate(book);
                if (!validation.valid) {
                    console.warn('KDP 验证发现问题:', validation.errors);
                }
            }
            // 生成 EPUB
            if (options.format === 'epub' || options.format === 'both') {
                const epubPath = path.join(options.outputDir, `${options.filename}.epub`);
                const epubResult = await this.epubGenerator.generate(book, epubPath);
                if (epubResult.success) {
                    files.push({
                        format: 'epub',
                        path: epubPath,
                        size: epubResult.size || 0,
                    });
                }
                else {
                    throw new Error(`EPUB 生成失败: ${epubResult.error}`);
                }
            }
            // 生成 PDF
            if (options.format === 'pdf' || options.format === 'both') {
                const pdfPath = path.join(options.outputDir, `${options.filename}.pdf`);
                const pdfResult = await this.pdfGenerator.generate(book, pdfPath);
                if (pdfResult.success) {
                    files.push({
                        format: 'pdf',
                        path: pdfPath,
                        size: pdfResult.size || 0,
                    });
                }
                else {
                    throw new Error(`PDF 生成失败: ${pdfResult.error}`);
                }
            }
            return {
                success: true,
                files,
                validation,
                generationTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '生成失败',
                files,
                validation,
                generationTime: Date.now() - startTime,
            };
        }
    }
    /**
     * 生成封面
     */
    async generateCover(book, outputPath) {
        return this.coverGenerator.generate({
            title: book.metadata.title,
            subtitle: book.metadata.subtitle,
            author: book.metadata.author,
        }, outputPath);
    }
    /**
     * 验证书籍
     */
    validate(book) {
        return this.kdpValidator.validate(book);
    }
    /**
     * 验证 EPUB 文件
     */
    async validateEpub(epubPath) {
        return this.kdpValidator.validateEpub(epubPath);
    }
    /**
     * 获取 EPUB 生成器
     */
    getEpubGenerator() {
        return this.epubGenerator;
    }
    /**
     * 获取 PDF 生成器
     */
    getPdfGenerator() {
        return this.pdfGenerator;
    }
    /**
     * 获取目录生成器
     */
    getTocGenerator() {
        return this.tocGenerator;
    }
    /**
     * 获取封面生成器
     */
    getCoverGenerator() {
        return this.coverGenerator;
    }
    /**
     * 获取 KDP 验证器
     */
    getKdpValidator() {
        return this.kdpValidator;
    }
}
exports.BookGenerator = BookGenerator;
/**
 * 创建书籍生成器实例
 */
function createBookGenerator() {
    return new BookGenerator();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vay1nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYm9vay1nZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUxILGtEQUVDO0FBL0tELHFEQUFnRDtBQUNoRCxtREFBOEM7QUFDOUMsbURBQThDO0FBQzlDLHVEQUFrRDtBQUNsRCxtREFBOEM7QUFDOUMsMkNBQTRCO0FBRTVCOztHQUVHO0FBQ0gsTUFBYSxhQUFhO0lBQ2hCLGFBQWEsQ0FBZTtJQUM1QixZQUFZLENBQWM7SUFDMUIsWUFBWSxDQUFjO0lBQzFCLGNBQWMsQ0FBZ0I7SUFDOUIsWUFBWSxDQUFjO0lBRWxDO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLDhCQUFhLEVBQUUsQ0FBQTtRQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksNEJBQVksRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSw0QkFBWSxFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksNEJBQVksRUFBRSxDQUFBO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxRQUFRLENBQ1osSUFBbUIsRUFDbkIsT0FBeUI7UUFFekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzVCLE1BQU0sS0FBSyxHQUE2QixFQUFFLENBQUE7UUFDMUMsSUFBSSxVQUF3QyxDQUFBO1FBRTVDLElBQUksQ0FBQztZQUNILFdBQVc7WUFDWCxNQUFNLEVBQUUsR0FBRyx3REFBYSxhQUFhLEdBQUMsQ0FBQTtZQUN0QyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFB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QkFBbUI7SUFDakMsT0FBTyxJQUFJLGFBQWEsRUFBRSxDQUFBO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOe7n+S4gOS5puexjeeUn+aIkOWZqFxuICog5pW05ZCI5omA5pyJ55Sf5oiQ5Yqf6IO9XG4gKi9cblxuaW1wb3J0IHR5cGUgeyBCb29rU3RydWN0dXJlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgR2VuZXJhdG9yT3B0aW9ucywgR2VuZXJhdG9yUmVzdWx0LCBWYWxpZGF0aW9uUmVzdWx0IH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCB7IEVwdWJHZW5lcmF0b3IgfSBmcm9tICcuL2VwdWItZ2VuZXJhdG9yJ1xuaW1wb3J0IHsgUGRmR2VuZXJhdG9yIH0gZnJvbSAnLi9wZGYtZ2VuZXJhdG9yJ1xuaW1wb3J0IHsgVG9jR2VuZXJhdG9yIH0gZnJvbSAnLi90b2MtZ2VuZXJhdG9yJ1xuaW1wb3J0IHsgQ292ZXJHZW5lcmF0b3IgfSBmcm9tICcuL2NvdmVyLWdlbmVyYXRvcidcbmltcG9ydCB7IEtkcFZhbGlkYXRvciB9IGZyb20gJy4va2RwLXZhbGlkYXRvcidcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuLyoqXG4gKiDkuabnsY3nlJ/miJDlmajnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIEJvb2tHZW5lcmF0b3Ige1xuICBwcml2YXRlIGVwdWJHZW5lcmF0b3I6IEVwdWJHZW5lcmF0b3JcbiAgcHJpdmF0ZSBwZGZHZW5lcmF0b3I6IFBkZkdlbmVyYXRvclxuICBwcml2YXRlIHRvY0dlbmVyYXRvcjogVG9jR2VuZXJhdG9yXG4gIHByaXZhdGUgY292ZXJHZW5lcmF0b3I6IENvdmVyR2VuZXJhdG9yXG4gIHByaXZhdGUga2RwVmFsaWRhdG9yOiBLZHBWYWxpZGF0b3JcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmVwdWJHZW5lcmF0b3IgPSBuZXcgRXB1YkdlbmVyYXRvcigpXG4gICAgdGhpcy5wZGZHZW5lcmF0b3IgPSBuZXcgUGRmR2VuZXJhdG9yKClcbiAgICB0aGlzLnRvY0dlbmVyYXRvciA9IG5ldyBUb2NHZW5lcmF0b3IoKVxuICAgIHRoaXMuY292ZXJHZW5lcmF0b3IgPSBuZXcgQ292ZXJHZW5lcmF0b3IoKVxuICAgIHRoaXMua2RwVmFsaWRhdG9yID0gbmV3IEtkcFZhbGlkYXRvcigpXG4gIH1cblxuICAvKipcbiAgICog55Sf5oiQ5Lmm57GNXG4gICAqL1xuICBhc3luYyBnZW5lcmF0ZShcbiAgICBib29rOiBCb29rU3RydWN0dXJlLFxuICAgIG9wdGlvbnM6IEdlbmVyYXRvck9wdGlvbnNcbiAgKTogUHJvbWlzZTxHZW5lcmF0b3JSZXN1bHQ+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG4gICAgY29uc3QgZmlsZXM6IEdlbmVyYXRvclJlc3VsdFsnZmlsZXMnXSA9IFtdXG4gICAgbGV0IHZhbGlkYXRpb246IFZhbGlkYXRpb25SZXN1bHQgfCB1bmRlZmluZWRcblxuICAgIHRyeSB7XG4gICAgICAvLyDnoa7kv53ovpPlh7rnm67lvZXlrZjlnKhcbiAgICAgIGNvbnN0IGZzID0gYXdhaXQgaW1wb3J0KCdmcy9wcm9taXNlcycpXG4gICAgICBhd2FpdCBmcy5ta2RpcihvcHRpb25zLm91dHB1dERpciwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuICAgICAgLy8g55Sf5oiQ55uu5b2V77yI5aaC5p6c5rKh5pyJ77yJXG4gICAgICBpZiAoIWJvb2suZnJvbnRNYXR0ZXIudGFibGVPZkNvbnRlbnRzIHx8IGJvb2suZnJvbnRNYXR0ZXIudGFibGVPZkNvbnRlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBib29rLmZyb250TWF0dGVyLnRhYmxlT2ZDb250ZW50cyA9IHRoaXMudG9jR2VuZXJhdG9yLmdlbmVyYXRlKGJvb2spXG4gICAgICB9XG5cbiAgICAgIC8vIEtEUCDpqozor4FcbiAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRlS2RwKSB7XG4gICAgICAgIHZhbGlkYXRpb24gPSB0aGlzLmtkcFZhbGlkYXRvci52YWxpZGF0ZShib29rKVxuICAgICAgICBpZiAoIXZhbGlkYXRpb24udmFsaWQpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0tEUCDpqozor4Hlj5HnjrDpl67popg6JywgdmFsaWRhdGlvbi5lcnJvcnMpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8g55Sf5oiQIEVQVUJcbiAgICAgIGlmIChvcHRpb25zLmZvcm1hdCA9PT0gJ2VwdWInIHx8IG9wdGlvbnMuZm9ybWF0ID09PSAnYm90aCcpIHtcbiAgICAgICAgY29uc3QgZXB1YlBhdGggPSBwYXRoLmpvaW4ob3B0aW9ucy5vdXRwdXREaXIsIGAke29wdGlvbnMuZmlsZW5hbWV9LmVwdWJgKVxuICAgICAgICBjb25zdCBlcHViUmVzdWx0ID0gYXdhaXQgdGhpcy5lcHViR2VuZXJhdG9yLmdlbmVyYXRlKGJvb2ssIGVwdWJQYXRoKVxuXG4gICAgICAgIGlmIChlcHViUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICBmaWxlcy5wdXNoKHtcbiAgICAgICAgICAgIGZvcm1hdDogJ2VwdWInLFxuICAgICAgICAgICAgcGF0aDogZXB1YlBhdGgsXG4gICAgICAgICAgICBzaXplOiBlcHViUmVzdWx0LnNpemUgfHwgMCxcbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRVBVQiDnlJ/miJDlpLHotKU6ICR7ZXB1YlJlc3VsdC5lcnJvcn1gKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIOeUn+aIkCBQREZcbiAgICAgIGlmIChvcHRpb25zLmZvcm1hdCA9PT0gJ3BkZicgfHwgb3B0aW9ucy5mb3JtYXQgPT09ICdib3RoJykge1xuICAgICAgICBjb25zdCBwZGZQYXRoID0gcGF0aC5qb2luKG9wdGlvbnMub3V0cHV0RGlyLCBgJHtvcHRpb25zLmZpbGVuYW1lfS5wZGZgKVxuICAgICAgICBjb25zdCBwZGZSZXN1bHQgPSBhd2FpdCB0aGlzLnBkZkdlbmVyYXRvci5nZW5lcmF0ZShib29rLCBwZGZQYXRoKVxuXG4gICAgICAgIGlmIChwZGZSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgIGZpbGVzLnB1c2goe1xuICAgICAgICAgICAgZm9ybWF0OiAncGRmJyxcbiAgICAgICAgICAgIHBhdGg6IHBkZlBhdGgsXG4gICAgICAgICAgICBzaXplOiBwZGZSZXN1bHQuc2l6ZSB8fCAwLFxuICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQREYg55Sf5oiQ5aSx6LSlOiAke3BkZlJlc3VsdC5lcnJvcn1gKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGZpbGVzLFxuICAgICAgICB2YWxpZGF0aW9uLFxuICAgICAgICBnZW5lcmF0aW9uVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfnlJ/miJDlpLHotKUnLFxuICAgICAgICBmaWxlcyxcbiAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgZ2VuZXJhdGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOWwgemdolxuICAgKi9cbiAgYXN5bmMgZ2VuZXJhdGVDb3ZlcihcbiAgICBib29rOiBCb29rU3RydWN0dXJlLFxuICAgIG91dHB1dFBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICAgIHJldHVybiB0aGlzLmNvdmVyR2VuZXJhdG9yLmdlbmVyYXRlKFxuICAgICAge1xuICAgICAgICB0aXRsZTogYm9vay5tZXRhZGF0YS50aXRsZSxcbiAgICAgICAgc3VidGl0bGU6IGJvb2subWV0YWRhdGEuc3VidGl0bGUsXG4gICAgICAgIGF1dGhvcjogYm9vay5tZXRhZGF0YS5hdXRob3IsXG4gICAgICB9LFxuICAgICAgb3V0cHV0UGF0aFxuICAgIClcbiAgfVxuXG4gIC8qKlxuICAgKiDpqozor4HkuabnsY1cbiAgICovXG4gIHZhbGlkYXRlKGJvb2s6IEJvb2tTdHJ1Y3R1cmUpOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICByZXR1cm4gdGhpcy5rZHBWYWxpZGF0b3IudmFsaWRhdGUoYm9vaylcbiAgfVxuXG4gIC8qKlxuICAgKiDpqozor4EgRVBVQiDmlofku7ZcbiAgICovXG4gIGFzeW5jIHZhbGlkYXRlRXB1YihlcHViUGF0aDogc3RyaW5nKTogUHJvbWlzZTxWYWxpZGF0aW9uUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMua2RwVmFsaWRhdG9yLnZhbGlkYXRlRXB1YihlcHViUGF0aClcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5YgRVBVQiDnlJ/miJDlmahcbiAgICovXG4gIGdldEVwdWJHZW5lcmF0b3IoKTogRXB1YkdlbmVyYXRvciB7XG4gICAgcmV0dXJuIHRoaXMuZXB1YkdlbmVyYXRvclxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBQREYg55Sf5oiQ5ZmoXG4gICAqL1xuICBnZXRQZGZHZW5lcmF0b3IoKTogUGRmR2VuZXJhdG9yIHtcbiAgICByZXR1cm4gdGhpcy5wZGZHZW5lcmF0b3JcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bnm67lvZXnlJ/miJDlmahcbiAgICovXG4gIGdldFRvY0dlbmVyYXRvcigpOiBUb2NHZW5lcmF0b3Ige1xuICAgIHJldHVybiB0aGlzLnRvY0dlbmVyYXRvclxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluWwgemdoueUn+aIkOWZqFxuICAgKi9cbiAgZ2V0Q292ZXJHZW5lcmF0b3IoKTogQ292ZXJHZW5lcmF0b3Ige1xuICAgIHJldHVybiB0aGlzLmNvdmVyR2VuZXJhdG9yXG4gIH1cblxuICAvKipcbiAgICog6I635Y+WIEtEUCDpqozor4HlmahcbiAgICovXG4gIGdldEtkcFZhbGlkYXRvcigpOiBLZHBWYWxpZGF0b3Ige1xuICAgIHJldHVybiB0aGlzLmtkcFZhbGlkYXRvclxuICB9XG59XG5cbi8qKlxuICog5Yib5bu65Lmm57GN55Sf5oiQ5Zmo5a6e5L6LXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCb29rR2VuZXJhdG9yKCk6IEJvb2tHZW5lcmF0b3Ige1xuICByZXR1cm4gbmV3IEJvb2tHZW5lcmF0b3IoKVxufVxuIl19