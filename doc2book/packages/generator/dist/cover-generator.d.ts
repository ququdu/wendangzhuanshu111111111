/**
 * 封面生成器
 * 生成书籍封面图片
 */
import type { CoverOptions } from './types';
/**
 * 封面生成器类
 * 注意：这是一个简化实现，实际应用中可能需要使用 canvas 或其他图像处理库
 */
export declare class CoverGenerator {
    private defaultOptions;
    /**
     * 生成封面
     */
    generate(options: CoverOptions, outputPath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * 生成 SVG 封面
     */
    private generateSvgCover;
    /**
     * 生成渐变背景封面
     */
    generateGradientCover(options: CoverOptions & {
        gradientColors?: string[];
    }): string;
    /**
     * XML 转义
     */
    private escapeXml;
}
