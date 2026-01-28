/**
 * 内容分析器
 * 深度理解文档内容，提取核心信息
 */
import type { UnifiedAST } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { AnalysisResult, AnalysisOptions } from './types';
/**
 * 内容分析器类
 */
export declare class ContentAnalyzer {
    private providerManager;
    constructor(providerManager: ProviderManager);
    /**
     * 分析文档内容
     */
    analyze(ast: UnifiedAST, options?: AnalysisOptions): Promise<AnalysisResult>;
    /**
     * 提取文本内容
     */
    private extractText;
    /**
     * 获取系统提示
     */
    private getSystemPrompt;
    /**
     * 构建分析提示
     */
    private buildAnalysisPrompt;
    /**
     * 解析 AI 响应
     */
    private parseAnalysisResponse;
    /**
     * 解析文本响应（备用方案）
     */
    private parseTextResponse;
}
