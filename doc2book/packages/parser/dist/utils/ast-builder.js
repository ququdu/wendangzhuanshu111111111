"use strict";
/**
 * AST 构建器
 * 用于构建统一的抽象语法树
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstBuilder = void 0;
const uuid_1 = require("uuid");
/**
 * AST 构建器类
 */
class AstBuilder {
    id;
    sourceFile;
    content = [];
    references = [];
    assets = [];
    metadata = {};
    constructor(sourceFile) {
        this.id = (0, uuid_1.v4)();
        this.sourceFile = sourceFile;
    }
    /**
     * 设置文档元数据
     */
    setMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
        return this;
    }
    /**
     * 添加标题节点
     */
    addHeading(text, level = 1) {
        this.content.push({
            type: 'heading',
            level: Math.min(6, Math.max(1, level)),
            text,
        });
        return this;
    }
    /**
     * 添加段落节点
     */
    addParagraph(text) {
        if (text.trim()) {
            this.content.push({
                type: 'paragraph',
                text,
            });
        }
        return this;
    }
    /**
     * 添加列表节点
     */
    addList(items, ordered = false) {
        const listItems = items.map((item) => ({
            type: 'list-item',
            text: item,
        }));
        this.content.push({
            type: 'list',
            children: listItems,
            attributes: { ordered },
        });
        return this;
    }
    /**
     * 添加代码块节点
     */
    addCodeBlock(code, language) {
        this.content.push({
            type: 'code',
            text: code,
            attributes: { language },
        });
        return this;
    }
    /**
     * 添加引用块节点
     */
    addBlockquote(text) {
        this.content.push({
            type: 'blockquote',
            text,
        });
        return this;
    }
    /**
     * 添加表格节点
     */
    addTable(rows, hasHeader = true) {
        const tableRows = rows.map((row, rowIndex) => ({
            type: 'table-row',
            children: row.map((cell) => ({
                type: 'table-cell',
                text: cell,
                attributes: { isHeader: hasHeader && rowIndex === 0 },
            })),
        }));
        this.content.push({
            type: 'table',
            children: tableRows,
            attributes: { hasHeader },
        });
        return this;
    }
    /**
     * 添加图片节点
     */
    addImage(id, caption, sourceLocation) {
        this.content.push({
            type: 'image',
            text: caption,
            attributes: { assetId: id },
            sourceLocation,
        });
        return this;
    }
    /**
     * 添加脚注节点
     */
    addFootnote(id, text) {
        this.content.push({
            type: 'footnote',
            text,
            attributes: { id },
        });
        return this;
    }
    /**
     * 添加引用
     */
    addReference(reference) {
        this.references.push({
            id: (0, uuid_1.v4)(),
            ...reference,
        });
        return this;
    }
    /**
     * 添加资源（图片、表格等）
     */
    addAsset(asset) {
        const id = (0, uuid_1.v4)();
        this.assets.push({
            id,
            ...asset,
        });
        return id;
    }
    /**
     * 添加通用内容节点
     */
    addNode(node) {
        this.content.push(node);
        return this;
    }
    /**
     * 批量添加内容节点
     */
    addNodes(nodes) {
        this.content.push(...nodes);
        return this;
    }
    /**
     * 从文本解析内容
     * 自动识别标题、段落、列表等
     */
    parseText(text) {
        const lines = text.split('\n');
        let currentParagraph = [];
        const flushParagraph = () => {
            if (currentParagraph.length > 0) {
                const paragraphText = currentParagraph.join(' ').trim();
                if (paragraphText) {
                    this.addParagraph(paragraphText);
                }
                currentParagraph = [];
            }
        };
        for (const line of lines) {
            const trimmedLine = line.trim();
            // 空行：结束当前段落
            if (!trimmedLine) {
                flushParagraph();
                continue;
            }
            // 检测标题（以 # 开头或全大写）
            const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                flushParagraph();
                this.addHeading(headingMatch[2], headingMatch[1].length);
                continue;
            }
            // 检测列表项
            const listMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
            if (listMatch) {
                flushParagraph();
                // 收集连续的列表项
                const listItems = [listMatch[1]];
                // 这里简化处理，只添加单个列表项
                this.addList(listItems, false);
                continue;
            }
            // 检测有序列表
            const orderedListMatch = trimmedLine.match(/^\d+[.)]\s+(.+)$/);
            if (orderedListMatch) {
                flushParagraph();
                this.addList([orderedListMatch[1]], true);
                continue;
            }
            // 检测引用块
            if (trimmedLine.startsWith('>')) {
                flushParagraph();
                this.addBlockquote(trimmedLine.substring(1).trim());
                continue;
            }
            // 普通文本，添加到当前段落
            currentParagraph.push(trimmedLine);
        }
        // 处理最后一个段落
        flushParagraph();
        return this;
    }
    /**
     * 构建最终的 AST
     */
    build() {
        // 计算字数
        const wordCount = this.content.reduce((count, node) => {
            if (node.text) {
                // 中文按字符计数，英文按单词计数
                const chineseChars = (node.text.match(/[\u4e00-\u9fa5]/g) || []).length;
                const englishWords = (node.text.match(/[a-zA-Z]+/g) || []).length;
                return count + chineseChars + englishWords;
            }
            return count;
        }, 0);
        // 构建完整的元数据
        const fullMetadata = {
            id: this.id,
            filename: this.sourceFile,
            format: this.detectFormat(),
            size: 0, // 需要外部设置
            language: this.metadata.language || 'und',
            createdAt: new Date(),
            updatedAt: new Date(),
            wordCount,
            ...this.metadata,
        };
        return {
            id: this.id,
            sourceFile: this.sourceFile,
            parseTime: new Date(),
            content: this.content,
            metadata: fullMetadata,
            references: this.references,
            assets: this.assets,
        };
    }
    /**
     * 根据文件名检测格式
     */
    detectFormat() {
        const ext = this.sourceFile.toLowerCase().split('.').pop();
        const formatMap = {
            pdf: 'pdf',
            docx: 'docx',
            doc: 'doc',
            md: 'md',
            markdown: 'markdown',
            html: 'html',
            htm: 'html',
            txt: 'txt',
            png: 'image',
            jpg: 'image',
            jpeg: 'image',
            gif: 'image',
            webp: 'image',
            bmp: 'image',
        };
        return formatMap[ext || ''] || 'txt';
    }
    /**
     * 获取当前内容节点数量
     */
    getNodeCount() {
        return this.content.length;
    }
    /**
     * 获取当前资源数量
     */
    getAssetCount() {
        return this.assets.length;
    }
    /**
     * 清空构建器
     */
    clear() {
        this.content = [];
        this.references = [];
        this.assets = [];
        this.metadata = {};
        return this;
    }
}
exports.AstBuilder = AstBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LWJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvYXN0LWJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsK0JBQW1DO0FBV25DOztHQUVHO0FBQ0gsTUFBYSxVQUFVO0lBQ2IsRUFBRSxDQUFRO0lBQ1YsVUFBVSxDQUFRO0lBQ2xCLE9BQU8sR0FBa0IsRUFBRSxDQUFBO0lBQzNCLFVBQVUsR0FBZ0IsRUFBRSxDQUFBO0lBQzVCLE1BQU0sR0FBWSxFQUFFLENBQUE7SUFDcEIsUUFBUSxHQUE4QixFQUFFLENBQUE7SUFFaEQsWUFBWSxVQUFrQjtRQUM1QixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLFFBQW1DO1FBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxRQUFRLEVBQUUsQ0FBQTtRQUNqRCxPQUFPLElBQUksQ0FBQTtJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsQ0FBQztRQUN4QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNoQixJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN0QyxJQUFJO1NBQ0wsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxJQUFJLENBQUE7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZLENBQUMsSUFBWTtRQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxP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O0lBRUQ7O09BRUc7SUFDSCxZQUFZO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtJQUM1QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhO1FBQ1gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtJQUMzQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLO1FBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDaEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7UUFDbEIsT0FBTyxJQUFJLENBQUE7SUFDYixDQUFDO0NBQ0Y7QUE3VUQsZ0NBNlVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU1Qg5p6E5bu65ZmoXG4gKiDnlKjkuo7mnoTlu7rnu5/kuIDnmoTmir3osaHor63ms5XmoJFcbiAqL1xuXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJ1xuaW1wb3J0IHR5cGUge1xuICBVbmlmaWVkQVNULFxuICBDb250ZW50Tm9kZSxcbiAgQ29udGVudE5vZGVUeXBlLFxuICBEb2N1bWVudE1ldGFkYXRhLFxuICBEb2N1bWVudEZvcm1hdCxcbiAgUmVmZXJlbmNlLFxuICBBc3NldCxcbn0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcblxuLyoqXG4gKiBBU1Qg5p6E5bu65Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBBc3RCdWlsZGVyIHtcbiAgcHJpdmF0ZSBpZDogc3RyaW5nXG4gIHByaXZhdGUgc291cmNlRmlsZTogc3RyaW5nXG4gIHByaXZhdGUgY29udGVudDogQ29udGVudE5vZGVbXSA9IFtdXG4gIHByaXZhdGUgcmVmZXJlbmNlczogUmVmZXJlbmNlW10gPSBbXVxuICBwcml2YXRlIGFzc2V0czogQXNzZXRbXSA9IFtdXG4gIHByaXZhdGUgbWV0YWRhdGE6IFBhcnRpYWw8RG9jdW1lbnRNZXRhZGF0YT4gPSB7fVxuXG4gIGNvbnN0cnVjdG9yKHNvdXJjZUZpbGU6IHN0cmluZykge1xuICAgIHRoaXMuaWQgPSB1dWlkdjQoKVxuICAgIHRoaXMuc291cmNlRmlsZSA9IHNvdXJjZUZpbGVcbiAgfVxuXG4gIC8qKlxuICAgKiDorr7nva7mlofmoaPlhYPmlbDmja5cbiAgICovXG4gIHNldE1ldGFkYXRhKG1ldGFkYXRhOiBQYXJ0aWFsPERvY3VtZW50TWV0YWRhdGE+KTogdGhpcyB7XG4gICAgdGhpcy5tZXRhZGF0YSA9IHsgLi4udGhpcy5tZXRhZGF0YSwgLi4ubWV0YWRhdGEgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICog5re75Yqg5qCH6aKY6IqC54K5XG4gICAqL1xuICBhZGRIZWFkaW5nKHRleHQ6IHN0cmluZywgbGV2ZWw6IG51bWJlciA9IDEpOiB0aGlzIHtcbiAgICB0aGlzLmNvbnRlbnQucHVzaCh7XG4gICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICBsZXZlbDogTWF0aC5taW4oNiwgTWF0aC5tYXgoMSwgbGV2ZWwpKSxcbiAgICAgIHRleHQsXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIOa3u+WKoOauteiQveiKgueCuVxuICAgKi9cbiAgYWRkUGFyYWdyYXBoKHRleHQ6IHN0cmluZyk6IHRoaXMge1xuICAgIGlmICh0ZXh0LnRyaW0oKSkge1xuICAgICAgdGhpcy5jb250ZW50LnB1c2goe1xuICAgICAgICB0eXBlOiAncGFyYWdyYXBoJyxcbiAgICAgICAgdGV4dCxcbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICog5re75Yqg5YiX6KGo6IqC54K5XG4gICAqL1xuICBhZGRMaXN0KGl0ZW1zOiBzdHJpbmdbXSwgb3JkZXJlZDogYm9vbGVhbiA9IGZhbHNlKTogdGhpcyB7XG4gICAgY29uc3QgbGlzdEl0ZW1zOiBDb250ZW50Tm9kZVtdID0gaXRlbXMubWFwKChpdGVtKSA9PiAoe1xuICAgICAgdHlwZTogJ2xpc3QtaXRlbScgYXMgQ29udGVudE5vZGVUeXBlLFxuICAgICAgdGV4dDogaXRlbSxcbiAgICB9KSlcblxuICAgIHRoaXMuY29udGVudC5wdXNoKHtcbiAgICAgIHR5cGU6ICdsaXN0JyxcbiAgICAgIGNoaWxkcmVuOiBsaXN0SXRlbXMsXG4gICAgICBhdHRyaWJ1dGVzOiB7IG9yZGVyZWQgfSxcbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICog5re75Yqg5Luj56CB5Z2X6IqC54K5XG4gICAqL1xuICBhZGRDb2RlQmxvY2soY29kZTogc3RyaW5nLCBsYW5ndWFnZT86IHN0cmluZyk6IHRoaXMge1xuICAgIHRoaXMuY29udGVudC5wdXNoKHtcbiAgICAgIHR5cGU6ICdjb2RlJyxcbiAgICAgIHRleHQ6IGNvZGUsXG4gICAgICBhdHRyaWJ1dGVzOiB7IGxhbmd1YWdlIH0sXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIOa3u+WKoOW8leeUqOWdl+iKgueCuVxuICAgKi9cbiAgYWRkQmxvY2txdW90ZSh0ZXh0OiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLmNvbnRlbnQucHVzaCh7XG4gICAgICB0eXBlOiAnYmxvY2txdW90ZScsXG4gICAgICB0ZXh0LFxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiDmt7vliqDooajmoLzoioLngrlcbiAgICovXG4gIGFkZFRhYmxlKHJvd3M6IHN0cmluZ1tdW10sIGhhc0hlYWRlcjogYm9vbGVhbiA9IHRydWUpOiB0aGlzIHtcbiAgICBjb25zdCB0YWJsZVJvd3M6IENvbnRlbnROb2RlW10gPSByb3dzLm1hcCgocm93LCByb3dJbmRleCkgPT4gKHtcbiAgICAgIHR5cGU6ICd0YWJsZS1yb3cnIGFzIENvbnRlbnROb2RlVHlwZSxcbiAgICAgIGNoaWxkcmVuOiByb3cubWFwKChjZWxsKSA9PiAoe1xuICAgICAgICB0eXBlOiAndGFibGUtY2VsbCcgYXMgQ29udGVudE5vZGVUeXBlLFxuICAgICAgICB0ZXh0OiBjZWxsLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7IGlzSGVhZGVyOiBoYXNIZWFkZXIgJiYgcm93SW5kZXggPT09IDAgfSxcbiAgICAgIH0pKSxcbiAgICB9KSlcblxuICAgIHRoaXMuY29udGVudC5wdXNoKHtcbiAgICAgIHR5cGU6ICd0YWJsZScsXG4gICAgICBjaGlsZHJlbjogdGFibGVSb3dzLFxuICAgICAgYXR0cmlidXRlczogeyBoYXNIZWFkZXIgfSxcbiAgICB9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICog5re75Yqg5Zu+54mH6IqC54K5XG4gICAqL1xuICBhZGRJbWFnZShcbiAgICBpZDogc3RyaW5nLFxuICAgIGNhcHRpb24/OiBzdHJpbmcsXG4gICAgc291cmNlTG9jYXRpb24/OiB7IGZpbGU6IHN0cmluZzsgcGFnZT86IG51bWJlciB9XG4gICk6IHRoaXMge1xuICAgIHRoaXMuY29udGVudC5wdXNoKHtcbiAgICAgIHR5cGU6ICdpbWFnZScsXG4gICAgICB0ZXh0OiBjYXB0aW9uLFxuICAgICAgYXR0cmlidXRlczogeyBhc3NldElkOiBpZCB9LFxuICAgICAgc291cmNlTG9jYXRpb24sXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIOa3u+WKoOiEmuazqOiKgueCuVxuICAgKi9cbiAgYWRkRm9vdG5vdGUoaWQ6IHN0cmluZywgdGV4dDogc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy5jb250ZW50LnB1c2goe1xuICAgICAgdHlwZTogJ2Zvb3Rub3RlJyxcbiAgICAgIHRleHQsXG4gICAgICBhdHRyaWJ1dGVzOiB7IGlkIH0sXG4gICAgfSlcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIOa3u+WKoOW8leeUqFxuICAgKi9cbiAgYWRkUmVmZXJlbmNlKHJlZmVyZW5jZTogT21pdDxSZWZlcmVuY2UsICdpZCc+KTogdGhpcyB7XG4gICAgdGhpcy5yZWZlcmVuY2VzLnB1c2goe1xuICAgICAgaWQ6IHV1aWR2NCgpLFxuICAgICAgLi4ucmVmZXJlbmNlLFxuICAgIH0pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiDmt7vliqDotYTmupDvvIjlm77niYfjgIHooajmoLznrYnvvIlcbiAgICovXG4gIGFkZEFzc2V0KGFzc2V0OiBPbWl0PEFzc2V0LCAnaWQnPik6IHN0cmluZyB7XG4gICAgY29uc3QgaWQgPSB1dWlkdjQoKVxuICAgIHRoaXMuYXNzZXRzLnB1c2goe1xuICAgICAgaWQsXG4gICAgICAuLi5hc3NldCxcbiAgICB9KVxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgLyoqXG4gICAqIOa3u+WKoOmAmueUqOWGheWuueiKgueCuVxuICAgKi9cbiAgYWRkTm9kZShub2RlOiBDb250ZW50Tm9kZSk6IHRoaXMge1xuICAgIHRoaXMuY29udGVudC5wdXNoKG5vZGUpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiDmibnph4/mt7vliqDlhoXlrrnoioLngrlcbiAgICovXG4gIGFkZE5vZGVzKG5vZGVzOiBDb250ZW50Tm9kZVtdKTogdGhpcyB7XG4gICAgdGhpcy5jb250ZW50LnB1c2goLi4ubm9kZXMpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiDku47mlofmnKzop6PmnpDlhoXlrrlcbiAgICog6Ieq5Yqo6K+G5Yir5qCH6aKY44CB5q616JC944CB5YiX6KGo562JXG4gICAqL1xuICBwYXJzZVRleHQodGV4dDogc3RyaW5nKTogdGhpcyB7XG4gICAgY29uc3QgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKVxuICAgIGxldCBjdXJyZW50UGFyYWdyYXBoOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBjb25zdCBmbHVzaFBhcmFncmFwaCA9ICgpID0+IHtcbiAgICAgIGlmIChjdXJyZW50UGFyYWdyYXBoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgcGFyYWdyYXBoVGV4dCA9IGN1cnJlbnRQYXJhZ3JhcGguam9pbignICcpLnRyaW0oKVxuICAgICAgICBpZiAocGFyYWdyYXBoVGV4dCkge1xuICAgICAgICAgIHRoaXMuYWRkUGFyYWdyYXBoKHBhcmFncmFwaFRleHQpXG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudFBhcmFncmFwaCA9IFtdXG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpXG5cbiAgICAgIC8vIOepuuihjO+8mue7k+adn+W9k+WJjeauteiQvVxuICAgICAgaWYgKCF0cmltbWVkTGluZSkge1xuICAgICAgICBmbHVzaFBhcmFncmFwaCgpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIOajgOa1i+agh+mimO+8iOS7pSAjIOW8gOWktOaIluWFqOWkp+WGme+8iVxuICAgICAgY29uc3QgaGVhZGluZ01hdGNoID0gdHJpbW1lZExpbmUubWF0Y2goL14oI3sxLDZ9KVxccysoLispJC8pXG4gICAgICBpZiAoaGVhZGluZ01hdGNoKSB7XG4gICAgICAgIGZsdXNoUGFyYWdyYXBoKClcbiAgICAgICAgdGhpcy5hZGRIZWFkaW5nKGhlYWRpbmdNYXRjaFsyXSwgaGVhZGluZ01hdGNoWzFdLmxlbmd0aClcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8g5qOA5rWL5YiX6KGo6aG5XG4gICAgICBjb25zdCBsaXN0TWF0Y2ggPSB0cmltbWVkTGluZS5tYXRjaCgvXlstKuKAol1cXHMrKC4rKSQvKVxuICAgICAgaWYgKGxpc3RNYXRjaCkge1xuICAgICAgICBmbHVzaFBhcmFncmFwaCgpXG4gICAgICAgIC8vIOaUtumbhui/nue7reeahOWIl+ihqOmhuVxuICAgICAgICBjb25zdCBsaXN0SXRlbXM6IHN0cmluZ1tdID0gW2xpc3RNYXRjaFsxXV1cbiAgICAgICAgLy8g6L+Z6YeM566A5YyW5aSE55CG77yM5Y+q5re75Yqg5Y2V5Liq5YiX6KGo6aG5XG4gICAgICAgIHRoaXMuYWRkTGlzdChsaXN0SXRlbXMsIGZhbHNlKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyDmo4DmtYvmnInluo/liJfooahcbiAgICAgIGNvbnN0IG9yZGVyZWRMaXN0TWF0Y2ggPSB0cmltbWVkTGluZS5tYXRjaCgvXlxcZCtbLildXFxzKyguKykkLylcbiAgICAgIGlmIChvcmRlcmVkTGlzdE1hdGNoKSB7XG4gICAgICAgIGZsdXNoUGFyYWdyYXBoKClcbiAgICAgICAgdGhpcy5hZGRMaXN0KFtvcmRlcmVkTGlzdE1hdGNoWzFdXSwgdHJ1ZSlcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8g5qOA5rWL5byV55So5Z2XXG4gICAgICBpZiAodHJpbW1lZExpbmUuc3RhcnRzV2l0aCgnPicpKSB7XG4gICAgICAgIGZsdXNoUGFyYWdyYXBoKClcbiAgICAgICAgdGhpcy5hZGRCbG9ja3F1b3RlKHRyaW1tZWRMaW5lLnN1YnN0cmluZygxKS50cmltKCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIOaZrumAmuaWh+acrO+8jOa3u+WKoOWIsOW9k+WJjeauteiQvVxuICAgICAgY3VycmVudFBhcmFncmFwaC5wdXNoKHRyaW1tZWRMaW5lKVxuICAgIH1cblxuICAgIC8vIOWkhOeQhuacgOWQjuS4gOS4quauteiQvVxuICAgIGZsdXNoUGFyYWdyYXBoKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICog5p6E5bu65pyA57uI55qEIEFTVFxuICAgKi9cbiAgYnVpbGQoKTogVW5pZmllZEFTVCB7XG4gICAgLy8g6K6h566X5a2X5pWwXG4gICAgY29uc3Qgd29yZENvdW50ID0gdGhpcy5jb250ZW50LnJlZHVjZSgoY291bnQsIG5vZGUpID0+IHtcbiAgICAgIGlmIChub2RlLnRleHQpIHtcbiAgICAgICAgLy8g5Lit5paH5oyJ5a2X56ym6K6h5pWw77yM6Iux5paH5oyJ5Y2V6K+N6K6h5pWwXG4gICAgICAgIGNvbnN0IGNoaW5lc2VDaGFycyA9IChub2RlLnRleHQubWF0Y2goL1tcXHU0ZTAwLVxcdTlmYTVdL2cpIHx8IFtdKS5sZW5ndGhcbiAgICAgICAgY29uc3QgZW5nbGlzaFdvcmRzID0gKG5vZGUudGV4dC5tYXRjaCgvW2EtekEtWl0rL2cpIHx8IFtdKS5sZW5ndGhcbiAgICAgICAgcmV0dXJuIGNvdW50ICsgY2hpbmVzZUNoYXJzICsgZW5nbGlzaFdvcmRzXG4gICAgICB9XG4gICAgICByZXR1cm4gY291bnRcbiAgICB9LCAwKVxuXG4gICAgLy8g5p6E5bu65a6M5pW055qE5YWD5pWw5o2uXG4gICAgY29uc3QgZnVsbE1ldGFkYXRhOiBEb2N1bWVudE1ldGFkYXRhID0ge1xuICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICBmaWxlbmFtZTogdGhpcy5zb3VyY2VGaWxlLFxuICAgICAgZm9ybWF0OiB0aGlzLmRldGVjdEZvcm1hdCgpLFxuICAgICAgc2l6ZTogMCwgLy8g6ZyA6KaB5aSW6YOo6K6+572uXG4gICAgICBsYW5ndWFnZTogdGhpcy5tZXRhZGF0YS5sYW5ndWFnZSB8fCAndW5kJyxcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgIHdvcmRDb3VudCxcbiAgICAgIC4uLnRoaXMubWV0YWRhdGEsXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgc291cmNlRmlsZTogdGhpcy5zb3VyY2VGaWxlLFxuICAgICAgcGFyc2VUaW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgY29udGVudDogdGhpcy5jb250ZW50LFxuICAgICAgbWV0YWRhdGE6IGZ1bGxNZXRhZGF0YSxcbiAgICAgIHJlZmVyZW5jZXM6IHRoaXMucmVmZXJlbmNlcyxcbiAgICAgIGFzc2V0czogdGhpcy5hc3NldHMsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOagueaNruaWh+S7tuWQjeajgOa1i+agvOW8j1xuICAgKi9cbiAgcHJpdmF0ZSBkZXRlY3RGb3JtYXQoKTogRG9jdW1lbnRGb3JtYXQge1xuICAgIGNvbnN0IGV4dCA9IHRoaXMuc291cmNlRmlsZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCcuJykucG9wKClcbiAgICBjb25zdCBmb3JtYXRNYXA6IFJlY29yZDxzdHJpbmcsIERvY3VtZW50Rm9ybWF0PiA9IHtcbiAgICAgIHBkZjogJ3BkZicsXG4gICAgICBkb2N4OiAnZG9jeCcsXG4gICAgICBkb2M6ICdkb2MnLFxuICAgICAgbWQ6ICdtZCcsXG4gICAgICBtYXJrZG93bjogJ21hcmtkb3duJyxcbiAgICAgIGh0bWw6ICdodG1sJyxcbiAgICAgIGh0bTogJ2h0bWwnLFxuICAgICAgdHh0OiAndHh0JyxcbiAgICAgIHBuZzogJ2ltYWdlJyxcbiAgICAgIGpwZzogJ2ltYWdlJyxcbiAgICAgIGpwZWc6ICdpbWFnZScsXG4gICAgICBnaWY6ICdpbWFnZScsXG4gICAgICB3ZWJwOiAnaW1hZ2UnLFxuICAgICAgYm1wOiAnaW1hZ2UnLFxuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0TWFwW2V4dCB8fCAnJ10gfHwgJ3R4dCdcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5blvZPliY3lhoXlrrnoioLngrnmlbDph49cbiAgICovXG4gIGdldE5vZGVDb3VudCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQubGVuZ3RoXG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5b2T5YmN6LWE5rqQ5pWw6YePXG4gICAqL1xuICBnZXRBc3NldENvdW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuYXNzZXRzLmxlbmd0aFxuICB9XG5cbiAgLyoqXG4gICAqIOa4heepuuaehOW7uuWZqFxuICAgKi9cbiAgY2xlYXIoKTogdGhpcyB7XG4gICAgdGhpcy5jb250ZW50ID0gW11cbiAgICB0aGlzLnJlZmVyZW5jZXMgPSBbXVxuICAgIHRoaXMuYXNzZXRzID0gW11cbiAgICB0aGlzLm1ldGFkYXRhID0ge31cbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG4iXX0=