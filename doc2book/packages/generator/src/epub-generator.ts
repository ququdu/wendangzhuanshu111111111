/**
 * EPUB 生成器
 * 生成符合 EPUB 3.0 标准的电子书
 */

import { v4 as uuidv4 } from 'uuid'
import type { BookStructure, Chapter, ContentNode } from '@doc2book/shared'
import type { EpubOptions, ChapterContent, TocItem } from './types'

/**
 * EPUB 生成器类
 */
export class EpubGenerator {
  private options: EpubOptions

  constructor(options?: Partial<EpubOptions>) {
    this.options = {
      tocDepth: 3,
      embedFonts: false,
      splitChapters: true,
      includeNcx: true,
      compressImages: true,
      maxImageWidth: 1200,
      ...options,
    }
  }

  /**
   * 生成 EPUB
   */
  async generate(
    book: BookStructure,
    outputPath: string
  ): Promise<{ success: boolean; error?: string; size?: number }> {
    try {
      // 准备章节内容
      const chapters = this.prepareChapters(book)

      // 准备元数据
      const metadata = {
        id: uuidv4(),
        title: book.metadata.title,
        author: book.metadata.author,
        language: book.metadata.language,
        description: book.metadata.description,
        publisher: book.metadata.publisher,
        date: book.metadata.publishDate?.toISOString().split('T')[0],
        rights: book.metadata.copyright,
      }

      // 生成目录
      const toc = this.generateToc(book)

      // 使用 epub-gen-memory 生成 EPUB
      const epubContent = await this.buildEpub(metadata, chapters, toc)

      // 写入文件
      const fs = await import('fs/promises')
      await fs.writeFile(outputPath, epubContent)

      const stats = await fs.stat(outputPath)

      return {
        success: true,
        size: stats.size,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成 EPUB 失败',
      }
    }
  }

  /**
   * 准备章节内容
   */
  private prepareChapters(book: BookStructure): ChapterContent[] {
    const chapters: ChapterContent[] = []
    let chapterIndex = 0

    // 添加前言等
    if (book.frontMatter.preface) {
      chapters.push(this.chapterToContent(book.frontMatter.preface, chapterIndex++, 'preface'))
    }

    if (book.frontMatter.foreword) {
      chapters.push(this.chapterToContent(book.frontMatter.foreword, chapterIndex++, 'foreword'))
    }

    // 添加正文章节
    if (book.body.introduction) {
      chapters.push(this.chapterToContent(book.body.introduction, chapterIndex++, 'introduction'))
    }

    for (const chapter of book.body.chapters) {
      chapters.push(this.chapterToContent(chapter, chapterIndex++))

      // 添加子章节
      if (chapter.children) {
        for (const subChapter of chapter.children) {
          chapters.push(this.chapterToContent(subChapter, chapterIndex++))
        }
      }
    }

    // 添加附录
    for (const appendix of book.backMatter.appendices) {
      chapters.push(this.chapterToContent(appendix, chapterIndex++, 'appendix'))
    }

    return chapters
  }

  /**
   * 将章节转换为内容
   */
  private chapterToContent(
    chapter: Chapter,
    index: number,
    prefix?: string
  ): ChapterContent {
    const filename = prefix
      ? `${prefix}_${index.toString().padStart(3, '0')}.xhtml`
      : `chapter_${index.toString().padStart(3, '0')}.xhtml`

    const html = this.contentNodesToHtml(chapter.content, chapter.title)

    return {
      id: chapter.id,
      title: chapter.title,
      content: html,
      filename,
    }
  }

