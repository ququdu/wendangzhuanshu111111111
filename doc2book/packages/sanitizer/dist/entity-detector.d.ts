/**
 * 实体检测器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { DetectionResult, SanitizeOptions } from './types';
export declare class EntityDetector {
    private providerManager;
    constructor(providerManager: ProviderManager);
    detect(text: string, options?: SanitizeOptions): Promise<DetectionResult>;
    private detectByRules;
    private detectByAI;
}
