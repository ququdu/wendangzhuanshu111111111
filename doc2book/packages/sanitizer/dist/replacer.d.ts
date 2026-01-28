/**
 * 内容替换器
 */
import type { SanitizeResult } from '@doc2book/shared';
import type { DetectionResult, SanitizeOptions } from './types';
export declare class ContentReplacer {
    private defaultReplacements;
    replace(text: string, entities: NonNullable<DetectionResult['entities']>, options?: SanitizeOptions): SanitizeResult;
}
