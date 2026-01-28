import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface Document {
  id: string
  filename: string
  format: string
  size: number
  uploadedAt: Date
  status: 'pending' | 'parsing' | 'parsed' | 'error'
}

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  documents: Document[]
  currentStage: 'upload' | 'parse' | 'understand' | 'sanitize' | 'create' | 'generate'
  settings: {
    sourceLanguage: string
    targetLanguages: string[]
    outputFormats: string[]
    kdpCompliant: boolean
  }
}

interface ProjectState {
  projects: Project[]
  currentProjectId: string | null
  createProject: (name: string, description?: string) => string
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (id: string | null) => void
  getCurrentProject: () => Project | null
  addDocument: (projectId: string, document: Omit<Document, 'id'>) => string
  updateDocument: (projectId: string, documentId: string, updates: Partial<Document>) => void
  removeDocument: (projectId: string, documentId: string) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,

      createProject: (name, description) => {
        const id = uuidv4()
        const project: Project = {
          id,
          name,
          description,
          createdAt: new Date(),
          updatedAt: new Date(),
          documents: [],
          currentStage: 'upload',
          settings: {
            sourceLanguage: 'auto',
            targetLanguages: ['zh'],
            outputFormats: ['epub'],
            kdpCompliant: true,
          },
        }
        set((state) => ({
          projects: [...state.projects, project],
          currentProjectId: id,
        }))
        return id
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }))
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId:
            state.currentProjectId === id ? null : state.currentProjectId,
        }))
      },

      setCurrentProject: (id) => {
        set({ currentProjectId: id })
      },

      getCurrentProject: () => {
        const state = get()
        return state.projects.find((p) => p.id === state.currentProjectId) || null
      },

      addDocument: (projectId, document) => {
        const id = uuidv4()
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  documents: [...p.documents, { ...document, id }],
                  updatedAt: new Date(),
                }
              : p
          ),
        }))
        return id
      },

      updateDocument: (projectId, documentId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  documents: p.documents.map((d) =>
                    d.id === documentId ? { ...d, ...updates } : d
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }))
      },

      removeDocument: (projectId, documentId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  documents: p.documents.filter((d) => d.id !== documentId),
                  updatedAt: new Date(),
                }
              : p
          ),
        }))
      },
    }),
    {
      name: 'doc2book-projects',
    }
  )
)
