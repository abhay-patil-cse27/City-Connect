import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Project management functions
export const createProject = async (projectData) => {
  const projectRef = await addDoc(collection(db, 'projects'), {
    ...projectData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    creatorId: projectData.creatorId,
    creatorName: projectData.creatorName
  });
  
  return { id: projectRef.id, ...projectData };
};

export const getProject = async (projectId) => {
  const projectRef = doc(db, 'projects', projectId);
  const projectDoc = await getDoc(projectRef);
  
  if (!projectDoc.exists()) {
    throw new Error('Project not found');
  }
  
  return { id: projectDoc.id, ...projectDoc.data() };
};

export const updateProject = async (projectId, updates) => {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteProject = async (projectId) => {
  const projectRef = doc(db, 'projects', projectId);
  await deleteDoc(projectRef);
};

export const getProjects = async () => {
  const projectsQuery = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(projectsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Project tasks management
export const createTask = async (projectId, taskData) => {
  const taskRef = await addDoc(collection(db, `projects/${projectId}/tasks`), {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return { id: taskRef.id, ...taskData };
};

export const updateTask = async (projectId, taskId, updates) => {
  const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteTask = async (projectId, taskId) => {
  const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
  await deleteDoc(taskRef);
};

export const getProjectTasks = async (projectId) => {
  const tasksQuery = query(collection(db, `projects/${projectId}/tasks`), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(tasksQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Project team management
export const addTeamMember = async (projectId, memberData) => {
  const memberRef = await addDoc(collection(db, `projects/${projectId}/team`), {
    ...memberData,
    joinedAt: serverTimestamp()
  });
  
  return { id: memberRef.id, ...memberData };
};

export const removeTeamMember = async (projectId, memberId) => {
  const memberRef = doc(db, `projects/${projectId}/team`, memberId);
  await deleteDoc(memberRef);
};

export const getProjectTeam = async (projectId) => {
  const teamQuery = query(collection(db, `projects/${projectId}/team`), orderBy('joinedAt', 'desc'));
  const querySnapshot = await getDocs(teamQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Project comments management
export const addComment = async (projectId, commentData) => {
  const commentRef = await addDoc(collection(db, `projects/${projectId}/comments`), {
    ...commentData,
    timestamp: serverTimestamp()
  });
  
  return { id: commentRef.id, ...commentData };
};

export const getProjectComments = async (projectId) => {
  const commentsQuery = query(collection(db, `projects/${projectId}/comments`), orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(commentsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// React Query hooks
export const useProject = (projectId) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId
  });
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: getProjects
  });
};

export const useProjectTasks = (projectId) => {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => getProjectTasks(projectId),
    enabled: !!projectId
  });
};

export const useProjectTeam = (projectId) => {
  return useQuery({
    queryKey: ['project-team', projectId],
    queryFn: () => getProjectTeam(projectId),
    enabled: !!projectId
  });
};

export const useProjectComments = (projectId) => {
  return useQuery({
    queryKey: ['project-comments', projectId],
    queryFn: () => getProjectComments(projectId),
    enabled: !!projectId
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    }
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, updates }) => updateProject(projectId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project', projectId]);
      queryClient.invalidateQueries(['projects']);
    }
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    }
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, taskData }) => createTask(projectId, taskData),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, taskId, updates }) => updateTask(projectId, taskId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, taskId }) => deleteTask(projectId, taskId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });
};

export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, memberData }) => addTeamMember(projectId, memberData),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project-team', projectId]);
    }
  });
};

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, memberId }) => removeTeamMember(projectId, memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project-team', projectId]);
    }
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, commentData }) => addComment(projectId, commentData),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(['project-comments', projectId]);
    }
  });
}; 