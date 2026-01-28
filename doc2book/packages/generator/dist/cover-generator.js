"use strict";
/**
 * 封面生成器
 * 生成书籍封面图片
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
exports.CoverGenerator = void 0;
/**
 * 封面生成器类
 * 注意：这是一个简化实现，实际应用中可能需要使用 canvas 或其他图像处理库
 */
class CoverGenerator {
    defaultOptions = {
        title: '',
        author: '',
        backgroundColor: '#1a1a2e',
        textColor: '#ffffff',
        width: 1600,
        height: 2560,
        format: 'png',
    };
    /**
     * 生成封面
     */
    async generate(options, outputPath) {
        const opts = { ...this.defaultOptions, ...options };
        try {
            // 如果提供了背景图片，直接使用
            if (opts.backgroundImage) {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                await fs.copyFile(opts.backgroundImage, outputPath);
                return { success: true };
            }
            // 生成简单的 SVG 封面
            const svg = this.generateSvgCover(opts);
            // 写入 SVG 文件
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const svgPath = outputPath.replace(/\.(png|jpeg|jpg)$/i, '.svg');
            await fs.writeFile(svgPath, svg);
            // 注意：将 SVG 转换为 PNG/JPEG 需要额外的库（如 sharp）
            // 这里只生成 SVG，实际应用中需要进行转换
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '生成封面失败',
            };
        }
    }
    /**
     * 生成 SVG 封面
     */
    generateSvgCover(options) {
        const { title, subtitle, author, backgroundColor, textColor } = options;
        const width = options.width ?? 1600;
        const height = options.height ?? 2560;
        // 计算文字位置
        const titleY = height * 0.35;
        const subtitleY = height * 0.45;
        const authorY = height * 0.7;
        // 计算字体大小
        const titleFontSize = Math.min(width * 0.08, 120);
        const subtitleFontSize = titleFontSize * 0.6;
        const authorFontSize = titleFontSize * 0.5;
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
</svg>`;
    }
    /**
     * 生成渐变背景封面
     */
    generateGradientCover(options) {
        const merged = {
            ...this.defaultOptions,
            ...options,
        };
        const { title, subtitle, author, textColor } = merged;
        const width = merged.width ?? 1600;
        const height = merged.height ?? 2560;
        const gradientColors = options.gradientColors || ['#667eea', '#764ba2'];
        const titleY = height * 0.35;
        const subtitleY = height * 0.45;
        const authorY = height * 0.7;
        const titleFontSize = Math.min(width * 0.08, 120);
        const subtitleFontSize = titleFontSize * 0.6;
        const authorFontSize = titleFontSize * 0.5;
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
</svg>`;
    }
    /**
     * XML 转义
     */
    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