  /**
   * 将内容节点转换为 HTML
   */
  private contentNodesToHtml(nodes: ContentNode[], title?: string): string {
    let html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${this.escapeHtml(title || '')}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
`

    if (title) {
      html += `<h1>${this.escapeHtml(title)}</h1>\n`
    }

    for (const node of nodes) {
      html += this.nodeToHtml(node)
    }

    html += `</body>
</html>`

    return html
  }

  /**
   * 将单个节点转换为 HTML
   */
  private nodeToHtml(node: ContentNode): string {
    switch (node.type) {
      case 'heading':
        const level = Math.min(6, Math.max(1, node.level || 2))
        return `<h${level}>${this.escapeHtml(node.text || '')}</h${level}>\n`

      case 'paragraph':
        return `<p>${this.escapeHtml(node.text || '')}</p>\n`

      case 'list':
        const listTag = node.attributes?.ordered ? 'ol' : 'ul'
        let listHtml = `<${listTag}>\n`
        if (node.children) {
          for (const item of node.children) {
            listHtml += `<li>${this.escapeHtml(item.text || '')}</li>\n`
          }
        }
        listHtml += `</${listTag}>\n`
        return listHtml

      case 'blockquote':
        return `<blockquote><p>${this.escapeHtml(node.text || '')}</p></blockquote>\n`

      case 'code':
        const lang = node.attributes?.language || ''
        return `<pre><code class="language-${lang}">${this.escapeHtml(node.text || '')}</code></pre>\n`

      case 'table':
        return this.tableToHtml(node)

      case 'image':
        const assetId = node.attributes?.assetId || ''
        const caption = node.text || ''
        return `<figure>
  <img src="images/${assetId}" alt="${this.escapeHtml(caption)}"/>
  ${caption ? `<figcaption>${this.escapeHtml(caption)}</figcaption>` : ''}
</figure>\n`

      default:
        if (node.text) {
          return `<p>${this.escapeHtml(node.text)}</p>\n`
        }
        return ''
    }
  }

  /**
   * 将表格转换为 HTML
   */
  private tableToHtml(node: ContentNode): string {
    if (!node.children) return ''

    let html = '<table>\n'
    const hasHeader = node.attributes?.hasHeader

    for (let i = 0; i < node.children.length; i++) {
      const row = node.children[i]
      const isHeader = hasHeader && i === 0

      html += '<tr>\n'
      if (row.children) {
        for (const cell of row.children) {
          const tag = isHeader ? 'th' : 'td'
          html += `<${tag}>${this.escapeHtml(cell.text || '')}</${tag}>\n`
        }
      }
      html += '</tr>\n'
    }

    html += '</table>\n'
    return html
  }

  /**
   * 生成目录
   */
  private generateToc(book: BookStructure): TocItem[] {
    const toc: TocItem[] = []
    let chapterIndex = 0

    // 前言
    if (book.frontMatter.preface) {
      toc.push({
        title: book.frontMatter.preface.title,
        href: `preface_${chapterIndex++}.xhtml`,
        level: 1,
      })
    }

    // 正文章节
    for (const chapter of book.body.chapters) {
      const item: TocItem = {
        title: chapter.title,
        href: `chapter_${chapterIndex++}.xhtml`,
        level: 1,
        children: [],
      }

      if (chapter.children && this.options.tocDepth > 1) {
        for (const subChapter of chapter.children) {
          item.children!.push({
            title: subChapter.title,
            href: `chapter_${chapterIndex++}.xhtml`,
            level: 2,
          })
        }
      }

      toc.push(item)
    }

    return toc
  }

  /**
   * 构建 EPUB 文件
   */
  private async buildEpub(
    metadata: Record<string, any>,
    chapters: ChapterContent[],
    toc: TocItem[]
  ): Promise<Buffer> {
    // 使用 archiver 创建 EPUB（ZIP 格式）
    const archiver = await import('archiver')
    const { PassThrough } = await import('stream')

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const passThrough = new PassThrough()

      passThrough.on('data', (chunk) => chunks.push(chunk))
      passThrough.on('end', () => resolve(Buffer.concat(chunks)))
      passThrough.on('error', reject)

      const archive = archiver.default('zip', { zlib: { level: 9 } })
      archive.pipe(passThrough)

      // mimetype（必须是第一个文件，不压缩）
      archive.append('application/epub+zip', { name: 'mimetype', store: true })

      // META-INF/container.xml
      archive.append(this.generateContainerXml(), { name: 'META-INF/container.xml' })

      // OEBPS/content.opf
      archive.append(this.generateContentOpf(metadata, chapters), { name: 'OEBPS/content.opf' })

      // OEBPS/toc.ncx
      if (this.options.includeNcx) {
        archive.append(this.generateTocNcx(metadata, toc), { name: 'OEBPS/toc.ncx' })
      }

      // OEBPS/nav.xhtml
      archive.append(this.generateNavXhtml(toc), { name: 'OEBPS/nav.xhtml' })

      // OEBPS/styles.css
      archive.append(this.generateStyles(), { name: 'OEBPS/styles.css' })

      // 章节文件
      for (const chapter of chapters) {
        archive.append(chapter.content, { name: `OEBPS/${chapter.filename}` })
      }

      archive.finalize()
    })
  }

  /**
   * 生成 container.xml
   */
  private generateContainerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  }

  /**
   * 生成 content.opf
   */
  private generateContentOpf(
    metadata: Record<string, any>,
    chapters: ChapterContent[]
  ): string {
    const items = chapters.map((ch, i) =>
      `<item id="chapter${i}" href="${ch.filename}" media-type="application/xhtml+xml"/>`
    ).join('\n    ')

    const itemrefs = chapters.map((_, i) =>
      `<itemref idref="chapter${i}"/>`
    ).join('\n    ')

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
</package>`
  }

  /**
   * 生成 toc.ncx
   */
  private generateTocNcx(metadata: Record<string, any>, toc: TocItem[]): string {
    let playOrder = 1
    const navPoints = toc.map((item) => {
      let navPoint = `<navPoint id="navpoint${playOrder}" playOrder="${playOrder++}">
      <navLabel><text>${this.escapeHtml(item.title)}</text></navLabel>
      <content src="${item.href}"/>`

      if (item.children) {
        for (const child of item.children) {
          navPoint += `
      <navPoint id="navpoint${playOrder}" playOrder="${playOrder++}">
        <navLabel><text>${this.escapeHtml(child.title)}</text></navLabel>
        <content src="${child.href}"/>
      </navPoint>`
        }
      }

      navPoint += `
    </navPoint>`
      return navPoint
    }).join('\n    ')

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
</ncx>`
  }

  /**
   * 生成 nav.xhtml
   */
  private generateNavXhtml(toc: TocItem[]): string {
    const renderTocItems = (items: TocItem[]): string => {
      return items.map((item) => {
        let li = `<li><a href="${item.href}">${this.escapeHtml(item.title)}</a>`
        if (item.children && item.children.length > 0) {
          li += `\n<ol>\n${renderTocItems(item.children)}</ol>`
        }
        li += '</li>'
        return li
      }).join('\n')
    }

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
</html>`
  }

  /**
   * 生成样式表
   */
  private generateStyles(): string {
    if (this.options.css) {
      return this.options.css
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
`
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
