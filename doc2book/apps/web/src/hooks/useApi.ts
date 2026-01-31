/**
 * API Hooks
 * 封装 API 调用的 React Hooks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { api, Project, Document, Task, ApiError, CreateProjectRequest, UpdateProjectRequest, Skill, ProviderConfigPayload, ProviderTestPayload } from '@/services/api';

// ==================== useProjects Hook ====================

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch projects';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: CreateProjectRequest) => {
    setLoading(true);
    setError(null);
    try {
      const project = await api.createProject(data);
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to create project';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: UpdateProjectRequest) => {
    setError(null);
    try {
      const project = await api.updateProject(id, data);
      setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
      return project;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to update project';
      setError(message);
      throw e;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setError(null);
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to delete project';
      setError(message);
      throw e;
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}

// ==================== useProject Hook ====================

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return null;

    setLoading(true);
    setError(null);
    try {
      const data = await api.getProject(projectId);
      setProject(data);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch project';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateProject = useCallback(async (data: UpdateProjectRequest) => {
    if (!projectId) return null;

    setError(null);
    try {
      const updated = await api.updateProject(projectId, data);
      setProject(updated);
      return updated;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to update project';
      setError(message);
      throw e;
    }
  }, [projectId]);

  const startProcessing = useCallback(async () => {
    if (!projectId) return null;

    setError(null);
    try {
      const result = await api.startProcessing(projectId);
      // 刷新项目数据
      await fetchProject();
      return result;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to start processing';
      setError(message);
      throw e;
    }
  }, [projectId, fetchProject]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    fetchProject,
    updateProject,
    startProcessing,
  };
}

// ==================== useDocuments Hook ====================

export function useDocuments(projectId: string | null) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return [];

    setLoading(true);
    setError(null);
    try {
      const data = await api.listDocuments(projectId);
      setDocuments(data);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch documents';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const uploadDocument = useCallback(async (file: File) => {
    if (!projectId) return null;

    setError(null);
    const fileId = `${file.name}-${Date.now()}`;
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

    try {
      const document = await api.uploadDocument(projectId, file, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));
      });
      setDocuments((prev) => [document, ...prev]);
      setUploadProgress((prev) => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
      return document;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to upload document';
      setError(message);
      setUploadProgress((prev) => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
      throw e;
    }
  }, [projectId]);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!projectId) return;

    setError(null);
    try {
      await api.deleteDocument(projectId, documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to delete document';
      setError(message);
      throw e;
    }
  }, [projectId]);

  const fetchDocumentContent = useCallback(async (documentId: string) => {
    if (!projectId) return null;
    setError(null);
    try {
      const data = await api.getDocumentContent(projectId, documentId);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch document content';
      setError(message);
      throw e;
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    uploadProgress,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    fetchDocumentContent,
  };
}

// ==================== useTasks Hook ====================

export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return [];

    setLoading(true);
    setError(null);
    try {
      const data = await api.listTasks(projectId);
      setTasks(data);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch tasks';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTask = useCallback(async (taskType: string) => {
    if (!projectId) return null;

    setError(null);
    try {
      const task = await api.createTask(projectId, taskType);
      setTasks((prev) => [task, ...prev]);
      return task;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to create task';
      setError(message);
      throw e;
    }
  }, [projectId]);

  const cancelTask = useCallback(async (taskId: string) => {
    setError(null);
    try {
      const task = await api.cancelTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
      return task;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to cancel task';
      setError(message);
      throw e;
    }
  }, []);

  // 轮询任务状态
  const startPolling = useCallback((interval = 1000) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      const data = await fetchTasks();
      // 如果没有运行中的任务，停止轮询
      const hasRunningTasks = data.some((t) => t.status === 'running' || t.status === 'pending');
      if (!hasRunningTasks && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, interval);
  }, [fetchTasks]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 监听单个任务
  const pollTask = useCallback(async (taskId: string, onUpdate: (task: Task) => void, interval = 1000) => {
    const poll = async () => {
      try {
        const task = await api.getTask(taskId);
        onUpdate(task);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));

        if (task.status === 'running' || task.status === 'pending') {
          setTimeout(poll, interval);
        }
      } catch (e) {
        console.error('Failed to poll task:', e);
      }
    };
    poll();
  }, []);

  useEffect(() => {
    fetchTasks();
    return () => stopPolling();
  }, [fetchTasks, stopPolling]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    cancelTask,
    startPolling,
    stopPolling,
    pollTask,
  };
}

// ==================== useTask Hook (单个任务) ====================

export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return null;

    setLoading(true);
    setError(null);
    try {
      const data = await api.getTask(taskId);
      setTask(data);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch task';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const startPolling = useCallback((interval = 1000) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const poll = async () => {
      const data = await fetchTask();
      if (data && (data.status === 'running' || data.status === 'pending')) {
        pollingRef.current = setTimeout(poll, interval);
      }
    };

    poll();
  }, [fetchTask]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchTask();
    return () => stopPolling();
  }, [fetchTask, stopPolling]);

  return {
    task,
    loading,
    error,
    fetchTask,
    startPolling,
    stopPolling,
  };
}

// ==================== 技能配置 Hooks ====================

export function useGlobalSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGlobalSkills();
      setSkills(data.skills || []);
      return data.skills || [];
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch skills';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSkills = useCallback(async (nextSkills: Skill[]) => {
    setError(null);
    try {
      const result = await api.updateGlobalSkills(nextSkills);
      setSkills(result.skills || []);
      return result.skills || [];
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to update skills';
      setError(message);
      throw e;
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  return {
    skills,
    loading,
    error,
    fetchSkills,
    updateSkills,
  };
}

export function useProjectSkills(projectId: string | null) {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [inherits, setInherits] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!projectId) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjectSkills(projectId);
      setSkills(data.skills ?? null);
      setInherits(data.inherits ?? true);
      return data.skills ?? null;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch skills';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateSkills = useCallback(async (payload: { skills?: Skill[]; inherit?: boolean }) => {
    if (!projectId) return null;
    setError(null);
    try {
      const data = await api.updateProjectSkills(projectId, payload);
      setSkills(data.skills ?? null);
      setInherits(data.inherits ?? true);
      return data.skills ?? null;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to update skills';
      setError(message);
      throw e;
    }
  }, [projectId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  return {
    skills,
    inherits,
    loading,
    error,
    fetchSkills,
    updateSkills,
  };
}

export function useProviderStatus() {
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProviderStatus();
      if (data.success) {
        setProviders(data.providers || []);
      } else {
        setProviders([]);
        setError(data.error || 'Provider 不可用');
      }
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch providers';
      setError(message);
      setProviders([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    providers,
    loading,
    error,
    fetchStatus,
  };
}

export function useProviderConfig() {
  const [config, setConfig] = useState<ProviderConfigPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProviderConfig();
      if (data.success && data.config) {
        setConfig(data.config);
      } else {
        setConfig(null);
        setError(data.error || '无法获取 Provider 配置');
      }
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch provider config';
      setError(message);
      setConfig(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (payload: ProviderConfigPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.updateProviderConfig(payload);
      if (result.success && result.config) {
        setConfig(result.config);
      }
      return result;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to update provider config';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (payload: ProviderTestPayload) => {
    setError(null);
    try {
      return await api.testProviderConnection(payload);
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to test provider';
      setError(message);
      throw e;
    }
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    updateConfig,
    testConnection,
  };
}

// ==================== 草稿 Hooks ====================

export function useDrafts(projectId: string | null) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [primaryDraft, setPrimaryDraft] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (!projectId) return [];
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDrafts(projectId);
      setDrafts(data || []);
      return data || [];
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch drafts';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchPrimaryDraft = useCallback(async () => {
    if (!projectId) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPrimaryDraft(projectId);
      setPrimaryDraft(data);
      return data;
    } catch (e) {
      const message = e instanceof ApiError ? e.detail || e.message : 'Failed to fetch draft';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDrafts();
    fetchPrimaryDraft();
  }, [fetchDrafts, fetchPrimaryDraft]);

  return {
    drafts,
    primaryDraft,
    loading,
    error,
    fetchDrafts,
    fetchPrimaryDraft,
  };
}
