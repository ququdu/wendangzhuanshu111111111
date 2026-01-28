/**
 * 结构检测器
 * 识别文档的层次结构
 */
import type { UnifiedAST } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { StructureResult, StructureOptions } from './types';
/**
 * 结构检测器类
 */
export declare class StructureDetector {
    private providerManager;
    constructor(providerManager: ProviderManager);
    /**
     * 检测文档结构
     */
    detect(ast: UnifiedAST, options?: StructureOptions): Promise<StructureResult>;
    /**
     * 基于规则检测结构
     */
    private detectByRules;
    /**
     * 使用 AI 增强结构检测
     */
    private enhanceWithAI;
    /**
     * 生成目录
     */
    private generateTOC;
    /**
     * 提取标题
     */
    private extractTitle;
    /**
     * 获取预览文本
     */
    private getPreview;
    /**
     * 提取文本
     */
    private extractText;
    /**
     * 截断文本
     */
    private truncateText;
}
