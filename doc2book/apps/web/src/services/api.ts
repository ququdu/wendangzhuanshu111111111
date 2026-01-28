/**
 * API 服务层
 * 封装所有后端 API 调用
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// 类型定义
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  current_stage: string;
  document_count: number;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  source_language: string;
  target_languages: string[];
  output_formats: string[];
  kdp_compliant: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  source_language?: string;
  target_languages?: string[];
  output_formats?: string[];
  kdp_compliant?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  source_language?: string;
  target_languages?: string[];
  output_formats?: string[];
  kdp_compliant?: boolean;
  current_stage?: string;
}

export interface Document {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  format: string;
  size: number;
  file_path: string;
  uploaded_at: string;
  status: string;
  has_parsed_content: boolean;
  has_analysis: boolean;
  has_sanitized: boolean;
  has_rewritten: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  result_data: Record<string, unknown> | null;
  retry_count?: number;
  max_retries?: number;
  last_heartbeat?: string | null;
}

export interface Export {
  id: string;
  project_id: string;
  formats: string[];
  status: string;
  files: ExportFile[];
  created_at: string;
  completed_at: string | null;
  validation: Record<string, unknown> | null;
  error: string | null;
}

export interface ExportFile {
  format: string;
  path: string;
  size: number;
}

// 书籍草稿类型
export interface BookDraft {
  id: string;
  project_id: string;
  language: string;
  version: number;
  title: string | null;
  subtitle: string | null;
  author: string | null;
  description: string | null;
  table_of_contents: TableOfContentsItem[] | null;
  chapters: Chapter[] | null;
  front_matter: Record<string, unknown> | null;
  back_matter: Record<string, unknown> | null;
  status: 'draft' | 'reviewing' | 'approved';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  children?: TableOfContentsItem[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  level: number;
  wordCount?: number;
  status?: string;
}

export interface CreateDraftRequest {
  project_id: string;
  language?: string;
  title?: string;
  subtitle?: string;
  author?: string;
  description?: string;
  table_of_contents?: TableOfContentsItem[];
  chapters?: Chapter[];
  front_matter?: Record<string, unknown>;
  back_matter?: Record<string, unknown>;
  is_primary?: boolean;
}

export interface UpdateDraftRequest {
  title?: string;
  subtitle?: string;
  author?: string;
  description?: string;
  table_of_contents?: TableOfContentsItem[];
  chapters?: Chapter[];
  front_matter?: Record<string, unknown>;
  back_matter?: Record<string, unknown>;
  status?: string;
}

// 翻译任务类型
export interface TranslationJob {
  id: string;
  project_id: string;
  source_draft_id: string;
  target_language: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  provider: string;
  preserve_formatting: boolean;
  result_draft_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateTranslationRequest {
  project_id: string;
  source_draft_id: string;
  target_languages: string[];
  provider?: string;
  preserve_formatting?: boolean;
}

export interface SupportedLanguage {
  code: string;
  name: string;
}

// API 错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API 客户端类
class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new ApiError(
          error.detail || `HTTP ${response.status}`,
          response.status,
          error.detail
        );
      }

      // 处理空响应
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // ==================== 项目 API ====================

  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/projects/${id}`, { method: 'DELETE' });
  }

  async startProcessing(projectId: string): Promise<{ message: string; task_id: string; task_type: string }> {
    return this.request(`/projects/${projectId}/process`, {
      method: 'POST',
    });
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    return this.request<Task[]>(`/projects/${projectId}/tasks`);
  }

  // ==================== 文档 API ====================

  async listDocuments(projectId: string): Promise<Document[]> {
    return this.request<Document[]>(`/documents/${projectId}`);
  }

  async uploadDocument(projectId: string, file: File, onProgress?: (progress: number) => void): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    // 使用 XMLHttpRequest 以支持进度回调
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            reject(new ApiError('Invalid response', xhr.status));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new ApiError(error.detail || 'Upload failed', xhr.status, error.detail));
          } catch {
            reject(new ApiError('Upload failed', xhr.status));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError('Network error', 0));
      });

      xhr.open('POST', `${API_BASE}/documents/${projectId}/upload`);
      xhr.send(formData);
    });
  }

  async getDocument(projectId: string, documentId: string): Promise<Document> {
    return this.request<Document>(`/documents/${projectId}/${documentId}`);
  }

  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    await this.request<void>(`/documents/${projectId}/${documentId}`, {
      method: 'DELETE',
    });
  }

  async getDocumentContent(projectId: string, documentId: string): Promise<{
    document_id: string;
    parsed_content: Record<string, unknown> | null;
    analysis_result: Record<string, unknown> | null;
    sanitized_content: Record<string, unknown> | null;
    rewritten_content: string | null;
  }> {
    return this.request(`/documents/${projectId}/${documentId}/content`);
  }

  // ==================== 任务 API ====================

  async listTasks(projectId?: string): Promise<Task[]> {
    const query = projectId ? `?project_id=${projectId}` : '';
    return this.request<Task[]>(`/tasks${query}`);
  }

  async createTask(projectId: string, taskType: string): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, task_type: taskType }),
    });
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`);
  }

  async cancelTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request<void>(`/tasks/${taskId}`, { method: 'DELETE' });
  }

  async retryTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}/retry`, {
      method: 'POST',
    });
  }

  // ==================== 导出 API ====================

  async createExport(projectId: string, formats: string[]): Promise<Export> {
    return this.request<Export>('/export', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, formats }),
    });
  }

  async getExport(exportId: string): Promise<Export> {
    return this.request<Export>(`/export/${exportId}`);
  }

  async getProjectExports(projectId: string): Promise<Export[]> {
    return this.request<Export[]>(`/export/project/${projectId}`);
  }

  async downloadExport(exportId: string, format: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export/${exportId}/download/${format}`);
    if (!response.ok) {
      throw new ApiError('Download failed', response.status);
    }
    return response.blob();
  }

  async deleteExport(exportId: string): Promise<void> {
    await this.request<void>(`/export/${exportId}`, { method: 'DELETE' });
  }

  // ==================== 草稿 API ====================

  async listDrafts(projectId: string): Promise<BookDraft[]> {
    return this.request<BookDraft[]>(`/drafts/project/${projectId}`);
  }

  async getPrimaryDraft(projectId: string): Promise<BookDraft> {
    return this.request<BookDraft>(`/drafts/project/${projectId}/primary`);
  }

  async getDraft(draftId: string): Promise<BookDraft> {
    return this.request<BookDraft>(`/drafts/${draftId}`);
  }

  async createDraft(data: CreateDraftRequest): Promise<BookDraft> {
    return this.request<BookDraft>('/drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDraft(draftId: string, data: UpdateDraftRequest): Promise<BookDraft> {
    return this.request<BookDraft>(`/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateChapter(draftId: string, chapterId: string, data: { title?: string; content?: string }): Promise<BookDraft> {
    return this.request<BookDraft>(`/drafts/${draftId}/chapter`, {
      method: 'PUT',
      body: JSON.stringify({ chapter_id: chapterId, ...data }),
    });
  }

  async reorderChapters(draftId: string, chapterIds: string[]): Promise<BookDraft> {
    return this.request<BookDraft>(`/drafts/${draftId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ chapter_ids: chapterIds }),
    });
  }

  async approveDraft(draftId: string): Promise<{ success: boolean; draft: BookDraft; message: string }> {
    return this.request(`/drafts/${draftId}/approve`, {
      method: 'POST',
    });
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.request<void>(`/drafts/${draftId}`, { method: 'DELETE' });
  }

  // ==================== 翻译 API ====================

  async getSupportedLanguages(): Promise<{ languages: SupportedLanguage[] }> {
    return this.request('/translations/languages');
  }

  async listTranslations(projectId: string): Promise<TranslationJob[]> {
    return this.request<TranslationJob[]>(`/translations/project/${projectId}`);
  }

  async getTranslation(jobId: string): Promise<TranslationJob> {
    return this.request<TranslationJob>(`/translations/${jobId}`);
  }

  async createTranslations(data: CreateTranslationRequest): Promise<{ success: boolean; jobs: TranslationJob[]; message: string }> {
    return this.request('/translations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelTranslation(jobId: string): Promise<TranslationJob> {
    return this.request<TranslationJob>(`/translations/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  async deleteTranslation(jobId: string): Promise<void> {
    await this.request<void>(`/translations/${jobId}`, { method: 'DELETE' });
  }

  async completeTranslations(projectId: string): Promise<{ success: boolean; message: string; current_stage: string }> {
    return this.request(`/translations/project/${projectId}/complete`, {
      method: 'POST',
    });
  }
}

// 导出单例
export const api = new ApiService();
