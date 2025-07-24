import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Query keys
export const taskKeys = {
  all: ['tasks'],
  project: (projectId) => [...taskKeys.all, projectId],
};

// Fetch tasks for a project
export const fetchProjectTasks = async (projectId) => {
  const tasksQuery = query(collection(db, `projects/${projectId}/tasks`), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(tasksQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Add a new task
export const addTask = async ({ projectId, task }) => {
  const taskRef = await addDoc(collection(db, `projects/${projectId}/tasks`), {
    ...task,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: taskRef.id, ...task };
};

// Update a task
export const updateTask = async ({ projectId, taskId, updates }) => {
  const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: new Date()
  });
  return { id: taskId, ...updates };
};

// Delete a task
export const deleteTask = async ({ projectId, taskId }) => {
  const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
  await deleteDoc(taskRef);
  return taskId;
};

// React Query hooks
export const useProjectTasks = (projectId) => {
  return useQuery({
    queryKey: taskKeys.project(projectId),
    queryFn: () => fetchProjectTasks(projectId),
  });
};

export const useAddTask = (projectId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, task }) => addTask({ projectId, task }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) });
    },
  });
};

export const useUpdateTask = (projectId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updates }) => updateTask({ projectId, taskId, updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) });
    },
  });
};

export const useDeleteTask = (projectId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId) => deleteTask({ projectId, taskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.project(projectId) });
    },
  });
}; 