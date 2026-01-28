/**
 * 统一去痕迹处理器
 */
import type { UnifiedAST } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { SanitizeOptions } from './types';
export declare class Sanitizer {
    private detector;
    private replacer;
    private validator;
    constructor(providerManager: ProviderManager);
    sanitize(ast: UnifiedAST, options?: SanitizeOptions): Promise<{
        success: boolean;
        error?: string;
        sanitizedAst?: UnifiedAST;
        totalReplacements?: number;
    }>;
    private sanitizeNodes;
    private countReplacements;
}
