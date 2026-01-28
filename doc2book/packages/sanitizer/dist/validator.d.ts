/**
 * 去痕迹验证器
 */
import type { ValidationResult } from './types';
import type { ProviderManager } from '@doc2book/providers';
export declare class SanitizeValidator {
    private detector;
    constructor(providerManager: ProviderManager);
    validate(text: string): Promise<ValidationResult>;
}
