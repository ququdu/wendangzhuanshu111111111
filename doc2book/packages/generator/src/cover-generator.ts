/**
 * 封面生成器
 * 生成书籍封面图片
 */

import type { CoverOptions } from './types'

/**
 * 封面生成器类
 * 注意：这是一个简化实现，实际应用中可能需要使用 canvas 或其他图像处理库
 */
export class CoverGenerator {
  private defaultOptions: CoverOptions = {
    title: '',
    author: '',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
    width: 1600,
    height: 2560,
    format: 'png',
  }

  /**
   * 生成封面
   */
  async generate(
    options: CoverOptions,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    const opts = { ...this.defaultOptions, ...options }

    try {
      // 如果提供了背景图片，直接使用
      if (opts.backgroundImage) {
        const fs = await import('fs/promises')
        await fs.copyFile(opts.backgroundImage, outputPath)
        return { success: true }
      }

      // 生成简单的 SVG 封面
      const svg = this.generateSvgCover(opts)

      // 写入 SVG 文件
      const fs = await import('fs/promises')
      const svgPath = outputPath.replace(/\.(png|jpeg|jpg)$/i, '.svg')
      await fs.writeFile(svgPath, svg)

      // 注意：将 SVG 转换为 PNG/JPEG 需要额外的库（如 sharp）
      // 这里只生成 SVG，实际应用中需要进行转换

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成封面失败',
      }
    }
  }

  /**
   * 生成 SVG 封面
   */
  private generateSvgCover(options: CoverOptions): string {
    const { title, subtitle, author, backgroundColor, textColor } = options
    const width = options.width ?? 1600
    const height = options.height ?? 2560

    // 计算文字位置
    const titleY = height * 0.35
    const subtitleY = height * 0.45
    const authorY = height * 0.7

    // 计算字体大小
    const titleFontSize = Math.min(width * 0.08, 120)
    const subtitleFontSize = titleFontSize * 0.6
    const authorFontSize = titleFontSize * 0.5

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- 背景 -->
  <rect width="100%" height="100%" fill="${backgroundColor}"/>

  <!-- 装饰线 -->
  <line x1="${width * 0.1}" y1="${height * 0.25}" x2="${width * 0.9}" y2="${height * 0.25}"
        stroke="${textColor}" stroke-width="2" opacity="0.3"/>
  <line x1="${width * 0.1}" y1="${height * 0.55}" x2="${width * 0.9}" y2="${height * 0.55}"
        stroke="${textColor}" stroke-width="2" opacity="0.3"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="${titleY}"
        font-family="Georgia, serif" font-size="${titleFontSize}" font-weight="bold"
        fill="${textColor}" text-anchor="middle">
    ${this.escapeXml(title)}
  </text>

  ${subtitle ? `
  <!-- 副标题 -->
  <text x="${width / 2}" y="${subtitleY}"
        font-family="Georgia, serif" font-size="${subtitleFontSize}"
        fill="${textColor}" text-anchor="middle" opacity="0.8">
    ${this.escapeXml(subtitle)}
  </text>
  ` : ''}

  <!-- 作者 -->
  <text x="${width / 2}" y="${authorY}"
        font-family="Arial, sans-serif" font-size="${authorFontSize}"
        fill="${textColor}" text-anchor="middle" opacity="0.9">
    ${this.escapeXml(author)}
  </text>

  <!-- 底部装饰 -->
  <rect x="${width * 0.3}" y="${height * 0.85}" width="${width * 0.4}" height="4"
        fill="${textColor}" opacity="0.5"/>
</svg>`
  }

  /**
   * 生成渐变背景封面
   */
  generateGradientCover(
    options: CoverOptions & { gradientColors?: string[] }
  ): string {
    const merged = {
      ...this.defaultOptions,
      ...options,
    }
    const { title, subtitle, author, textColor } = merged
    const width = merged.width ?? 1600
    const height = merged.height ?? 2560
    const gradientColors = options.gradientColors || ['#667eea', '#764ba2']

    const titleY = height * 0.35
    const subtitleY = height * 0.45
    const authorY = height * 0.7
    const titleFontSize = Math.min(width * 0.08, 120)
    const subtitleFontSize = titleFontSize * 0.6
    const authorFontSize = titleFontSize * 0.5

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradientColors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradientColors[1]};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- 渐变背景 -->
  <rect width="100%" height="100%" fill="url(#bgGradient)"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="${titleY}"
        font-family="Georgia, serif" font-size="${titleFontSize}" font-weight="bold"
        fill="${textColor}" text-anchor="middle">
    ${this.escapeXml(title)}
  </text>

  ${subtitle ? `
  <text x="${width / 2}" y="${subtitleY}"
        font-family="Georgia, serif" font-size="${subtitleFontSize}"
        fill="${textColor}" text-anchor="middle" opacity="0.9">
    ${this.escapeXml(subtitle)}
  </text>
  ` : ''}

  <text x="${width / 2}" y="${authorY}"
        font-family="Arial, sans-serif" font-size="${authorFontSize}"
        fill="${textColor}" text-anchor="middle">
    ${this.escapeXml(author)}
  </text>
</svg>`
  }

  /**
   * XML 转义
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
