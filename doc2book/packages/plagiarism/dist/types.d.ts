/**
 * 抄袭检测模块类型定义
 */
export interface SimilarityResult {
    success: boolean;
    error?: string;
    score: number;
    matches: Array<{
        sourceText: string;
        matchedText: string;
        similarity: number;
        sourceId?: string;
    }>;
    checkTime?: number;
}
export interface PlagiarismReport {
    success: boolean;
    error?: string;
    overallScore: number;
    originalityScore: number;
    totalChecked: number;
    flaggedSections: Array<{
        text: string;
        similarity: number;
        source?: string;
        suggestion?: string;
    }>;
    summary: string;
    generatedAt: Date;
}
export interface CheckOptions {
    threshold?: number;
    chunkSize?: number;
    maxMatches?: number;
    sources?: string[];
    providerId?: string;
}
export interface VectorEntry {
    id: string;
    text: string;
    vector: number[];
    metadata?: Record<string, any>;
}
