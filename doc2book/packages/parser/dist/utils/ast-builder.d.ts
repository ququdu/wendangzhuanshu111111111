/**
 * AST 构建器
 * 用于构建统一的抽象语法树
 */
import type { UnifiedAST, ContentNode, DocumentMetadata, Reference, Asset } from '@doc2book/shared';
/**
 * AST 构建器类
 */
export declare class AstBuilder {
    private id;
    private sourceFile;
    private content;
    private references;
    private assets;
    private metadata;
    constructor(sourceFile: string);
    /**
     * 设置文档元数据
     */
    setMetadata(metadata: Partial<DocumentMetadata>): this;
    /**
     * 添加标题节点
     */
    addHeading(text: string, level?: number): this;
    /**
     * 添加段落节点
     */
    addParagraph(text: string): this;
    /**
     * 添加列表节点
     */
    addList(items: string[], ordered?: boolean): this;
    /**
     * 添加代码块节点
     */
    addCodeBlock(code: string, language?: string): this;
    /**
     * 添加引用块节点
     */
    addBlockquote(text: string): this;
    /**
     * 添加表格节点
     */
    addTable(rows: string[][], hasHeader?: boolean): this;
    /**
     * 添加图片节点
     */
    addImage(id: string, caption?: string, sourceLocation?: {
        file: string;
        page?: number;
    }): this;
    /**
     * 添加脚注节点
     */
    addFootnote(id: string, text: string): this;
    /**
     * 添加引用
     */
    addReference(reference: Omit<Reference, 'id'>): this;
    /**
     * 添加资源（图片、表格等）
     */
    addAsset(asset: Omit<Asset, 'id'>): string;
    /**
     * 添加通用内容节点
     */
    addNode(node: ContentNode): this;
    /**
     * 批量添加内容节点
     */
    addNodes(nodes: ContentNode[]): this;
    /**
     * 从文本解析内容
     * 自动识别标题、段落、列表等
     */
    parseText(text: string): this;
    /**
     * 构建最终的 AST
     */
    build(): UnifiedAST;
    /**
     * 根据文件名检测格式
     */
    private detectFormat;
    /**
     * 获取当前内容节点数量
     */
    getNodeCount(): number;
    /**
     * 获取当前资源数量
     */
    getAssetCount(): number;
    /**
     * 清空构建器
     */
    clear(): this;
}