exports.CoverGenerator = CoverGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY292ZXItZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvdmVyLWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJSDs7O0dBR0c7QUFDSCxNQUFhLGNBQWM7SUFDakIsY0FBYyxHQUFpQjtRQUNyQyxLQUFLLEVBQUUsRUFBRTtRQUNULE1BQU0sRUFBRSxFQUFFO1FBQ1YsZUFBZSxFQUFFLFNBQVM7UUFDMUIsU0FBUyxFQUFFLFNBQVM7UUFDcEIsS0FBSyxFQUFFLElBQUk7UUFDWCxNQUFNLEVBQUUsSUFBSTtRQUNaLE1BQU0sRUFBRSxLQUFLO0tBQ2QsQ0FBQTtJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFFBQVEsQ0FDWixPQUFxQixFQUNyQixVQUFrQjtRQUVsQixNQUFNLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLE9BQU8sRUFBRSxDQUFBO1FBRW5ELElBQUksQ0FBQztZQUNILGlCQUFpQjtZQUNqQixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxFQUFFLEdBQUcsd0RBQWEsYUFBYSxHQUFDLENBQUE7Z0JBQ3RDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFBO1lBQzFCLENBQUM7WUFFRCxlQUFlO1lBQ2YsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBRXZDLFlBQVk7WUFDWixNQUFNLEVBQUUsR0FBRyx3REFBYSxhQUFhLEdBQUMsQ0FBQTtZQUN0QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxD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QUFDLElBQUksRUFBRSxNQUFNLENBQUM7YUFDckIsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7YUFDckIsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7YUFDdkIsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM1QixDQUFDO0NBQ0Y7QUE5S0Qsd0NBOEtDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlsIHpnaLnlJ/miJDlmahcbiAqIOeUn+aIkOS5puexjeWwgemdouWbvueJh1xuICovXG5cbmltcG9ydCB0eXBlIHsgQ292ZXJPcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiDlsIHpnaLnlJ/miJDlmajnsbtcbiAqIOazqOaEj++8mui/meaYr+S4gOS4queugOWMluWunueOsO+8jOWunumZheW6lOeUqOS4reWPr+iDvemcgOimgeS9v+eUqCBjYW52YXMg5oiW5YW25LuW5Zu+5YOP5aSE55CG5bqTXG4gKi9cbmV4cG9ydCBjbGFzcyBDb3ZlckdlbmVyYXRvciB7XG4gIHByaXZhdGUgZGVmYXVsdE9wdGlvbnM6IENvdmVyT3B0aW9ucyA9IHtcbiAgICB0aXRsZTogJycsXG4gICAgYXV0aG9yOiAnJyxcbiAgICBiYWNrZ3JvdW5kQ29sb3I6ICcjMWExYTJlJyxcbiAgICB0ZXh0Q29sb3I6ICcjZmZmZmZmJyxcbiAgICB3aWR0aDogMTYwMCxcbiAgICBoZWlnaHQ6IDI1NjAsXG4gICAgZm9ybWF0OiAncG5nJyxcbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDlsIHpnaJcbiAgICovXG4gIGFzeW5jIGdlbmVyYXRlKFxuICAgIG9wdGlvbnM6IENvdmVyT3B0aW9ucyxcbiAgICBvdXRwdXRQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICBjb25zdCBvcHRzID0geyAuLi50aGlzLmRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyDlpoLmnpzmj5Dkvpvkuobog4zmma/lm77niYfvvIznm7TmjqXkvb/nlKhcbiAgICAgIGlmIChvcHRzLmJhY2tncm91bmRJbWFnZSkge1xuICAgICAgICBjb25zdCBmcyA9IGF3YWl0IGltcG9ydCgnZnMvcHJvbWlzZXMnKVxuICAgICAgICBhd2FpdCBmcy5jb3B5RmlsZShvcHRzLmJhY2tncm91bmRJbWFnZSwgb3V0cHV0UGF0aClcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9XG4gICAgICB9XG5cbiAgICAgIC8vIOeUn+aIkOeugOWNleeahCBTVkcg5bCB6Z2iXG4gICAgICBjb25zdCBzdmcgPSB0aGlzLmdlbmVyYXRlU3ZnQ292ZXIob3B0cylcblxuICAgICAgLy8g5YaZ5YWlIFNWRyDmlofku7ZcbiAgICAgIGNvbnN0IGZzID0gYXdhaXQgaW1wb3J0KCdmcy9wcm9taXNlcycpXG4gICAgICBjb25zdCBzdmdQYXRoID0gb3V0cHV0UGF0aC5yZXBsYWNlKC9cXC4ocG5nfGpwZWd8anBnKSQvaSwgJy5zdmcnKVxuICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKHN2Z1BhdGgsIHN2ZylcblxuICAgICAgLy8g5rOo5oSP77ya5bCGIFNWRyDovazmjaLkuLogUE5HL0pQRUcg6ZyA6KaB6aKd5aSW55qE5bqT77yI5aaCIHNoYXJw77yJXG4gICAgICAvLyDov5nph4zlj6rnlJ/miJAgU1ZH77yM5a6e6ZmF5bqU55So5Lit6ZyA6KaB6L+b6KGM6L2s5o2iXG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+eUn+aIkOWwgemdouWksei0pScsXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkCBTVkcg5bCB6Z2iXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlU3ZnQ292ZXIob3B0aW9uczogQ292ZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBjb25zdCB7IHRpdGxlLCBzdWJ0aXRsZSwgYXV0aG9yLCBiYWNrZ3JvdW5kQ29sb3IsIHRleHRDb2xvciB9ID0gb3B0aW9uc1xuICAgIGNvbnN0IHdpZHRoID0gb3B0aW9ucy53aWR0aCA/PyAxNjAwXG4gICAgY29uc3QgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgPz8gMjU2MFxuXG4gICAgLy8g6K6h566X5paH5a2X5L2N572uXG4gICAgY29uc3QgdGl0bGVZID0gaGVpZ2h0ICogMC4zNVxuICAgIGNvbnN0IHN1YnRpdGxlWSA9IGhlaWdodCAqIDAuNDVcbiAgICBjb25zdCBhdXRob3JZID0gaGVpZ2h0ICogMC43XG5cbiAgICAvLyDorqHnrpflrZfkvZPlpKflsI9cbiAgICBjb25zdCB0aXRsZUZvbnRTaXplID0gTWF0aC5taW4od2lkdGggKiAwLjA4LCAxMjApXG4gICAgY29uc3Qgc3VidGl0bGVGb250U2l6ZSA9IHRpdGxlRm9udFNpemUgKiAwLjZcbiAgICBjb25zdCBhdXRob3JGb250U2l6ZSA9IHRpdGxlRm9udFNpemUgKiAwLjVcblxuICAgIHJldHVybiBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XG48c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIiR7d2lkdGh9XCIgaGVpZ2h0PVwiJHtoZWlnaHR9XCIgdmlld0JveD1cIjAgMCAke3dpZHRofSAke2hlaWdodH1cIj5cbiAgPCEtLSDog4zmma8gLS0+XG4gIDxyZWN0IHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiBmaWxsPVwiJHtiYWNrZ3JvdW5kQ29sb3J9XCIvPlxuXG4gIDwhLS0g6KOF6aWw57q/IC0tPlxuICA8bGluZSB4MT1cIiR7d2lkdGggKiAwLjF9XCIgeTE9XCIke2hlaWdodCAqIDAuMjV9XCIgeDI9XCIke3dpZHRoICogMC45fVwiIHkyPVwiJHtoZWlnaHQgKiAwLjI1fVwiXG4gICAgICAgIHN0cm9rZT1cIiR7dGV4dENvbG9yfVwiIHN0cm9rZS13aWR0aD1cIjJcIiBvcGFjaXR5PVwiMC4zXCIvPlxuICA8bGluZSB4MT1cIiR7d2lkdGggKiAwLjF9XCIgeTE9XCIke2hlaWdodCAqIDAuNTV9XCIgeDI9XCIke3dpZHRoICogMC45fVwiIHkyPVwiJHtoZWlnaHQgKiAwLjU1fVwiXG4gICAgICAgIHN0cm9rZT1cIiR7dGV4dENvbG9yfVwiIHN0cm9rZS13aWR0aD1cIjJcIiBvcGFjaXR5PVwiMC4zXCIvPlxuXG4gIDwhLS0g5qCH6aKYIC0tPlxuICA8dGV4dCB4PVwiJHt3aWR0aCAvIDJ9XCIgeT1cIiR7dGl0bGVZfVwiXG4gICAgICAgIGZvbnQtZmFtaWx5PVwiR2VvcmdpYSwgc2VyaWZcIiBmb250LXNpemU9XCIke3RpdGxlRm9udFNpemV9XCIgZm9udC13ZWlnaHQ9XCJib2xkXCJcbiAgICAgICAgZmlsbD1cIiR7dGV4dENvbG9yfVwiIHRleHQtYW5jaG9yPVwibWlkZGxlXCI+XG4gICAgJHt0aGlzLmVzY2FwZVhtbCh0aXRsZSl9XG4gIDwvdGV4dD5cblxuICAke3N1YnRpdGxlID8gYFxuICA8IS0tIOWJr+agh+mimCAtLT5cbiAgPHRleHQgeD1cIiR7d2lkdGggLyAyfVwiIHk9XCIke3N1YnRpdGxlWX1cIlxuICAgICAgICBmb250LWZhbWlseT1cIkdlb3JnaWEsIHNlcmlmXCIgZm9udC1zaXplPVwiJHtzdWJ0aXRsZUZvbnRTaXplfVwiXG4gICAgICAgIGZpbGw9XCIke3RleHRDb2xvcn1cIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiIG9wYWNpdHk9XCIwLjhcIj5cbiAgICAke3RoaXMuZXNjYXBlWG1sKHN1YnRpdGxlKX1cbiAgPC90ZXh0PlxuICBgIDogJyd9XG5cbiAgPCEtLSDkvZzogIUgLS0+XG4gIDx0ZXh0IHg9XCIke3dpZHRoIC8gMn1cIiB5PVwiJHthdXRob3JZfVwiXG4gICAgICAgIGZvbnQtZmFtaWx5PVwiQXJpYWwsIHNhbnMtc2VyaWZcIiBmb250LXNpemU9XCIke2F1dGhvckZvbnRTaXplfVwiXG4gICAgICAgIGZpbGw9XCIke3RleHRDb2xvcn1cIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiIG9wYWNpdHk9XCIwLjlcIj5cbiAgICAke3RoaXMuZXNjYXBlWG1sKGF1dGhvcil9XG4gIDwvdGV4dD5cblxuICA8IS0tIOW6lemDqOijhemlsCAtLT5cbiAgPHJlY3QgeD1cIiR7d2lkdGggKiAwLjN9XCIgeT1cIiR7aGVpZ2h0ICogMC44NX1cIiB3aWR0aD1cIiR7d2lkdGggKiAwLjR9XCIgaGVpZ2h0PVwiNFwiXG4gICAgICAgIGZpbGw9XCIke3RleHRDb2xvcn1cIiBvcGFjaXR5PVwiMC41XCIvPlxuPC9zdmc+YFxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOa4kOWPmOiDjOaZr+WwgemdolxuICAgKi9cbiAgZ2VuZXJhdGVHcmFkaWVudENvdmVyKFxuICAgIG9wdGlvbnM6IENvdmVyT3B0aW9ucyAmIHsgZ3JhZGllbnRDb2xvcnM/OiBzdHJpbmdbXSB9XG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgbWVyZ2VkID0ge1xuICAgICAgLi4udGhpcy5kZWZhdWx0T3B0aW9ucyxcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgfVxuICAgIGNvbnN0IHsgdGl0bGUsIHN1YnRpdGxlLCBhdXRob3IsIHRleHRDb2xvciB9ID0gbWVyZ2VkXG4gICAgY29uc3Qgd2lkdGggPSBtZXJnZWQud2lkdGggPz8gMTYwMFxuICAgIGNvbnN0IGhlaWdodCA9IG1lcmdlZC5oZWlnaHQgPz8gMjU2MFxuICAgIGNvbnN0IGdyYWRpZW50Q29sb3JzID0gb3B0aW9ucy5ncmFkaWVudENvbG9ycyB8fCBbJyM2NjdlZWEnLCAnIzc2NGJhMiddXG5cbiAgICBjb25zdCB0aXRsZVkgPSBoZWlnaHQgKiAwLjM1XG4gICAgY29uc3Qgc3VidGl0bGVZID0gaGVpZ2h0ICogMC40NVxuICAgIGNvbnN0IGF1dGhvclkgPSBoZWlnaHQgKiAwLjdcbiAgICBjb25zdCB0aXRsZUZvbnRTaXplID0gTWF0aC5taW4od2lkdGggKiAwLjA4LCAxMjApXG4gICAgY29uc3Qgc3VidGl0bGVGb250U2l6ZSA9IHRpdGxlRm9udFNpemUgKiAwLjZcbiAgICBjb25zdCBhdXRob3JGb250U2l6ZSA9IHRpdGxlRm9udFNpemUgKiAwLjVcblxuICAgIHJldHVybiBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XG48c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIiR7d2lkdGh9XCIgaGVpZ2h0PVwiJHtoZWlnaHR9XCIgdmlld0JveD1cIjAgMCAke3dpZHRofSAke2hlaWdodH1cIj5cbiAgPGRlZnM+XG4gICAgPGxpbmVhckdyYWRpZW50IGlkPVwiYmdHcmFkaWVudFwiIHgxPVwiMCVcIiB5MT1cIjAlXCIgeDI9XCIxMDAlXCIgeTI9XCIxMDAlXCI+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIwJVwiIHN0eWxlPVwic3RvcC1jb2xvcjoke2dyYWRpZW50Q29sb3JzWzBdfTtzdG9wLW9wYWNpdHk6MVwiIC8+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIxMDAlXCIgc3R5bGU9XCJzdG9wLWNvbG9yOiR7Z3JhZGllbnRDb2xvcnNbMV19O3N0b3Atb3BhY2l0eToxXCIgLz5cbiAgICA8L2xpbmVhckdyYWRpZW50PlxuICA8L2RlZnM+XG5cbiAgPCEtLSDmuJDlj5jog4zmma8gLS0+XG4gIDxyZWN0IHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiBmaWxsPVwidXJsKCNiZ0dyYWRpZW50KVwiLz5cblxuICA8IS0tIOagh+mimCAtLT5cbiAgPHRleHQgeD1cIiR7d2lkdGggLyAyfVwiIHk9XCIke3RpdGxlWX1cIlxuICAgICAgICBmb250LWZhbWlseT1cIkdlb3JnaWEsIHNlcmlmXCIgZm9udC1zaXplPVwiJHt0aXRsZUZvbnRTaXplfVwiIGZvbnQtd2VpZ2h0PVwiYm9sZFwiXG4gICAgICAgIGZpbGw9XCIke3RleHRDb2xvcn1cIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiPlxuICAgICR7dGhpcy5lc2NhcGVYbWwodGl0bGUpfVxuICA8L3RleHQ+XG5cbiAgJHtzdWJ0aXRsZSA/IGBcbiAgPHRleHQgeD1cIiR7d2lkdGggLyAyfVwiIHk9XCIke3N1YnRpdGxlWX1cIlxuICAgICAgICBmb250LWZhbWlseT1cIkdlb3JnaWEsIHNlcmlmXCIgZm9udC1zaXplPVwiJHtzdWJ0aXRsZUZvbnRTaXplfVwiXG4gICAgICAgIGZpbGw9XCIke3RleHRDb2xvcn1cIiB0ZXh0LWFuY2hvcj1cIm1pZGRsZVwiIG9wYWNpdHk9XCIwLjlcIj5cbiAgICAke3RoaXMuZXNjYXBlWG1sKHN1YnRpdGxlKX1cbiAgPC90ZXh0PlxuICBgIDogJyd9XG5cbiAgPHRleHQgeD1cIiR7d2lkdGggLyAyfVwiIHk9XCIke2F1dGhvcll9XCJcbiAgICAgICAgZm9udC1mYW1pbHk9XCJBcmlhbCwgc2Fucy1zZXJpZlwiIGZvbnQtc2l6ZT1cIiR7YXV0aG9yRm9udFNpemV9XCJcbiAgICAgICAgZmlsbD1cIiR7dGV4dENvbG9yfVwiIHRleHQtYW5jaG9yPVwibWlkZGxlXCI+XG4gICAgJHt0aGlzLmVzY2FwZVhtbChhdXRob3IpfVxuICA8L3RleHQ+XG48L3N2Zz5gXG4gIH1cblxuICAvKipcbiAgICogWE1MIOi9rOS5iVxuICAgKi9cbiAgcHJpdmF0ZSBlc2NhcGVYbWwodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGV4dFxuICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgIC5yZXBsYWNlKC8nL2csICcmYXBvczsnKVxuICB9XG59XG4iXX0=