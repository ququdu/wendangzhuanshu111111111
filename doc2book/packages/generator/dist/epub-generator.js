"use strict";
/**
 * EPUB 生成器
 * 生成符合 EPUB 3.0 标准的电子书
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
exports.EpubGenerator = void 0;
const uuid_1 = require("uuid");
/**
 * EPUB 生成器类
 */
class EpubGenerator {
    options;
    constructor(options) {
        this.options = {
            tocDepth: 3,
            embedFonts: false,
            splitChapters: true,
            includeNcx: true,
            compressImages: true,
            maxImageWidth: 1200,
            ...options,
        };
    }
    /**
     * 生成 EPUB
     */
    async generate(book, outputPath) {
        try {
            // 准备章节内容
            const chapters = this.prepareChapters(book);
            // 准备元数据
            const metadata = {
                id: (0, uuid_1.v4)(),
                title: book.metadata.title,
                author: book.metadata.author,
                language: book.metadata.language,
                description: book.metadata.description,
                publisher: book.metadata.publisher,
                date: book.metadata.publishDate?.toISOString().split('T')[0],
                rights: book.metadata.copyright,
            };
            // 生成目录
            const toc = this.generateToc(book);
            // 使用 epub-gen-memory 生成 EPUB
            const epubContent = await this.buildEpub(metadata, chapters, toc);
            // 写入文件
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.writeFile(outputPath, epubContent);
            const stats = await fs.stat(outputPath);
            return {
                success: true,
                size: stats.size,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '生成 EPUB 失败',
            };
        }
    }
    /**
     * 准备章节内容
     */
    prepareChapters(book) {
        const chapters = [];
        let chapterIndex = 0;
        // 添加前言等
        if (book.frontMatter.preface) {
            chapters.push(this.chapterToContent(book.frontMatter.preface, chapterIndex++, 'preface'));
        }
        if (book.frontMatter.foreword) {
            chapters.push(this.chapterToContent(book.frontMatter.foreword, chapterIndex++, 'foreword'));
        }
        // 添加正文章节
        if (book.body.introduction) {
            chapters.push(this.chapterToContent(book.body.introduction, chapterIndex++, 'introduction'));
        }
        for (const chapter of book.body.chapters) {
            chapters.push(this.chapterToContent(chapter, chapterIndex++));
            // 添加子章节
            if (chapter.children) {
                for (const subChapter of chapter.children) {
                    chapters.push(this.chapterToContent(subChapter, chapterIndex++));
                }
            }
        }
        // 添加附录
        for (const appendix of book.backMatter.appendices) {
            chapters.push(this.chapterToContent(appendix, chapterIndex++, 'appendix'));
        }
        return chapters;
    }
    /**
     * 将章节转换为内容
     */
    chapterToContent(chapter, index, prefix) {
        const filename = prefix
            ? `${prefix}_${index.toString().padStart(3, '0')}.xhtml`
            : `chapter_${index.toString().padStart(3, '0')}.xhtml`;
        const html = this.contentNodesToHtml(chapter.content, chapter.title);
        return {
            id: chapter.id,
            title: chapter.title,
            content: html,
            filename,
        };
    }
    /**
     * 将内容节点转换为 HTML
     */
    contentNodesToHtml(nodes, title) {
        let html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${this.escapeHtml(title || '')}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
`;
        if (title) {
            html += `<h1>${this.escapeHtml(title)}</h1>\n`;
        }
        for (const node of nodes) {
            html += this.nodeToHtml(node);
        }
        html += `</body>
</html>`;
        return html;
    }
    /**
     * 将单个节点转换为 HTML
     */
    nodeToHtml(node) {
        switch (node.type) {
            case 'heading':
                const level = Math.min(6, Math.max(1, node.level || 2));
                return `<h${level}>${this.escapeHtml(node.text || '')}</h${level}>\n`;
            case 'paragraph':
                return `<p>${this.escapeHtml(node.text || '')}</p>\n`;
            case 'list':
                const listTag = node.attributes?.ordered ? 'ol' : 'ul';
                let listHtml = `<${listTag}>\n`;
                if (node.children) {
                    for (const item of node.children) {
                        listHtml += `<li>${this.escapeHtml(item.text || '')}</li>\n`;
                    }
                }
                listHtml += `</${listTag}>\n`;
                return listHtml;
            case 'blockquote':
                return `<blockquote><p>${this.escapeHtml(node.text || '')}</p></blockquote>\n`;
            case 'code':
                const lang = node.attributes?.language || '';
                return `<pre><code class="language-${lang}">${this.escapeHtml(node.text || '')}</code></pre>\n`;
            case 'table':
                return this.tableToHtml(node);
            case 'image':
                const assetId = node.attributes?.assetId || '';
                const caption = node.text || '';
                return `<figure>
  <img src="images/${assetId}" alt="${this.escapeHtml(caption)}"/>
  ${caption ? `<figcaption>${this.escapeHtml(caption)}</figcaption>` : ''}
</figure>\n`;
            default:
                if (node.text) {
                    return `<p>${this.escapeHtml(node.text)}</p>\n`;
                }
                return '';
        }
    }
    /**
     * 将表格转换为 HTML
     */
    tableToHtml(node) {
        if (!node.children)
            return '';
        let html = '<table>\n';
        const hasHeader = node.attributes?.hasHeader;
        for (let i = 0; i < node.children.length; i++) {
            const row = node.children[i];
            const isHeader = hasHeader && i === 0;
            html += '<tr>\n';
            if (row.children) {
                for (const cell of row.children) {
                    const tag = isHeader ? 'th' : 'td';
                    html += `<${tag}>${this.escapeHtml(cell.text || '')}</${tag}>\n`;
                }
            }
            html += '</tr>\n';
        }
        html += '</table>\n';
        return html;
    }
    /**
     * 生成目录
     */
    generateToc(book) {
        const toc = [];
        let chapterIndex = 0;
        // 前言
        if (book.frontMatter.preface) {
            toc.push({
                title: book.frontMatter.preface.title,
                href: `preface_${chapterIndex++}.xhtml`,
                level: 1,
            });
        }
        // 正文章节
        for (const chapter of book.body.chapters) {
            const item = {
                title: chapter.title,
                href: `chapter_${chapterIndex++}.xhtml`,
                level: 1,
                children: [],
            };
            if (chapter.children && this.options.tocDepth > 1) {
                for (const subChapter of chapter.children) {
                    item.children.push({
                        title: subChapter.title,
                        href: `chapter_${chapterIndex++}.xhtml`,
                        level: 2,
                    });
                }
            }
            toc.push(item);
        }
        return toc;
    }
    /**
     * 构建 EPUB 文件
     */
    async buildEpub(metadata, chapters, toc) {
        // 使用 archiver 创建 EPUB（ZIP 格式）
        const archiver = await Promise.resolve().then(() => __importStar(require('archiver')));
        const { PassThrough } = await Promise.resolve().then(() => __importStar(require('stream')));
        return new Promise((resolve, reject) => {
            const chunks = [];
            const passThrough = new PassThrough();
            passThrough.on('data', (chunk) => chunks.push(chunk));
            passThrough.on('end', () => resolve(Buffer.concat(chunks)));
            passThrough.on('error', reject);
            const archive = archiver.default('zip', { zlib: { level: 9 } });
            archive.pipe(passThrough);
            // mimetype（必须是第一个文件，不压缩）
            archive.append('application/epub+zip', { name: 'mimetype', store: true });
            // META-INF/container.xml
            archive.append(this.generateContainerXml(), { name: 'META-INF/container.xml' });
            // OEBPS/content.opf
            archive.append(this.generateContentOpf(metadata, chapters), { name: 'OEBPS/content.opf' });
            // OEBPS/toc.ncx
            if (this.options.includeNcx) {
                archive.append(this.generateTocNcx(metadata, toc), { name: 'OEBPS/toc.ncx' });
            }
            // OEBPS/nav.xhtml
            archive.append(this.generateNavXhtml(toc), { name: 'OEBPS/nav.xhtml' });
            // OEBPS/styles.css
            archive.append(this.generateStyles(), { name: 'OEBPS/styles.css' });
            // 章节文件
            for (const chapter of chapters) {
                archive.append(chapter.content, { name: `OEBPS/${chapter.filename}` });
            }
            archive.finalize();
        });
    }
    /**
     * 生成 container.xml
     */
    generateContainerXml() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    }
    /**
     * 生成 content.opf
     */
    generateContentOpf(metadata, chapters) {
        const items = chapters.map((ch, i) => `<item id="chapter${i}" href="${ch.filename}" media-type="application/xhtml+xml"/>`).join('\n    ');
        const itemrefs = chapters.map((_, i) => `<itemref idref="chapter${i}"/>`).join('\n    ');
        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${metadata.id}</dc:identifier>
    <dc:title>${this.escapeHtml(metadata.title)}</dc:title>
    <dc:creator>${this.escapeHtml(metadata.author)}</dc:creator>
    <dc:language>${metadata.language}</dc:language>
    ${metadata.description ? `<dc:description>${this.escapeHtml(metadata.description)}</dc:description>` : ''}
    ${metadata.publisher ? `<dc:publisher>${this.escapeHtml(metadata.publisher)}</dc:publisher>` : ''}
    ${metadata.date ? `<dc:date>${metadata.date}</dc:date>` : ''}
    ${metadata.rights ? `<dc:rights>${this.escapeHtml(metadata.rights)}</dc:rights>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${items}
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
    ${itemrefs}
  </spine>
</package>`;
    }
    /**
     * 生成 toc.ncx
     */
    generateTocNcx(metadata, toc) {
        let playOrder = 1;
        const navPoints = toc.map((item) => {
            let navPoint = `<navPoint id="navpoint${playOrder}" playOrder="${playOrder++}">
      <navLabel><text>${this.escapeHtml(item.title)}</text></navLabel>
      <content src="${item.href}"/>`;
            if (item.children) {
                for (const child of item.children) {
                    navPoint += `
      <navPoint id="navpoint${playOrder}" playOrder="${playOrder++}">
        <navLabel><text>${this.escapeHtml(child.title)}</text></navLabel>
        <content src="${child.href}"/>
      </navPoint>`;
                }
            }
            navPoint += `
    </navPoint>`;
            return navPoint;
        }).join('\n    ');
        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${metadata.id}"/>
    <meta name="dtb:depth" content="${this.options.tocDepth}"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeHtml(metadata.title)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;
    }
    /**
     * 生成 nav.xhtml
     */
    generateNavXhtml(toc) {
        const renderTocItems = (items) => {
            return items.map((item) => {
                let li = `<li><a href="${item.href}">${this.escapeHtml(item.title)}</a>`;
                if (item.children && item.children.length > 0) {
                    li += `\n<ol>\n${renderTocItems(item.children)}</ol>`;
                }
                li += '</li>';
                return li;
            }).join('\n');
        };
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>目录</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
${renderTocItems(toc)}
    </ol>
  </nav>
</body>
</html>`;
    }
    /**
     * 生成样式表
     */
    generateStyles() {
        if (this.options.css) {
            return this.options.css;
        }
        return `/* Doc2Book 默认样式 */
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 1em;
  text-align: justify;
}

h1, h2, h3, h4, h5, h6 {
  font-family: Arial, Helvetica, sans-serif;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  page-break-after: avoid;
}

h1 { font-size: 1.8em; text-align: center; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.3em; }
h4 { font-size: 1.1em; }

p {
  margin: 0.5em 0;
  text-indent: 2em;
}

blockquote {
  margin: 1em 2em;
  padding-left: 1em;
  border-left: 3px solid #ccc;
  font-style: italic;
}

pre, code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.9em;
  background-color: #f5f5f5;
}

pre {
  padding: 1em;
  overflow-x: auto;
  white-space: pre-wrap;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

figure {
  margin: 1em 0;
  text-align: center;
}

figcaption {
  font-size: 0.9em;
  color: #666;
  margin-top: 0.5em;
}

img {
  max-width: 100%;
  height: auto;
}

ul, ol {
  margin: 0.5em 0;
  padding-left: 2em;
}

li {
  margin: 0.25em 0;
}
`;
    }
    /**
     * HTML 转义
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
exports.EpubGenerator = EpubGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXB1Yi1nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXB1Yi1nZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0JBQW1DO0FBSW5DOztHQUVHO0FBQ0gsTUFBYSxhQUFhO0lBQ2hCLE9BQU8sQ0FBYTtJQUU1QixZQUFZLE9BQThCO1FBQ3hDLElBQUksQ0FBQyxPQUFPLEdBQUc7WUFDYixRQUFRLEVBQUUsQ0FBQztZQUNYLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLEdBQUcsT0FBTztTQUNYLENBQUE7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsUUFBUSxDQUNaLElBQW1CLEVBQ25CLFVBQWtCO1FBRWxCLElBQUksQ0FBQztZQUNILFNBQVM7WUFDVCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRTNDLFFBQVE7WUFDUixNQUFNLFFBQVEsR0FBRztnQkFDZixFQUFFLEVBQUUsSUFBQSxTQUFNLEdBQUU7Z0JBQ1osS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztnQkFDMUIsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtnQkFDNUIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUTtnQkFDaEMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVztnQkFDdEMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUztnQkFDbEMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FB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QyxHQUFHLENBQUM7Ozs7UUFJYixDQUFBO0lBQ04sQ0FBQztJQUVEOztPQUVHO0lBQ0ssY0FBYztRQUNwQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQTtRQUN6QixDQUFDO1FBRUQsT0FBTzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzRlYsQ0FBQTtJQUNDLENBQUM7SUFFRDs7T0FFRztJQUNLLFVBQVUsQ0FBQyxJQUFZO1FBQzdCLE9BQU8sSUFBSTthQUNSLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO2FBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO2FBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO2FBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDNUIsQ0FBQztDQUNGO0FBNWlCRCxzQ0E0aUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBFUFVCIOeUn+aIkOWZqFxuICog55Sf5oiQ56ym5ZCIIEVQVUIgMy4wIOagh+WHhueahOeUteWtkOS5plxuICovXG5cbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnXG5pbXBvcnQgdHlwZSB7IEJvb2tTdHJ1Y3R1cmUsIENoYXB0ZXIsIENvbnRlbnROb2RlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgRXB1Yk9wdGlvbnMsIENoYXB0ZXJDb250ZW50LCBUb2NJdGVtIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiBFUFVCIOeUn+aIkOWZqOexu1xuICovXG5leHBvcnQgY2xhc3MgRXB1YkdlbmVyYXRvciB7XG4gIHByaXZhdGUgb3B0aW9uczogRXB1Yk9wdGlvbnNcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogUGFydGlhbDxFcHViT3B0aW9ucz4pIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICB0b2NEZXB0aDogMyxcbiAgICAgIGVtYmVkRm9udHM6IGZhbHNlLFxuICAgICAgc3BsaXRDaGFwdGVyczogdHJ1ZSxcbiAgICAgIGluY2x1ZGVOY3g6IHRydWUsXG4gICAgICBjb21wcmVzc0ltYWdlczogdHJ1ZSxcbiAgICAgIG1heEltYWdlV2lkdGg6IDEyMDAsXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJAgRVBVQlxuICAgKi9cbiAgYXN5bmMgZ2VuZXJhdGUoXG4gICAgYm9vazogQm9va1N0cnVjdHVyZSxcbiAgICBvdXRwdXRQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nOyBzaXplPzogbnVtYmVyIH0+IHtcbiAgICB0cnkge1xuICAgICAgLy8g5YeG5aSH56ug6IqC5YaF5a65XG4gICAgICBjb25zdCBjaGFwdGVycyA9IHRoaXMucHJlcGFyZUNoYXB0ZXJzKGJvb2spXG5cbiAgICAgIC8vIOWHhuWkh+WFg+aVsOaNrlxuICAgICAgY29uc3QgbWV0YWRhdGEgPSB7XG4gICAgICAgIGlkOiB1dWlkdjQoKSxcbiAgICAgICAgdGl0bGU6IGJvb2subWV0YWRhdGEudGl0bGUsXG4gICAgICAgIGF1dGhvcjogYm9vay5tZXRhZGF0YS5hdXRob3IsXG4gICAgICAgIGxhbmd1YWdlOiBib29rLm1ldGFkYXRhLmxhbmd1YWdlLFxuICAgICAgICBkZXNjcmlwdGlvbjogYm9vay5tZXRhZGF0YS5kZXNjcmlwdGlvbixcbiAgICAgICAgcHVibGlzaGVyOiBib29rLm1ldGFkYXRhLnB1Ymxpc2hlcixcbiAgICAgICAgZGF0ZTogYm9vay5tZXRhZGF0YS5wdWJsaXNoRGF0ZT8udG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdLFxuICAgICAgICByaWdodHM6IGJvb2subWV0YWRhdGEuY29weXJpZ2h0LFxuICAgICAgfVxuXG4gICAgICAvLyDnlJ/miJDnm67lvZVcbiAgICAgIGNvbnN0IHRvYyA9IHRoaXMuZ2VuZXJhdGVUb2MoYm9vaylcblxuICAgICAgLy8g5L2/55SoIGVwdWItZ2VuLW1lbW9yeSDnlJ/miJAgRVBVQlxuICAgICAgY29uc3QgZXB1YkNvbnRlbnQgPSBhd2FpdCB0aGlzLmJ1aWxkRXB1YihtZXRhZGF0YSwgY2hhcHRlcnMsIHRvYylcblxuICAgICAgLy8g5YaZ5YWl5paH5Lu2XG4gICAgICBjb25zdCBmcyA9IGF3YWl0IGltcG9ydCgnZnMvcHJvbWlzZXMnKVxuICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKG91dHB1dFBhdGgsIGVwdWJDb250ZW50KVxuXG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLnN0YXQob3V0cHV0UGF0aClcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgc2l6ZTogc3RhdHMuc2l6ZSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfnlJ/miJAgRVBVQiDlpLHotKUnLFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDlh4blpIfnq6DoioLlhoXlrrlcbiAgICovXG4gIHByaXZhdGUgcHJlcGFyZUNoYXB0ZXJzKGJvb2s6IEJvb2tTdHJ1Y3R1cmUpOiBDaGFwdGVyQ29udGVudFtdIHtcbiAgICBjb25zdCBjaGFwdGVyczogQ2hhcHRlckNvbnRlbnRbXSA9IFtdXG4gICAgbGV0IGNoYXB0ZXJJbmRleCA9IDBcblxuICAgIC8vIOa3u+WKoOWJjeiogOetiVxuICAgIGlmIChib29rLmZyb250TWF0dGVyLnByZWZhY2UpIHtcbiAgICAgIGNoYXB0ZXJzLnB1c2godGhpcy5jaGFwdGVyVG9Db250ZW50KGJvb2suZnJvbnRNYXR0ZXIucHJlZmFjZSwgY2hhcHRlckluZGV4KyssICdwcmVmYWNlJykpXG4gICAgfVxuXG4gICAgaWYgKGJvb2suZnJvbnRNYXR0ZXIuZm9yZXdvcmQpIHtcbiAgICAgIGNoYXB0ZXJzLnB1c2godGhpcy5jaGFwdGVyVG9Db250ZW50KGJvb2suZnJvbnRNYXR0ZXIuZm9yZXdvcmQsIGNoYXB0ZXJJbmRleCsrLCAnZm9yZXdvcmQnKSlcbiAgICB9XG5cbiAgICAvLyDmt7vliqDmraPmlofnq6DoioJcbiAgICBpZiAoYm9vay5ib2R5LmludHJvZHVjdGlvbikge1xuICAgICAgY2hhcHRlcnMucHVzaCh0aGlzLmNoYXB0ZXJUb0NvbnRlbnQoYm9vay5ib2R5LmludHJvZHVjdGlvbiwgY2hhcHRlckluZGV4KyssICdpbnRyb2R1Y3Rpb24nKSlcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGNoYXB0ZXIgb2YgYm9vay5ib2R5LmNoYXB0ZXJzKSB7XG4gICAgICBjaGFwdGVycy5wdXNoKHRoaXMuY2hhcHRlclRvQ29udGVudChjaGFwdGVyLCBjaGFwdGVySW5kZXgrKykpXG5cbiAgICAgIC8vIOa3u+WKoOWtkOeroOiKglxuICAgICAgaWYgKGNoYXB0ZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgZm9yIChjb25zdCBzdWJDaGFwdGVyIG9mIGNoYXB0ZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgICBjaGFwdGVycy5wdXNoKHRoaXMuY2hhcHRlclRvQ29udGVudChzdWJDaGFwdGVyLCBjaGFwdGVySW5kZXgrKykpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDmt7vliqDpmYTlvZVcbiAgICBmb3IgKGNvbnN0IGFwcGVuZGl4IG9mIGJvb2suYmFja01hdHRlci5hcHBlbmRpY2VzKSB7XG4gICAgICBjaGFwdGVycy5wdXNoKHRoaXMuY2hhcHRlclRvQ29udGVudChhcHBlbmRpeCwgY2hhcHRlckluZGV4KyssICdhcHBlbmRpeCcpKVxuICAgIH1cblxuICAgIHJldHVybiBjaGFwdGVyc1xuICB9XG5cbiAgLyoqXG4gICAqIOWwhueroOiKgui9rOaNouS4uuWGheWuuVxuICAgKi9cbiAgcHJpdmF0ZSBjaGFwdGVyVG9Db250ZW50KFxuICAgIGNoYXB0ZXI6IENoYXB0ZXIsXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBwcmVmaXg/OiBzdHJpbmdcbiAgKTogQ2hhcHRlckNvbnRlbnQge1xuICAgIGNvbnN0IGZpbGVuYW1lID0gcHJlZml4XG4gICAgICA/IGAke3ByZWZpeH1fJHtpbmRleC50b1N0cmluZygpLnBhZFN0YXJ0KDMsICcwJyl9LnhodG1sYFxuICAgICAgOiBgY2hhcHRlcl8ke2luZGV4LnRvU3RyaW5nKCkucGFkU3RhcnQoMywgJzAnKX0ueGh0bWxgXG5cbiAgICBjb25zdCBodG1sID0gdGhpcy5jb250ZW50Tm9kZXNUb0h0bWwoY2hhcHRlci5jb250ZW50LCBjaGFwdGVyLnRpdGxlKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBjaGFwdGVyLmlkLFxuICAgICAgdGl0bGU6IGNoYXB0ZXIudGl0bGUsXG4gICAgICBjb250ZW50OiBodG1sLFxuICAgICAgZmlsZW5hbWUsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOWwhuWGheWuueiKgueCuei9rOaNouS4uiBIVE1MXG4gICAqL1xuICBwcml2YXRlIGNvbnRlbnROb2Rlc1RvSHRtbChub2RlczogQ29udGVudE5vZGVbXSwgdGl0bGU/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGxldCBodG1sID0gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPCFET0NUWVBFIGh0bWw+XG48aHRtbCB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiB4bWxuczplcHViPVwiaHR0cDovL3d3dy5pZHBmLm9yZy8yMDA3L29wc1wiPlxuPGhlYWQ+XG4gIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiLz5cbiAgPHRpdGxlPiR7dGhpcy5lc2NhcGVIdG1sKHRpdGxlIHx8ICcnKX08L3RpdGxlPlxuICA8bGluayByZWw9XCJzdHlsZXNoZWV0XCIgdHlwZT1cInRleHQvY3NzXCIgaHJlZj1cInN0eWxlcy5jc3NcIi8+XG48L2hlYWQ+XG48Ym9keT5cbmBcblxuICAgIGlmICh0aXRsZSkge1xuICAgICAgaHRtbCArPSBgPGgxPiR7dGhpcy5lc2NhcGVIdG1sKHRpdGxlKX08L2gxPlxcbmBcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgIGh0bWwgKz0gdGhpcy5ub2RlVG9IdG1sKG5vZGUpXG4gICAgfVxuXG4gICAgaHRtbCArPSBgPC9ib2R5PlxuPC9odG1sPmBcblxuICAgIHJldHVybiBodG1sXG4gIH1cblxuICAvKipcbiAgICog5bCG5Y2V5Liq6IqC54K56L2s5o2i5Li6IEhUTUxcbiAgICovXG4gIHByaXZhdGUgbm9kZVRvSHRtbChub2RlOiBDb250ZW50Tm9kZSk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICBjb25zdCBsZXZlbCA9IE1hdGgubWluKDYsIE1hdGgubWF4KDEsIG5vZGUubGV2ZWwgfHwgMikpXG4gICAgICAgIHJldHVybiBgPGgke2xldmVsfT4ke3RoaXMuZXNjYXBlSHRtbChub2RlLnRleHQgfHwgJycpfTwvaCR7bGV2ZWx9PlxcbmBcblxuICAgICAgY2FzZSAncGFyYWdyYXBoJzpcbiAgICAgICAgcmV0dXJuIGA8cD4ke3RoaXMuZXNjYXBlSHRtbChub2RlLnRleHQgfHwgJycpfTwvcD5cXG5gXG5cbiAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICBjb25zdCBsaXN0VGFnID0gbm9kZS5hdHRyaWJ1dGVzPy5vcmRlcmVkID8gJ29sJyA6ICd1bCdcbiAgICAgICAgbGV0IGxpc3RIdG1sID0gYDwke2xpc3RUYWd9PlxcbmBcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT4ke3RoaXMuZXNjYXBlSHRtbChpdGVtLnRleHQgfHwgJycpfTwvbGk+XFxuYFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsaXN0SHRtbCArPSBgPC8ke2xpc3RUYWd9PlxcbmBcbiAgICAgICAgcmV0dXJuIGxpc3RIdG1sXG5cbiAgICAgIGNhc2UgJ2Jsb2NrcXVvdGUnOlxuICAgICAgICByZXR1cm4gYDxibG9ja3F1b3RlPjxwPiR7dGhpcy5lc2NhcGVIdG1sKG5vZGUudGV4dCB8fCAnJyl9PC9wPjwvYmxvY2txdW90ZT5cXG5gXG5cbiAgICAgIGNhc2UgJ2NvZGUnOlxuICAgICAgICBjb25zdCBsYW5nID0gbm9kZS5hdHRyaWJ1dGVzPy5sYW5ndWFnZSB8fCAnJ1xuICAgICAgICByZXR1cm4gYDxwcmU+PGNvZGUgY2xhc3M9XCJsYW5ndWFnZS0ke2xhbmd9XCI+JHt0aGlzLmVzY2FwZUh0bWwobm9kZS50ZXh0IHx8ICcnKX08L2NvZGU+PC9wcmU+XFxuYFxuXG4gICAgICBjYXNlICd0YWJsZSc6XG4gICAgICAgIHJldHVybiB0aGlzLnRhYmxlVG9IdG1sKG5vZGUpXG5cbiAgICAgIGNhc2UgJ2ltYWdlJzpcbiAgICAgICAgY29uc3QgYXNzZXRJZCA9IG5vZGUuYXR0cmlidXRlcz8uYXNzZXRJZCB8fCAnJ1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gbm9kZS50ZXh0IHx8ICcnXG4gICAgICAgIHJldHVybiBgPGZpZ3VyZT5cbiAgPGltZyBzcmM9XCJpbWFnZXMvJHthc3NldElkfVwiIGFsdD1cIiR7dGhpcy5lc2NhcGVIdG1sKGNhcHRpb24pfVwiLz5cbiAgJHtjYXB0aW9uID8gYDxmaWdjYXB0aW9uPiR7dGhpcy5lc2NhcGVIdG1sKGNhcHRpb24pfTwvZmlnY2FwdGlvbj5gIDogJyd9XG48L2ZpZ3VyZT5cXG5gXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChub2RlLnRleHQpIHtcbiAgICAgICAgICByZXR1cm4gYDxwPiR7dGhpcy5lc2NhcGVIdG1sKG5vZGUudGV4dCl9PC9wPlxcbmBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJydcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5bCG6KGo5qC86L2s5o2i5Li6IEhUTUxcbiAgICovXG4gIHByaXZhdGUgdGFibGVUb0h0bWwobm9kZTogQ29udGVudE5vZGUpOiBzdHJpbmcge1xuICAgIGlmICghbm9kZS5jaGlsZHJlbikgcmV0dXJuICcnXG5cbiAgICBsZXQgaHRtbCA9ICc8dGFibGU+XFxuJ1xuICAgIGNvbnN0IGhhc0hlYWRlciA9IG5vZGUuYXR0cmlidXRlcz8uaGFzSGVhZGVyXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IG5vZGUuY2hpbGRyZW5baV1cbiAgICAgIGNvbnN0IGlzSGVhZGVyID0gaGFzSGVhZGVyICYmIGkgPT09IDBcblxuICAgICAgaHRtbCArPSAnPHRyPlxcbidcbiAgICAgIGlmIChyb3cuY2hpbGRyZW4pIHtcbiAgICAgICAgZm9yIChjb25zdCBjZWxsIG9mIHJvdy5jaGlsZHJlbikge1xuICAgICAgICAgIGNvbnN0IHRhZyA9IGlzSGVhZGVyID8gJ3RoJyA6ICd0ZCdcbiAgICAgICAgICBodG1sICs9IGA8JHt0YWd9PiR7dGhpcy5lc2NhcGVIdG1sKGNlbGwudGV4dCB8fCAnJyl9PC8ke3RhZ30+XFxuYFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBodG1sICs9ICc8L3RyPlxcbidcbiAgICB9XG5cbiAgICBodG1sICs9ICc8L3RhYmxlPlxcbidcbiAgICByZXR1cm4gaHRtbFxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOebruW9lVxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZVRvYyhib29rOiBCb29rU3RydWN0dXJlKTogVG9jSXRlbVtdIHtcbiAgICBjb25zdCB0b2M6IFRvY0l0ZW1bXSA9IFtdXG4gICAgbGV0IGNoYXB0ZXJJbmRleCA9IDBcblxuICAgIC8vIOWJjeiogFxuICAgIGlmIChib29rLmZyb250TWF0dGVyLnByZWZhY2UpIHtcbiAgICAgIHRvYy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IGJvb2suZnJvbnRNYXR0ZXIucHJlZmFjZS50aXRsZSxcbiAgICAgICAgaHJlZjogYHByZWZhY2VfJHtjaGFwdGVySW5kZXgrK30ueGh0bWxgLFxuICAgICAgICBsZXZlbDogMSxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8g5q2j5paH56ug6IqCXG4gICAgZm9yIChjb25zdCBjaGFwdGVyIG9mIGJvb2suYm9keS5jaGFwdGVycykge1xuICAgICAgY29uc3QgaXRlbTogVG9jSXRlbSA9IHtcbiAgICAgICAgdGl0bGU6IGNoYXB0ZXIudGl0bGUsXG4gICAgICAgIGhyZWY6IGBjaGFwdGVyXyR7Y2hhcHRlckluZGV4Kyt9LnhodG1sYCxcbiAgICAgICAgbGV2ZWw6IDEsXG4gICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgIH1cblxuICAgICAgaWYgKGNoYXB0ZXIuY2hpbGRyZW4gJiYgdGhpcy5vcHRpb25zLnRvY0RlcHRoID4gMSkge1xuICAgICAgICBmb3IgKGNvbnN0IHN1YkNoYXB0ZXIgb2YgY2hhcHRlci5jaGlsZHJlbikge1xuICAgICAgICAgIGl0ZW0uY2hpbGRyZW4hLnB1c2goe1xuICAgICAgICAgICAgdGl0bGU6IHN1YkNoYXB0ZXIudGl0bGUsXG4gICAgICAgICAgICBocmVmOiBgY2hhcHRlcl8ke2NoYXB0ZXJJbmRleCsrfS54aHRtbGAsXG4gICAgICAgICAgICBsZXZlbDogMixcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRvYy5wdXNoKGl0ZW0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvY1xuICB9XG5cbiAgLyoqXG4gICAqIOaehOW7uiBFUFVCIOaWh+S7tlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBidWlsZEVwdWIoXG4gICAgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gICAgY2hhcHRlcnM6IENoYXB0ZXJDb250ZW50W10sXG4gICAgdG9jOiBUb2NJdGVtW11cbiAgKTogUHJvbWlzZTxCdWZmZXI+IHtcbiAgICAvLyDkvb/nlKggYXJjaGl2ZXIg5Yib5bu6IEVQVULvvIhaSVAg5qC85byP77yJXG4gICAgY29uc3QgYXJjaGl2ZXIgPSBhd2FpdCBpbXBvcnQoJ2FyY2hpdmVyJylcbiAgICBjb25zdCB7IFBhc3NUaHJvdWdoIH0gPSBhd2FpdCBpbXBvcnQoJ3N0cmVhbScpXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXG4gICAgICBjb25zdCBwYXNzVGhyb3VnaCA9IG5ldyBQYXNzVGhyb3VnaCgpXG5cbiAgICAgIHBhc3NUaHJvdWdoLm9uKCdkYXRhJywgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpXG4gICAgICBwYXNzVGhyb3VnaC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykpKVxuICAgICAgcGFzc1Rocm91Z2gub24oJ2Vycm9yJywgcmVqZWN0KVxuXG4gICAgICBjb25zdCBhcmNoaXZlID0gYXJjaGl2ZXIuZGVmYXVsdCgnemlwJywgeyB6bGliOiB7IGxldmVsOiA5IH0gfSlcbiAgICAgIGFyY2hpdmUucGlwZShwYXNzVGhyb3VnaClcblxuICAgICAgLy8gbWltZXR5cGXvvIjlv4XpobvmmK/nrKzkuIDkuKrmlofku7bvvIzkuI3ljovnvKnvvIlcbiAgICAgIGFyY2hpdmUuYXBwZW5kKCdhcHBsaWNhdGlvbi9lcHViK3ppcCcsIHsgbmFtZTogJ21pbWV0eXBlJywgc3RvcmU6IHRydWUgfSlcblxuICAgICAgLy8gTUVUQS1JTkYvY29udGFpbmVyLnhtbFxuICAgICAgYXJjaGl2ZS5hcHBlbmQodGhpcy5nZW5lcmF0ZUNvbnRhaW5lclhtbCgpLCB7IG5hbWU6ICdNRVRBLUlORi9jb250YWluZXIueG1sJyB9KVxuXG4gICAgICAvLyBPRUJQUy9jb250ZW50Lm9wZlxuICAgICAgYXJjaGl2ZS5hcHBlbmQodGhpcy5nZW5lcmF0ZUNvbnRlbnRPcGYobWV0YWRhdGEsIGNoYXB0ZXJzKSwgeyBuYW1lOiAnT0VCUFMvY29udGVudC5vcGYnIH0pXG5cbiAgICAgIC8vIE9FQlBTL3RvYy5uY3hcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW5jbHVkZU5jeCkge1xuICAgICAgICBhcmNoaXZlLmFwcGVuZCh0aGlzLmdlbmVyYXRlVG9jTmN4KG1ldGFkYXRhLCB0b2MpLCB7IG5hbWU6ICdPRUJQUy90b2MubmN4JyB9KVxuICAgICAgfVxuXG4gICAgICAvLyBPRUJQUy9uYXYueGh0bWxcbiAgICAgIGFyY2hpdmUuYXBwZW5kKHRoaXMuZ2VuZXJhdGVOYXZYaHRtbCh0b2MpLCB7IG5hbWU6ICdPRUJQUy9uYXYueGh0bWwnIH0pXG5cbiAgICAgIC8vIE9FQlBTL3N0eWxlcy5jc3NcbiAgICAgIGFyY2hpdmUuYXBwZW5kKHRoaXMuZ2VuZXJhdGVTdHlsZXMoKSwgeyBuYW1lOiAnT0VCUFMvc3R5bGVzLmNzcycgfSlcblxuICAgICAgLy8g56ug6IqC5paH5Lu2XG4gICAgICBmb3IgKGNvbnN0IGNoYXB0ZXIgb2YgY2hhcHRlcnMpIHtcbiAgICAgICAgYXJjaGl2ZS5hcHBlbmQoY2hhcHRlci5jb250ZW50LCB7IG5hbWU6IGBPRUJQUy8ke2NoYXB0ZXIuZmlsZW5hbWV9YCB9KVxuICAgICAgfVxuXG4gICAgICBhcmNoaXZlLmZpbmFsaXplKClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkCBjb250YWluZXIueG1sXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlQ29udGFpbmVyWG1sKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cbjxjb250YWluZXIgdmVyc2lvbj1cIjEuMFwiIHhtbG5zPVwidXJuOm9hc2lzOm5hbWVzOnRjOm9wZW5kb2N1bWVudDp4bWxuczpjb250YWluZXJcIj5cbiAgPHJvb3RmaWxlcz5cbiAgICA8cm9vdGZpbGUgZnVsbC1wYXRoPVwiT0VCUFMvY29udGVudC5vcGZcIiBtZWRpYS10eXBlPVwiYXBwbGljYXRpb24vb2VicHMtcGFja2FnZSt4bWxcIi8+XG4gIDwvcm9vdGZpbGVzPlxuPC9jb250YWluZXI+YFxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkCBjb250ZW50Lm9wZlxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvbnRlbnRPcGYoXG4gICAgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gICAgY2hhcHRlcnM6IENoYXB0ZXJDb250ZW50W11cbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCBpdGVtcyA9IGNoYXB0ZXJzLm1hcCgoY2gsIGkpID0+XG4gICAgICBgPGl0ZW0gaWQ9XCJjaGFwdGVyJHtpfVwiIGhyZWY9XCIke2NoLmZpbGVuYW1lfVwiIG1lZGlhLXR5cGU9XCJhcHBsaWNhdGlvbi94aHRtbCt4bWxcIi8+YFxuICAgICkuam9pbignXFxuICAgICcpXG5cbiAgICBjb25zdCBpdGVtcmVmcyA9IGNoYXB0ZXJzLm1hcCgoXywgaSkgPT5cbiAgICAgIGA8aXRlbXJlZiBpZHJlZj1cImNoYXB0ZXIke2l9XCIvPmBcbiAgICApLmpvaW4oJ1xcbiAgICAnKVxuXG4gICAgcmV0dXJuIGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cbjxwYWNrYWdlIHhtbG5zPVwiaHR0cDovL3d3dy5pZHBmLm9yZy8yMDA3L29wZlwiIHZlcnNpb249XCIzLjBcIiB1bmlxdWUtaWRlbnRpZmllcj1cIkJvb2tJZFwiPlxuICA8bWV0YWRhdGEgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiPlxuICAgIDxkYzppZGVudGlmaWVyIGlkPVwiQm9va0lkXCI+JHttZXRhZGF0YS5pZH08L2RjOmlkZW50aWZpZXI+XG4gICAgPGRjOnRpdGxlPiR7dGhpcy5lc2NhcGVIdG1sKG1ldGFkYXRhLnRpdGxlKX08L2RjOnRpdGxlPlxuICAgIDxkYzpjcmVhdG9yPiR7dGhpcy5lc2NhcGVIdG1sKG1ldGFkYXRhLmF1dGhvcil9PC9kYzpjcmVhdG9yPlxuICAgIDxkYzpsYW5ndWFnZT4ke21ldGFkYXRhLmxhbmd1YWdlfTwvZGM6bGFuZ3VhZ2U+XG4gICAgJHttZXRhZGF0YS5kZXNjcmlwdGlvbiA/IGA8ZGM6ZGVzY3JpcHRpb24+JHt0aGlzLmVzY2FwZUh0bWwobWV0YWRhdGEuZGVzY3JpcHRpb24pfTwvZGM6ZGVzY3JpcHRpb24+YCA6ICcnfVxuICAgICR7bWV0YWRhdGEucHVibGlzaGVyID8gYDxkYzpwdWJsaXNoZXI+JHt0aGlzLmVzY2FwZUh0bWwobWV0YWRhdGEucHVibGlzaGVyKX08L2RjOnB1Ymxpc2hlcj5gIDogJyd9XG4gICAgJHttZXRhZGF0YS5kYXRlID8gYDxkYzpkYXRlPiR7bWV0YWRhdGEuZGF0ZX08L2RjOmRhdGU+YCA6ICcnfVxuICAgICR7bWV0YWRhdGEucmlnaHRzID8gYDxkYzpyaWdodHM+JHt0aGlzLmVzY2FwZUh0bWwobWV0YWRhdGEucmlnaHRzKX08L2RjOnJpZ2h0cz5gIDogJyd9XG4gICAgPG1ldGEgcHJvcGVydHk9XCJkY3Rlcm1zOm1vZGlmaWVkXCI+JHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvXFwuXFxkezN9WiQvLCAnWicpfTwvbWV0YT5cbiAgPC9tZXRhZGF0YT5cbiAgPG1hbmlmZXN0PlxuICAgIDxpdGVtIGlkPVwibmF2XCIgaHJlZj1cIm5hdi54aHRtbFwiIG1lZGlhLXR5cGU9XCJhcHBsaWNhdGlvbi94aHRtbCt4bWxcIiBwcm9wZXJ0aWVzPVwibmF2XCIvPlxuICAgIDxpdGVtIGlkPVwibmN4XCIgaHJlZj1cInRvYy5uY3hcIiBtZWRpYS10eXBlPVwiYXBwbGljYXRpb24veC1kdGJuY3greG1sXCIvPlxuICAgIDxpdGVtIGlkPVwiY3NzXCIgaHJlZj1cInN0eWxlcy5jc3NcIiBtZWRpYS10eXBlPVwidGV4dC9jc3NcIi8+XG4gICAgJHtpdGVtc31cbiAgPC9tYW5pZmVzdD5cbiAgPHNwaW5lIHRvYz1cIm5jeFwiPlxuICAgIDxpdGVtcmVmIGlkcmVmPVwibmF2XCIvPlxuICAgICR7aXRlbXJlZnN9XG4gIDwvc3BpbmU+XG48L3BhY2thZ2U+YFxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkCB0b2MubmN4XG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlVG9jTmN4KG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LCB0b2M6IFRvY0l0ZW1bXSk6IHN0cmluZyB7XG4gICAgbGV0IHBsYXlPcmRlciA9IDFcbiAgICBjb25zdCBuYXZQb2ludHMgPSB0b2MubWFwKChpdGVtKSA9PiB7XG4gICAgICBsZXQgbmF2UG9pbnQgPSBgPG5hdlBvaW50IGlkPVwibmF2cG9pbnQke3BsYXlPcmRlcn1cIiBwbGF5T3JkZXI9XCIke3BsYXlPcmRlcisrfVwiPlxuICAgICAgPG5hdkxhYmVsPjx0ZXh0PiR7dGhpcy5lc2NhcGVIdG1sKGl0ZW0udGl0bGUpfTwvdGV4dD48L25hdkxhYmVsPlxuICAgICAgPGNvbnRlbnQgc3JjPVwiJHtpdGVtLmhyZWZ9XCIvPmBcblxuICAgICAgaWYgKGl0ZW0uY2hpbGRyZW4pIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBpdGVtLmNoaWxkcmVuKSB7XG4gICAgICAgICAgbmF2UG9pbnQgKz0gYFxuICAgICAgPG5hdlBvaW50IGlkPVwibmF2cG9pbnQke3BsYXlPcmRlcn1cIiBwbGF5T3JkZXI9XCIke3BsYXlPcmRlcisrfVwiPlxuICAgICAgICA8bmF2TGFiZWw+PHRleHQ+JHt0aGlzLmVzY2FwZUh0bWwoY2hpbGQudGl0bGUpfTwvdGV4dD48L25hdkxhYmVsPlxuICAgICAgICA8Y29udGVudCBzcmM9XCIke2NoaWxkLmhyZWZ9XCIvPlxuICAgICAgPC9uYXZQb2ludD5gXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbmF2UG9pbnQgKz0gYFxuICAgIDwvbmF2UG9pbnQ+YFxuICAgICAgcmV0dXJuIG5hdlBvaW50XG4gICAgfSkuam9pbignXFxuICAgICcpXG5cbiAgICByZXR1cm4gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPG5jeCB4bWxucz1cImh0dHA6Ly93d3cuZGFpc3kub3JnL3ozOTg2LzIwMDUvbmN4L1wiIHZlcnNpb249XCIyMDA1LTFcIj5cbiAgPGhlYWQ+XG4gICAgPG1ldGEgbmFtZT1cImR0Yjp1aWRcIiBjb250ZW50PVwiJHttZXRhZGF0YS5pZH1cIi8+XG4gICAgPG1ldGEgbmFtZT1cImR0YjpkZXB0aFwiIGNvbnRlbnQ9XCIke3RoaXMub3B0aW9ucy50b2NEZXB0aH1cIi8+XG4gICAgPG1ldGEgbmFtZT1cImR0Yjp0b3RhbFBhZ2VDb3VudFwiIGNvbnRlbnQ9XCIwXCIvPlxuICAgIDxtZXRhIG5hbWU9XCJkdGI6bWF4UGFnZU51bWJlclwiIGNvbnRlbnQ9XCIwXCIvPlxuICA8L2hlYWQ+XG4gIDxkb2NUaXRsZT48dGV4dD4ke3RoaXMuZXNjYXBlSHRtbChtZXRhZGF0YS50aXRsZSl9PC90ZXh0PjwvZG9jVGl0bGU+XG4gIDxuYXZNYXA+XG4gICAgJHtuYXZQb2ludHN9XG4gIDwvbmF2TWFwPlxuPC9uY3g+YFxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkCBuYXYueGh0bWxcbiAgICovXG4gIHByaXZhdGUgZ2VuZXJhdGVOYXZYaHRtbCh0b2M6IFRvY0l0ZW1bXSk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVuZGVyVG9jSXRlbXMgPSAoaXRlbXM6IFRvY0l0ZW1bXSk6IHN0cmluZyA9PiB7XG4gICAgICByZXR1cm4gaXRlbXMubWFwKChpdGVtKSA9PiB7XG4gICAgICAgIGxldCBsaSA9IGA8bGk+PGEgaHJlZj1cIiR7aXRlbS5ocmVmfVwiPiR7dGhpcy5lc2NhcGVIdG1sKGl0ZW0udGl0bGUpfTwvYT5gXG4gICAgICAgIGlmIChpdGVtLmNoaWxkcmVuICYmIGl0ZW0uY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGxpICs9IGBcXG48b2w+XFxuJHtyZW5kZXJUb2NJdGVtcyhpdGVtLmNoaWxkcmVuKX08L29sPmBcbiAgICAgICAgfVxuICAgICAgICBsaSArPSAnPC9saT4nXG4gICAgICAgIHJldHVybiBsaVxuICAgICAgfSkuam9pbignXFxuJylcbiAgICB9XG5cbiAgICByZXR1cm4gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxuPCFET0NUWVBFIGh0bWw+XG48aHRtbCB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiB4bWxuczplcHViPVwiaHR0cDovL3d3dy5pZHBmLm9yZy8yMDA3L29wc1wiPlxuPGhlYWQ+XG4gIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiLz5cbiAgPHRpdGxlPuebruW9lTwvdGl0bGU+XG48L2hlYWQ+XG48Ym9keT5cbiAgPG5hdiBlcHViOnR5cGU9XCJ0b2NcIiBpZD1cInRvY1wiPlxuICAgIDxoMT7nm67lvZU8L2gxPlxuICAgIDxvbD5cbiR7cmVuZGVyVG9jSXRlbXModG9jKX1cbiAgICA8L29sPlxuICA8L25hdj5cbjwvYm9keT5cbjwvaHRtbD5gXG4gIH1cblxuICAvKipcbiAgICog55Sf5oiQ5qC35byP6KGoXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlU3R5bGVzKCk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jc3MpIHtcbiAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMuY3NzXG4gICAgfVxuXG4gICAgcmV0dXJuIGAvKiBEb2MyQm9vayDpu5jorqTmoLflvI8gKi9cbmJvZHkge1xuICBmb250LWZhbWlseTogR2VvcmdpYSwgXCJUaW1lcyBOZXcgUm9tYW5cIiwgc2VyaWY7XG4gIGZvbnQtc2l6ZTogMWVtO1xuICBsaW5lLWhlaWdodDogMS42O1xuICBtYXJnaW46IDFlbTtcbiAgdGV4dC1hbGlnbjoganVzdGlmeTtcbn1cblxuaDEsIGgyLCBoMywgaDQsIGg1LCBoNiB7XG4gIGZvbnQtZmFtaWx5OiBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmO1xuICBtYXJnaW4tdG9wOiAxLjVlbTtcbiAgbWFyZ2luLWJvdHRvbTogMC41ZW07XG4gIHBhZ2UtYnJlYWstYWZ0ZXI6IGF2b2lkO1xufVxuXG5oMSB7IGZvbnQtc2l6ZTogMS44ZW07IHRleHQtYWxpZ246IGNlbnRlcjsgfVxuaDIgeyBmb250LXNpemU6IDEuNWVtOyB9XG5oMyB7IGZvbnQtc2l6ZTogMS4zZW07IH1cbmg0IHsgZm9udC1zaXplOiAxLjFlbTsgfVxuXG5wIHtcbiAgbWFyZ2luOiAwLjVlbSAwO1xuICB0ZXh0LWluZGVudDogMmVtO1xufVxuXG5ibG9ja3F1b3RlIHtcbiAgbWFyZ2luOiAxZW0gMmVtO1xuICBwYWRkaW5nLWxlZnQ6IDFlbTtcbiAgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjY2NjO1xuICBmb250LXN0eWxlOiBpdGFsaWM7XG59XG5cbnByZSwgY29kZSB7XG4gIGZvbnQtZmFtaWx5OiBcIkNvdXJpZXIgTmV3XCIsIENvdXJpZXIsIG1vbm9zcGFjZTtcbiAgZm9udC1zaXplOiAwLjllbTtcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcbn1cblxucHJlIHtcbiAgcGFkZGluZzogMWVtO1xuICBvdmVyZmxvdy14OiBhdXRvO1xuICB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XG59XG5cbnRhYmxlIHtcbiAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTtcbiAgd2lkdGg6IDEwMCU7XG4gIG1hcmdpbjogMWVtIDA7XG59XG5cbnRoLCB0ZCB7XG4gIGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XG4gIHBhZGRpbmc6IDAuNWVtO1xuICB0ZXh0LWFsaWduOiBsZWZ0O1xufVxuXG50aCB7XG4gIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7XG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xufVxuXG5maWd1cmUge1xuICBtYXJnaW46IDFlbSAwO1xuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG59XG5cbmZpZ2NhcHRpb24ge1xuICBmb250LXNpemU6IDAuOWVtO1xuICBjb2xvcjogIzY2NjtcbiAgbWFyZ2luLXRvcDogMC41ZW07XG59XG5cbmltZyB7XG4gIG1heC13aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiBhdXRvO1xufVxuXG51bCwgb2wge1xuICBtYXJnaW46IDAuNWVtIDA7XG4gIHBhZGRpbmctbGVmdDogMmVtO1xufVxuXG5saSB7XG4gIG1hcmdpbjogMC4yNWVtIDA7XG59XG5gXG4gIH1cblxuICAvKipcbiAgICogSFRNTCDovazkuYlcbiAgICovXG4gIHByaXZhdGUgZXNjYXBlSHRtbCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0ZXh0XG4gICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgLnJlcGxhY2UoLycvZywgJyYjMDM5OycpXG4gIH1cbn1cbiJdfQ==