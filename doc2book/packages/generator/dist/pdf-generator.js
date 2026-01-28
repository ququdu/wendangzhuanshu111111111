"use strict";
/**
 * PDF 生成器
 * 生成符合打印标准的 PDF 文件
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfGenerator = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * 页面尺寸配置
 */
const PAGE_SIZES = {
    letter: [612, 792],
    a4: [595.28, 841.89],
    '6x9': [432, 648],
    '5.5x8.5': [396, 612],
};
/**
 * PDF 生成器类
 */
class PdfGenerator {
    options;
    constructor(options) {
        this.options = {
            pageSize: '6x9',
            margins: { top: 72, bottom: 72, left: 72, right: 72 },
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: 'Helvetica',
            headerFooter: true,
            tocPageNumbers: true,
            pageNumbers: true,
            pageNumberPosition: 'bottom',
            bookmarks: true,
            ...options,
        };
    }
    /**
     * 生成 PDF
     */
    async generate(book, outputPath) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const { PassThrough } = await Promise.resolve().then(() => __importStar(require('stream')));
            // 获取页面尺寸
            const pageSize = PAGE_SIZES[this.options.pageSize] || PAGE_SIZES['6x9'];
            // 创建 PDF 文档
            const doc = new pdfkit_1.default({
                size: pageSize,
                margins: this.options.margins,
                bufferPages: true,
                info: {
                    Title: book.metadata.title,
                    Author: book.metadata.author,
                    Subject: book.metadata.description,
                    Creator: 'Doc2Book',
                },
            });
            // 创建写入流
            const writeStream = fs.createWriteStream(outputPath);
            doc.pipe(writeStream);
            // 生成内容
            await this.generateContent(doc, book);
            // 添加页码
            if (this.options.pageNumbers) {
                this.addPageNumbers(doc);
            }
            // 完成文档
            doc.end();
            // 等待写入完成
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            const stats = fs.statSync(outputPath);
            return {
                success: true,
                size: stats.size,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '生成 PDF 失败',
            };
        }
    }
    /**
     * 生成内容
     */
    async generateContent(doc, book) {
        // 标题页
        this.generateTitlePage(doc, book);
        // 版权页
        if (book.frontMatter.copyright) {
            this.generateCopyrightPage(doc, book);
        }
        // 目录
        if (book.frontMatter.tableOfContents.length > 0) {
            this.generateTableOfContents(doc, book);
        }
        // 前言
        if (book.frontMatter.preface) {
            this.generateChapter(doc, book.frontMatter.preface);
        }
        // 正文章节
        for (const chapter of book.body.chapters) {
            this.generateChapter(doc, chapter);
            // 子章节
            if (chapter.children) {
                for (const subChapter of chapter.children) {
                    this.generateChapter(doc, subChapter);
                }
            }
        }
        // 附录
        for (const appendix of book.backMatter.appendices) {
            this.generateChapter(doc, appendix);
        }
    }
    /**
     * 生成标题页
     */
    generateTitlePage(doc, book) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        // 标题
        doc.fontSize(28)
            .font('Helvetica-Bold')
            .text(book.metadata.title, 0, pageHeight / 3, {
            align: 'center',
            width: pageWidth,
        });
        // 副标题
        if (book.metadata.subtitle) {
            doc.moveDown()
                .fontSize(18)
                .font('Helvetica')
                .text(book.metadata.subtitle, 0, doc.y, {
                align: 'center',
                width: pageWidth,
            });
        }
        // 作者
        doc.moveDown(4)
            .fontSize(16)
            .font('Helvetica')
            .text(book.metadata.author, 0, doc.y, {
            align: 'center',
            width: pageWidth,
        });
        doc.addPage();
    }
    /**
     * 生成版权页
     */
    generateCopyrightPage(doc, book) {
        doc.fontSize(10)
            .font('Helvetica');
        // 版权信息
        doc.text(book.metadata.copyright, {
            align: 'center',
        });
        doc.moveDown(2);
        // ISBN
        if (book.metadata.isbn) {
            doc.text(`ISBN: ${book.metadata.isbn}`);
        }
        if (book.metadata.isbnEbook) {
            doc.text(`ISBN (电子版): ${book.metadata.isbnEbook}`);
        }
        // 出版信息
        if (book.metadata.publisher) {
            doc.moveDown()
                .text(`出版: ${book.metadata.publisher}`);
        }
        if (book.metadata.publishDate) {
            doc.text(`出版日期: ${book.metadata.publishDate.toLocaleDateString()}`);
        }
        doc.addPage();
    }
    /**
     * 生成目录
     */
    generateTableOfContents(doc, book) {
        doc.fontSize(20)
            .font('Helvetica-Bold')
            .text('目录', { align: 'center' });
        doc.moveDown(2)
            .fontSize(this.options.fontSize)
            .font('Helvetica');
        for (const entry of book.frontMatter.tableOfContents) {
            const indent = (entry.level - 1) * 20;
            const pageNum = entry.page ? entry.page.toString() : '';
            doc.text(entry.title, this.options.margins.left + indent, doc.y, {
                continued: true,
                width: doc.page.width - this.options.margins.left - this.options.margins.right - indent - 30,
            });
            if (this.options.tocPageNumbers && pageNum) {
                doc.text(pageNum, { align: 'right' });
            }
            else {
                doc.text('');
            }
            // 子目录
            if (entry.children) {
                for (const child of entry.children) {
                    const childIndent = entry.level * 20;
                    const childPageNum = child.page ? child.page.toString() : '';
                    doc.text(child.title, this.options.margins.left + childIndent, doc.y, {
                        continued: true,
                        width: doc.page.width - this.options.margins.left - this.options.margins.right - childIndent - 30,
                    });
                    if (this.options.tocPageNumbers && childPageNum) {
                        doc.text(childPageNum, { align: 'right' });
                    }
                    else {
                        doc.text('');
                    }
                }
            }
        }
        doc.addPage();
    }
    /**
     * 生成章节
     */
    generateChapter(doc, chapter) {
        // 章节标题
        const titleSize = chapter.level === 1 ? 24 : chapter.level === 2 ? 18 : 14;
        doc.fontSize(titleSize)
            .font('Helvetica-Bold')
            .text(chapter.title, { align: chapter.level === 1 ? 'center' : 'left' });
        // 添加书签
        if (this.options.bookmarks) {
            doc.outline.addItem(chapter.title);
        }
        doc.moveDown()
            .fontSize(this.options.fontSize)
            .font('Helvetica');
        // 章节内容
        for (const node of chapter.content) {
            this.renderNode(doc, node);
        }
        // 章节结束后换页
        if (chapter.level === 1) {
            doc.addPage();
        }
    }
    /**
     * 渲染内容节点
     */
    renderNode(doc, node) {
        switch (node.type) {
            case 'heading':
                const level = node.level || 2;
                const size = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 14 : 12;
                doc.moveDown()
                    .fontSize(size)
                    .font('Helvetica-Bold')
                    .text(node.text || '')
                    .fontSize(this.options.fontSize)
                    .font('Helvetica');
                break;
            case 'paragraph':
                doc.moveDown(0.5)
                    .text(node.text || '', {
                    align: 'justify',
                    indent: 20,
                    lineGap: (this.options.lineHeight - 1) * this.options.fontSize,
                });
                break;
            case 'list':
                doc.moveDown(0.5);
                if (node.children) {
                    const ordered = node.attributes?.ordered;
                    node.children.forEach((item, index) => {
                        const bullet = ordered ? `${index + 1}.` : '•';
                        doc.text(`${bullet} ${item.text || ''}`, {
                            indent: 20,
                        });
                    });
                }
                break;
            case 'blockquote':
                doc.moveDown(0.5)
                    .font('Helvetica-Oblique')
                    .text(node.text || '', {
                    indent: 40,
                })
                    .font('Helvetica');
                break;
            case 'code':
                doc.moveDown(0.5)
                    .font('Courier')
                    .fontSize(this.options.fontSize - 1)
                    .text(node.text || '', {
                    indent: 20,
                })
                    .font('Helvetica')
                    .fontSize(this.options.fontSize);
                break;
            case 'table':
                this.renderTable(doc, node);
                break;
            default:
                if (node.text) {
                    doc.text(node.text);
                }
        }
    }
    /**
     * 渲染表格
     */
    renderTable(doc, node) {
        if (!node.children || node.children.length === 0)
            return;
        doc.moveDown();
        const tableWidth = doc.page.width - this.options.margins.left - this.options.margins.right;
        const rows = node.children;
        const colCount = rows[0]?.children?.length || 1;
        const colWidth = tableWidth / colCount;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const isHeader = node.attributes?.hasHeader && i === 0;
            const startY = doc.y;
            if (row.children) {
                let maxHeight = 0;
                // 计算行高
                for (let j = 0; j < row.children.length; j++) {
                    const cell = row.children[j];
                    const cellHeight = doc.heightOfString(cell.text || '', {
                        width: colWidth - 10,
                    });
                    maxHeight = Math.max(maxHeight, cellHeight + 10);
                }
                // 绘制单元格
                for (let j = 0; j < row.children.length; j++) {
                    const cell = row.children[j];
                    const x = this.options.margins.left + j * colWidth;
                    // 绘制边框
                    doc.rect(x, startY, colWidth, maxHeight).stroke();
                    // 绘制文本
                    if (isHeader) {
                        doc.font('Helvetica-Bold');
                    }
                    doc.text(cell.text || '', x + 5, startY + 5, {
                        width: colWidth - 10,
                    });
                    if (isHeader) {
                        doc.font('Helvetica');
                    }
                }
                doc.y = startY + maxHeight;
            }
        }
        doc.moveDown();
    }
    /**
     * 添加页码
     */
    addPageNumbers(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            const pageNum = i + 1;
            const y = this.options.pageNumberPosition === 'top'
                ? this.options.margins.top / 2
                : doc.page.height - this.options.margins.bottom / 2;
            doc.fontSize(10)
                .text(pageNum.toString(), 0, y, {
                align: 'center',
                width: doc.page.width,
            });
        }
    }
}
exports.PdfGenerator = PdfGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRmLWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wZGYtZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILG9EQUFnQztBQUloQzs7R0FFRztBQUNILE1BQU0sVUFBVSxHQUFxQztJQUNuRCxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0lBQ2xCLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFDcEIsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztJQUNqQixTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO0NBQ3RCLENBQUE7QUFFRDs7R0FFRztBQUNILE1BQWEsWUFBWTtJQUNmLE9BQU8sQ0FBWTtJQUUzQixZQUFZLE9BQTZCO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUc7WUFDYixRQUFRLEVBQUUsS0FBSztZQUNmLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDckQsUUFBUSxFQUFFLEVBQUU7WUFDWixVQUFVLEVBQUUsR0FBRztZQUNmLFVBQVUsRUFBRSxXQUFXO1lBQ3ZCLFlBQVksRUFBRSxJQUFJO1lBQ2xCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLGtCQUFrQixFQUFFLFFBQVE7WUFDNUIsU0FBUyxFQUFFLElBQUk7WUFDZixHQUFHLE9BQU87U0FDWCxDQUFBO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFFBQVEsQ0FDWixJQUFtQixFQUNuQixVQUFrQjtRQUVsQixJQUFJLENBQUM7WUFDSCxNQUFNLEVBQUUsR0FBRyx3REFBYSxJQUFJLEdBQUMs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QUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEtBQUssS0FBSztnQkFDakQsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUM5QixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUVyRCxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztpQkFDYixJQUFJLENBQ0gsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUNsQixDQUFDLEVBQ0QsQ0FBQyxFQUNEO2dCQUNFLEtBQUssRUFBRSxRQUFRO2dCQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUs7YUFDdEIsQ0FDRixDQUFBO1FBQ0wsQ0FBQztJQUNILENBQUM7Q0FDRjtBQTFhRCxvQ0EwYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFBERiDnlJ/miJDlmahcbiAqIOeUn+aIkOespuWQiOaJk+WNsOagh+WHhueahCBQREYg5paH5Lu2XG4gKi9cblxuaW1wb3J0IFBERkRvY3VtZW50IGZyb20gJ3BkZmtpdCdcbmltcG9ydCB0eXBlIHsgQm9va1N0cnVjdHVyZSwgQ2hhcHRlciwgQ29udGVudE5vZGUgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUgeyBQZGZPcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiDpobXpnaLlsLrlr7jphY3nva5cbiAqL1xuY29uc3QgUEFHRV9TSVpFUzogUmVjb3JkPHN0cmluZywgW251bWJlciwgbnVtYmVyXT4gPSB7XG4gIGxldHRlcjogWzYxMiwgNzkyXSxcbiAgYTQ6IFs1OTUuMjgsIDg0MS44OV0sXG4gICc2eDknOiBbNDMyLCA2NDhdLFxuICAnNS41eDguNSc6IFszOTYsIDYxMl0sXG59XG5cbi8qKlxuICogUERGIOeUn+aIkOWZqOexu1xuICovXG5leHBvcnQgY2xhc3MgUGRmR2VuZXJhdG9yIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBQZGZPcHRpb25zXG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IFBhcnRpYWw8UGRmT3B0aW9ucz4pIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICBwYWdlU2l6ZTogJzZ4OScsXG4gICAgICBtYXJnaW5zOiB7IHRvcDogNzIsIGJvdHRvbTogNzIsIGxlZnQ6IDcyLCByaWdodDogNzIgfSxcbiAgICAgIGZvbnRTaXplOiAxMSxcbiAgICAgIGxpbmVIZWlnaHQ6IDEuNSxcbiAgICAgIGZvbnRGYW1pbHk6ICdIZWx2ZXRpY2EnLFxuICAgICAgaGVhZGVyRm9vdGVyOiB0cnVlLFxuICAgICAgdG9jUGFnZU51bWJlcnM6IHRydWUsXG4gICAgICBwYWdlTnVtYmVyczogdHJ1ZSxcbiAgICAgIHBhZ2VOdW1iZXJQb3NpdGlvbjogJ2JvdHRvbScsXG4gICAgICBib29rbWFya3M6IHRydWUsXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJAgUERGXG4gICAqL1xuICBhc3luYyBnZW5lcmF0ZShcbiAgICBib29rOiBCb29rU3RydWN0dXJlLFxuICAgIG91dHB1dFBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZXJyb3I/OiBzdHJpbmc7IHNpemU/OiBudW1iZXIgfT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBmcyA9IGF3YWl0IGltcG9ydCgnZnMnKVxuICAgICAgY29uc3QgeyBQYXNzVGhyb3VnaCB9ID0gYXdhaXQgaW1wb3J0KCdzdHJlYW0nKVxuXG4gICAgICAvLyDojrflj5bpobXpnaLlsLrlr7hcbiAgICAgIGNvbnN0IHBhZ2VTaXplID0gUEFHRV9TSVpFU1t0aGlzLm9wdGlvbnMucGFnZVNpemVdIHx8IFBBR0VfU0laRVNbJzZ4OSddXG5cbiAgICAgIC8vIOWIm+W7uiBQREYg5paH5qGjXG4gICAgICBjb25zdCBkb2MgPSBuZXcgUERGRG9jdW1lbnQoe1xuICAgICAgICBzaXplOiBwYWdlU2l6ZSxcbiAgICAgICAgbWFyZ2luczogdGhpcy5vcHRpb25zLm1hcmdpbnMsXG4gICAgICAgIGJ1ZmZlclBhZ2VzOiB0cnVlLFxuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgVGl0bGU6IGJvb2subWV0YWRhdGEudGl0bGUsXG4gICAgICAgICAgQXV0aG9yOiBib29rLm1ldGFkYXRhLmF1dGhvcixcbiAgICAgICAgICBTdWJqZWN0OiBib29rLm1ldGFkYXRhLmRlc2NyaXB0aW9uLFxuICAgICAgICAgIENyZWF0b3I6ICdEb2MyQm9vaycsXG4gICAgICAgIH0sXG4gICAgICB9KVxuXG4gICAgICAvLyDliJvlu7rlhpnlhaXmtYFcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcbiAgICAgIGRvYy5waXBlKHdyaXRlU3RyZWFtKVxuXG4gICAgICAvLyDnlJ/miJDlhoXlrrlcbiAgICAgIGF3YWl0IHRoaXMuZ2VuZXJhdGVDb250ZW50KGRvYywgYm9vaylcblxuICAgICAgLy8g5re75Yqg6aG156CBXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnBhZ2VOdW1iZXJzKSB7XG4gICAgICAgIHRoaXMuYWRkUGFnZU51bWJlcnMoZG9jKVxuICAgICAgfVxuXG4gICAgICAvLyDlrozmiJDmlofmoaNcbiAgICAgIGRvYy5lbmQoKVxuXG4gICAgICAvLyDnrYnlvoXlhpnlhaXlrozmiJBcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgd3JpdGVTdHJlYW0ub24oJ2ZpbmlzaCcsIHJlc29sdmUpXG4gICAgICAgIHdyaXRlU3RyZWFtLm9uKCdlcnJvcicsIHJlamVjdClcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMob3V0cHV0UGF0aClcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgc2l6ZTogc3RhdHMuc2l6ZSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfnlJ/miJAgUERGIOWksei0pScsXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOWGheWuuVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUNvbnRlbnQoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGJvb2s6IEJvb2tTdHJ1Y3R1cmUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyDmoIfpopjpobVcbiAgICB0aGlzLmdlbmVyYXRlVGl0bGVQYWdlKGRvYywgYm9vaylcblxuICAgIC8vIOeJiOadg+mhtVxuICAgIGlmIChib29rLmZyb250TWF0dGVyLmNvcHlyaWdodCkge1xuICAgICAgdGhpcy5nZW5lcmF0ZUNvcHlyaWdodFBhZ2UoZG9jLCBib29rKVxuICAgIH1cblxuICAgIC8vIOebruW9lVxuICAgIGlmIChib29rLmZyb250TWF0dGVyLnRhYmxlT2ZDb250ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlVGFibGVPZkNvbnRlbnRzKGRvYywgYm9vaylcbiAgICB9XG5cbiAgICAvLyDliY3oqIBcbiAgICBpZiAoYm9vay5mcm9udE1hdHRlci5wcmVmYWNlKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlQ2hhcHRlcihkb2MsIGJvb2suZnJvbnRNYXR0ZXIucHJlZmFjZSlcbiAgICB9XG5cbiAgICAvLyDmraPmlofnq6DoioJcbiAgICBmb3IgKGNvbnN0IGNoYXB0ZXIgb2YgYm9vay5ib2R5LmNoYXB0ZXJzKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlQ2hhcHRlcihkb2MsIGNoYXB0ZXIpXG5cbiAgICAgIC8vIOWtkOeroOiKglxuICAgICAgaWYgKGNoYXB0ZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgZm9yIChjb25zdCBzdWJDaGFwdGVyIG9mIGNoYXB0ZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgICB0aGlzLmdlbmVyYXRlQ2hhcHRlcihkb2MsIHN1YkNoYXB0ZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDpmYTlvZVcbiAgICBmb3IgKGNvbnN0IGFwcGVuZGl4IG9mIGJvb2suYmFja01hdHRlci5hcHBlbmRpY2VzKSB7XG4gICAgICB0aGlzLmdlbmVyYXRlQ2hhcHRlcihkb2MsIGFwcGVuZGl4KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDmoIfpopjpobVcbiAgICovXG4gIHByaXZhdGUgZ2VuZXJhdGVUaXRsZVBhZ2UoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGJvb2s6IEJvb2tTdHJ1Y3R1cmUpOiB2b2lkIHtcbiAgICBjb25zdCBwYWdlV2lkdGggPSBkb2MucGFnZS53aWR0aFxuICAgIGNvbnN0IHBhZ2VIZWlnaHQgPSBkb2MucGFnZS5oZWlnaHRcblxuICAgIC8vIOagh+mimFxuICAgIGRvYy5mb250U2l6ZSgyOClcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EtQm9sZCcpXG4gICAgICAudGV4dChib29rLm1ldGFkYXRhLnRpdGxlLCAwLCBwYWdlSGVpZ2h0IC8gMywge1xuICAgICAgICBhbGlnbjogJ2NlbnRlcicsXG4gICAgICAgIHdpZHRoOiBwYWdlV2lkdGgsXG4gICAgICB9KVxuXG4gICAgLy8g5Ymv5qCH6aKYXG4gICAgaWYgKGJvb2subWV0YWRhdGEuc3VidGl0bGUpIHtcbiAgICAgIGRvYy5tb3ZlRG93bigpXG4gICAgICAgIC5mb250U2l6ZSgxOClcbiAgICAgICAgLmZvbnQoJ0hlbHZldGljYScpXG4gICAgICAgIC50ZXh0KGJvb2subWV0YWRhdGEuc3VidGl0bGUsIDAsIGRvYy55LCB7XG4gICAgICAgICAgYWxpZ246ICdjZW50ZXInLFxuICAgICAgICAgIHdpZHRoOiBwYWdlV2lkdGgsXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8g5L2c6ICFXG4gICAgZG9jLm1vdmVEb3duKDQpXG4gICAgICAuZm9udFNpemUoMTYpXG4gICAgICAuZm9udCgnSGVsdmV0aWNhJylcbiAgICAgIC50ZXh0KGJvb2subWV0YWRhdGEuYXV0aG9yLCAwLCBkb2MueSwge1xuICAgICAgICBhbGlnbjogJ2NlbnRlcicsXG4gICAgICAgIHdpZHRoOiBwYWdlV2lkdGgsXG4gICAgICB9KVxuXG4gICAgZG9jLmFkZFBhZ2UoKVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOeJiOadg+mhtVxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvcHlyaWdodFBhZ2UoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGJvb2s6IEJvb2tTdHJ1Y3R1cmUpOiB2b2lkIHtcbiAgICBkb2MuZm9udFNpemUoMTApXG4gICAgICAuZm9udCgnSGVsdmV0aWNhJylcblxuICAgIC8vIOeJiOadg+S/oeaBr1xuICAgIGRvYy50ZXh0KGJvb2subWV0YWRhdGEuY29weXJpZ2h0LCB7XG4gICAgICBhbGlnbjogJ2NlbnRlcicsXG4gICAgfSlcblxuICAgIGRvYy5tb3ZlRG93bigyKVxuXG4gICAgLy8gSVNCTlxuICAgIGlmIChib29rLm1ldGFkYXRhLmlzYm4pIHtcbiAgICAgIGRvYy50ZXh0KGBJU0JOOiAke2Jvb2subWV0YWRhdGEuaXNibn1gKVxuICAgIH1cbiAgICBpZiAoYm9vay5tZXRhZGF0YS5pc2JuRWJvb2spIHtcbiAgICAgIGRvYy50ZXh0KGBJU0JOICjnlLXlrZDniYgpOiAke2Jvb2subWV0YWRhdGEuaXNibkVib29rfWApXG4gICAgfVxuXG4gICAgLy8g5Ye654mI5L+h5oGvXG4gICAgaWYgKGJvb2subWV0YWRhdGEucHVibGlzaGVyKSB7XG4gICAgICBkb2MubW92ZURvd24oKVxuICAgICAgICAudGV4dChg5Ye654mIOiAke2Jvb2subWV0YWRhdGEucHVibGlzaGVyfWApXG4gICAgfVxuXG4gICAgaWYgKGJvb2subWV0YWRhdGEucHVibGlzaERhdGUpIHtcbiAgICAgIGRvYy50ZXh0KGDlh7rniYjml6XmnJ86ICR7Ym9vay5tZXRhZGF0YS5wdWJsaXNoRGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoKX1gKVxuICAgIH1cblxuICAgIGRvYy5hZGRQYWdlKClcbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDnm67lvZVcbiAgICovXG4gIHByaXZhdGUgZ2VuZXJhdGVUYWJsZU9mQ29udGVudHMoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGJvb2s6IEJvb2tTdHJ1Y3R1cmUpOiB2b2lkIHtcbiAgICBkb2MuZm9udFNpemUoMjApXG4gICAgICAuZm9udCgnSGVsdmV0aWNhLUJvbGQnKVxuICAgICAgLnRleHQoJ+ebruW9lScsIHsgYWxpZ246ICdjZW50ZXInIH0pXG5cbiAgICBkb2MubW92ZURvd24oMilcbiAgICAgIC5mb250U2l6ZSh0aGlzLm9wdGlvbnMuZm9udFNpemUpXG4gICAgICAuZm9udCgnSGVsdmV0aWNhJylcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgYm9vay5mcm9udE1hdHRlci50YWJsZU9mQ29udGVudHMpIHtcbiAgICAgIGNvbnN0IGluZGVudCA9IChlbnRyeS5sZXZlbCAtIDEpICogMjBcbiAgICAgIGNvbnN0IHBhZ2VOdW0gPSBlbnRyeS5wYWdlID8gZW50cnkucGFnZS50b1N0cmluZygpIDogJydcblxuICAgICAgZG9jLnRleHQoZW50cnkudGl0bGUsIHRoaXMub3B0aW9ucy5tYXJnaW5zLmxlZnQgKyBpbmRlbnQsIGRvYy55LCB7XG4gICAgICAgIGNvbnRpbnVlZDogdHJ1ZSxcbiAgICAgICAgd2lkdGg6IGRvYy5wYWdlLndpZHRoIC0gdGhpcy5vcHRpb25zLm1hcmdpbnMubGVmdCAtIHRoaXMub3B0aW9ucy5tYXJnaW5zLnJpZ2h0IC0gaW5kZW50IC0gMzAsXG4gICAgICB9KVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnRvY1BhZ2VOdW1iZXJzICYmIHBhZ2VOdW0pIHtcbiAgICAgICAgZG9jLnRleHQocGFnZU51bSwgeyBhbGlnbjogJ3JpZ2h0JyB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jLnRleHQoJycpXG4gICAgICB9XG5cbiAgICAgIC8vIOWtkOebruW9lVxuICAgICAgaWYgKGVudHJ5LmNoaWxkcmVuKSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZW50cnkuY2hpbGRyZW4pIHtcbiAgICAgICAgICBjb25zdCBjaGlsZEluZGVudCA9IGVudHJ5LmxldmVsICogMjBcbiAgICAgICAgICBjb25zdCBjaGlsZFBhZ2VOdW0gPSBjaGlsZC5wYWdlID8gY2hpbGQucGFnZS50b1N0cmluZygpIDogJydcblxuICAgICAgICAgIGRvYy50ZXh0KGNoaWxkLnRpdGxlLCB0aGlzLm9wdGlvbnMubWFyZ2lucy5sZWZ0ICsgY2hpbGRJbmRlbnQsIGRvYy55LCB7XG4gICAgICAgICAgICBjb250aW51ZWQ6IHRydWUsXG4gICAgICAgICAgICB3aWR0aDogZG9jLnBhZ2Uud2lkdGggLSB0aGlzLm9wdGlvbnMubWFyZ2lucy5sZWZ0IC0gdGhpcy5vcHRpb25zLm1hcmdpbnMucmlnaHQgLSBjaGlsZEluZGVudCAtIDMwLFxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnRvY1BhZ2VOdW1iZXJzICYmIGNoaWxkUGFnZU51bSkge1xuICAgICAgICAgICAgZG9jLnRleHQoY2hpbGRQYWdlTnVtLCB7IGFsaWduOiAncmlnaHQnIH0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvYy50ZXh0KCcnKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGRvYy5hZGRQYWdlKClcbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDnq6DoioJcbiAgICovXG4gIHByaXZhdGUgZ2VuZXJhdGVDaGFwdGVyKGRvYzogUERGS2l0LlBERkRvY3VtZW50LCBjaGFwdGVyOiBDaGFwdGVyKTogdm9pZCB7XG4gICAgLy8g56ug6IqC5qCH6aKYXG4gICAgY29uc3QgdGl0bGVTaXplID0gY2hhcHRlci5sZXZlbCA9PT0gMSA/IDI0IDogY2hhcHRlci5sZXZlbCA9PT0gMiA/IDE4IDogMTRcbiAgICBkb2MuZm9udFNpemUodGl0bGVTaXplKVxuICAgICAgLmZvbnQoJ0hlbHZldGljYS1Cb2xkJylcbiAgICAgIC50ZXh0KGNoYXB0ZXIudGl0bGUsIHsgYWxpZ246IGNoYXB0ZXIubGV2ZWwgPT09IDEgPyAnY2VudGVyJyA6ICdsZWZ0JyB9KVxuXG4gICAgLy8g5re75Yqg5Lmm562+XG4gICAgaWYgKHRoaXMub3B0aW9ucy5ib29rbWFya3MpIHtcbiAgICAgIGRvYy5vdXRsaW5lLmFkZEl0ZW0oY2hhcHRlci50aXRsZSlcbiAgICB9XG5cbiAgICBkb2MubW92ZURvd24oKVxuICAgICAgLmZvbnRTaXplKHRoaXMub3B0aW9ucy5mb250U2l6ZSlcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EnKVxuXG4gICAgLy8g56ug6IqC5YaF5a65XG4gICAgZm9yIChjb25zdCBub2RlIG9mIGNoYXB0ZXIuY29udGVudCkge1xuICAgICAgdGhpcy5yZW5kZXJOb2RlKGRvYywgbm9kZSlcbiAgICB9XG5cbiAgICAvLyDnq6DoioLnu5PmnZ/lkI7mjaLpobVcbiAgICBpZiAoY2hhcHRlci5sZXZlbCA9PT0gMSkge1xuICAgICAgZG9jLmFkZFBhZ2UoKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmuLLmn5PlhoXlrrnoioLngrlcbiAgICovXG4gIHByaXZhdGUgcmVuZGVyTm9kZShkb2M6IFBERktpdC5QREZEb2N1bWVudCwgbm9kZTogQ29udGVudE5vZGUpOiB2b2lkIHtcbiAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgY2FzZSAnaGVhZGluZyc6XG4gICAgICAgIGNvbnN0IGxldmVsID0gbm9kZS5sZXZlbCB8fCAyXG4gICAgICAgIGNvbnN0IHNpemUgPSBsZXZlbCA9PT0gMSA/IDIwIDogbGV2ZWwgPT09IDIgPyAxNiA6IGxldmVsID09PSAzID8gMTQgOiAxMlxuICAgICAgICBkb2MubW92ZURvd24oKVxuICAgICAgICAgIC5mb250U2l6ZShzaXplKVxuICAgICAgICAgIC5mb250KCdIZWx2ZXRpY2EtQm9sZCcpXG4gICAgICAgICAgLnRleHQobm9kZS50ZXh0IHx8ICcnKVxuICAgICAgICAgIC5mb250U2l6ZSh0aGlzLm9wdGlvbnMuZm9udFNpemUpXG4gICAgICAgICAgLmZvbnQoJ0hlbHZldGljYScpXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ3BhcmFncmFwaCc6XG4gICAgICAgIGRvYy5tb3ZlRG93bigwLjUpXG4gICAgICAgICAgLnRleHQobm9kZS50ZXh0IHx8ICcnLCB7XG4gICAgICAgICAgICBhbGlnbjogJ2p1c3RpZnknLFxuICAgICAgICAgICAgaW5kZW50OiAyMCxcbiAgICAgICAgICAgIGxpbmVHYXA6ICh0aGlzLm9wdGlvbnMubGluZUhlaWdodCAtIDEpICogdGhpcy5vcHRpb25zLmZvbnRTaXplLFxuICAgICAgICAgIH0pXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICBkb2MubW92ZURvd24oMC41KVxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgIGNvbnN0IG9yZGVyZWQgPSBub2RlLmF0dHJpYnV0ZXM/Lm9yZGVyZWRcbiAgICAgICAgICBub2RlLmNoaWxkcmVuLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBidWxsZXQgPSBvcmRlcmVkID8gYCR7aW5kZXggKyAxfS5gIDogJ+KAoidcbiAgICAgICAgICAgIGRvYy50ZXh0KGAke2J1bGxldH0gJHtpdGVtLnRleHQgfHwgJyd9YCwge1xuICAgICAgICAgICAgICBpbmRlbnQ6IDIwLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ2Jsb2NrcXVvdGUnOlxuICAgICAgICBkb2MubW92ZURvd24oMC41KVxuICAgICAgICAgIC5mb250KCdIZWx2ZXRpY2EtT2JsaXF1ZScpXG4gICAgICAgICAgLnRleHQobm9kZS50ZXh0IHx8ICcnLCB7XG4gICAgICAgICAgICBpbmRlbnQ6IDQwLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZvbnQoJ0hlbHZldGljYScpXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ2NvZGUnOlxuICAgICAgICBkb2MubW92ZURvd24oMC41KVxuICAgICAgICAgIC5mb250KCdDb3VyaWVyJylcbiAgICAgICAgICAuZm9udFNpemUodGhpcy5vcHRpb25zLmZvbnRTaXplIC0gMSlcbiAgICAgICAgICAudGV4dChub2RlLnRleHQgfHwgJycsIHtcbiAgICAgICAgICAgIGluZGVudDogMjAsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZm9udCgnSGVsdmV0aWNhJylcbiAgICAgICAgICAuZm9udFNpemUodGhpcy5vcHRpb25zLmZvbnRTaXplKVxuICAgICAgICBicmVha1xuXG4gICAgICBjYXNlICd0YWJsZSc6XG4gICAgICAgIHRoaXMucmVuZGVyVGFibGUoZG9jLCBub2RlKVxuICAgICAgICBicmVha1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobm9kZS50ZXh0KSB7XG4gICAgICAgICAgZG9jLnRleHQobm9kZS50ZXh0KVxuICAgICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOa4suafk+ihqOagvFxuICAgKi9cbiAgcHJpdmF0ZSByZW5kZXJUYWJsZShkb2M6IFBERktpdC5QREZEb2N1bWVudCwgbm9kZTogQ29udGVudE5vZGUpOiB2b2lkIHtcbiAgICBpZiAoIW5vZGUuY2hpbGRyZW4gfHwgbm9kZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgZG9jLm1vdmVEb3duKClcblxuICAgIGNvbnN0IHRhYmxlV2lkdGggPSBkb2MucGFnZS53aWR0aCAtIHRoaXMub3B0aW9ucy5tYXJnaW5zLmxlZnQgLSB0aGlzLm9wdGlvbnMubWFyZ2lucy5yaWdodFxuICAgIGNvbnN0IHJvd3MgPSBub2RlLmNoaWxkcmVuXG4gICAgY29uc3QgY29sQ291bnQgPSByb3dzWzBdPy5jaGlsZHJlbj8ubGVuZ3RoIHx8IDFcbiAgICBjb25zdCBjb2xXaWR0aCA9IHRhYmxlV2lkdGggLyBjb2xDb3VudFxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByb3cgPSByb3dzW2ldXG4gICAgICBjb25zdCBpc0hlYWRlciA9IG5vZGUuYXR0cmlidXRlcz8uaGFzSGVhZGVyICYmIGkgPT09IDBcbiAgICAgIGNvbnN0IHN0YXJ0WSA9IGRvYy55XG5cbiAgICAgIGlmIChyb3cuY2hpbGRyZW4pIHtcbiAgICAgICAgbGV0IG1heEhlaWdodCA9IDBcblxuICAgICAgICAvLyDorqHnrpfooYzpq5hcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cuY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBjZWxsID0gcm93LmNoaWxkcmVuW2pdXG4gICAgICAgICAgY29uc3QgY2VsbEhlaWdodCA9IGRvYy5oZWlnaHRPZlN0cmluZyhjZWxsLnRleHQgfHwgJycsIHtcbiAgICAgICAgICAgIHdpZHRoOiBjb2xXaWR0aCAtIDEwLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgbWF4SGVpZ2h0ID0gTWF0aC5tYXgobWF4SGVpZ2h0LCBjZWxsSGVpZ2h0ICsgMTApXG4gICAgICAgIH1cblxuICAgICAgICAvLyDnu5jliLbljZXlhYPmoLxcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByb3cuY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCBjZWxsID0gcm93LmNoaWxkcmVuW2pdXG4gICAgICAgICAgY29uc3QgeCA9IHRoaXMub3B0aW9ucy5tYXJnaW5zLmxlZnQgKyBqICogY29sV2lkdGhcblxuICAgICAgICAgIC8vIOe7mOWItui+ueahhlxuICAgICAgICAgIGRvYy5yZWN0KHgsIHN0YXJ0WSwgY29sV2lkdGgsIG1heEhlaWdodCkuc3Ryb2tlKClcblxuICAgICAgICAgIC8vIOe7mOWItuaWh+acrFxuICAgICAgICAgIGlmIChpc0hlYWRlcikge1xuICAgICAgICAgICAgZG9jLmZvbnQoJ0hlbHZldGljYS1Cb2xkJylcbiAgICAgICAgICB9XG4gICAgICAgICAgZG9jLnRleHQoY2VsbC50ZXh0IHx8ICcnLCB4ICsgNSwgc3RhcnRZICsgNSwge1xuICAgICAgICAgICAgd2lkdGg6IGNvbFdpZHRoIC0gMTAsXG4gICAgICAgICAgfSlcbiAgICAgICAgICBpZiAoaXNIZWFkZXIpIHtcbiAgICAgICAgICAgIGRvYy5mb250KCdIZWx2ZXRpY2EnKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRvYy55ID0gc3RhcnRZICsgbWF4SGVpZ2h0XG4gICAgICB9XG4gICAgfVxuXG4gICAgZG9jLm1vdmVEb3duKClcbiAgfVxuXG4gIC8qKlxuICAgKiDmt7vliqDpobXnoIFcbiAgICovXG4gIHByaXZhdGUgYWRkUGFnZU51bWJlcnMoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBwYWdlcyA9IGRvYy5idWZmZXJlZFBhZ2VSYW5nZSgpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhZ2VzLmNvdW50OyBpKyspIHtcbiAgICAgIGRvYy5zd2l0Y2hUb1BhZ2UoaSlcblxuICAgICAgY29uc3QgcGFnZU51bSA9IGkgKyAxXG4gICAgICBjb25zdCB5ID0gdGhpcy5vcHRpb25zLnBhZ2VOdW1iZXJQb3NpdGlvbiA9PT0gJ3RvcCdcbiAgICAgICAgPyB0aGlzLm9wdGlvbnMubWFyZ2lucy50b3AgLyAyXG4gICAgICAgIDogZG9jLnBhZ2UuaGVpZ2h0IC0gdGhpcy5vcHRpb25zLm1hcmdpbnMuYm90dG9tIC8gMlxuXG4gICAgICBkb2MuZm9udFNpemUoMTApXG4gICAgICAgIC50ZXh0KFxuICAgICAgICAgIHBhZ2VOdW0udG9TdHJpbmcoKSxcbiAgICAgICAgICAwLFxuICAgICAgICAgIHksXG4gICAgICAgICAge1xuICAgICAgICAgICAgYWxpZ246ICdjZW50ZXInLFxuICAgICAgICAgICAgd2lkdGg6IGRvYy5wYWdlLndpZHRoLFxuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgIH1cbiAgfVxufVxuIl19