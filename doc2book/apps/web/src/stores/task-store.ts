import { create } from 'zustand'

export interface Task {
  id: string
  projectId: string
  type: 'parse' | 'understand' | 'sanitize' | 'create' | 'plagiarism' | 'generate'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  startTime?: Date
  endTime?: Date
  error?: string
}

interface TaskState {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id'>) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  getTasksByProject: (projectId: string) => Task[]
  getRunningTasks: () => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  addTask: (task) => {
    const id = `task_${Date.now()}`
    set((state) => ({
      tasks: [...state.tasks, { ...task, id }],
    }))
    return id
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }))
  },

  getTasksByProject: (projectId) => {
    return get().tasks.filter((t) => t.projectId === projectId)
  },

  getRunningTasks: () => {
    return get().tasks.filter((t) => t.status === 'running')
  },
}))
