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
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../firebase.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// User roles and their permissions
export const USER_ROLES = {
  SUPER_USER: 'super_user',
  SUPERVISOR: 'supervisor',
  OFFICER: 'officer',
  PUBLIC: 'public'
};

export const PERMISSIONS = {
  // Super User permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_DEPARTMENTS: 'manage_departments',
  MANAGE_BUDGETS: 'manage_budgets',
  ACCESS_ALL: 'access_all',
  
  // Supervisor permissions
  MANAGE_DEPARTMENT: 'manage_department',
  VIEW_DEPARTMENT_BUDGET: 'view_department_budget',
  MANAGE_DEPARTMENT_PROJECTS: 'manage_department_projects',
  MANAGE_DEPARTMENT_RESOURCES: 'manage_department_resources',
  MANAGE_DEPARTMENT_DOCUMENTS: 'manage_department_documents',
  MANAGE_DEPARTMENT_TASKS: 'manage_department_tasks',
  MANAGE_DEPARTMENT_STAFF: 'manage_department_staff',
  
  // Officer permissions
  CREATE_PROJECTS: 'create_projects',
  MANAGE_PROJECTS: 'manage_projects',
  HANDLE_COMPLAINTS: 'handle_complaints',
  
  // Public permissions
  VIEW_PROJECTS: 'view_projects',
  VIEW_DEPARTMENTS: 'view_departments',
  MANAGE_RESOURCES: 'manage_resources',
  VIEW_REPORTS: 'view_reports',
  MANAGE_DOCUMENTS: 'manage_documents',
  MANAGE_TASKS: 'manage_tasks',
  VIEW_TASKS: 'view_tasks',
  MANAGE_BUDGET: 'manage_budget',
  VIEW_BUDGET: 'view_budget'
};

// Role to permissions mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_USER]: Object.values(PERMISSIONS),
  [USER_ROLES.SUPERVISOR]: [
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.VIEW_DEPARTMENT_BUDGET,
    PERMISSIONS.MANAGE_DEPARTMENT_PROJECTS,
    PERMISSIONS.MANAGE_DEPARTMENT_RESOURCES,
    PERMISSIONS.MANAGE_DEPARTMENT_DOCUMENTS,
    PERMISSIONS.MANAGE_DEPARTMENT_TASKS,
    PERMISSIONS.MANAGE_DEPARTMENT_STAFF,
    PERMISSIONS.VIEW_REPORTS
  ],
  [USER_ROLES.OFFICER]: [
    PERMISSIONS.MANAGE_PROJECTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_BUDGET
  ],
  [USER_ROLES.PUBLIC]: [
    PERMISSIONS.VIEW_TASKS
  ]
};

// User management functions
export const createUser = async (userData) => {
  const { email, password, role, department, name } = userData;
  
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // If the user is a supervisor, verify the department exists
    if (role === USER_ROLES.SUPERVISOR && department) {
      const departmentRef = doc(db, 'departments', department);
      const departmentDoc = await getDoc(departmentRef);
      
      if (!departmentDoc.exists()) {
        throw new Error('Department not found');
      }
    }

    // Create the user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      role,
      department,
      name,
      permissions: ROLE_PERMISSIONS[role],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: user.uid, email, role, department, name };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUserRole = async (userId, newRole) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: serverTimestamp()
  });
};

export const deleteUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
};

// Department management functions
export const createDepartment = async (departmentData) => {
  const { name, description, budget } = departmentData;
  const departmentRef = await addDoc(collection(db, 'departments'), {
    name,
    description,
    budget,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return { id: departmentRef.id, ...departmentData };
};

export const updateDepartment = async (departmentId, updates) => {
  const departmentRef = doc(db, 'departments', departmentId);
  await updateDoc(departmentRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteDepartment = async (departmentId) => {
  const departmentRef = doc(db, 'departments', departmentId);
  await deleteDoc(departmentRef);
};

// React Query hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const departmentsSnapshot = await getDocs(collection(db, 'departments'));
      return departmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, newRole }) => updateUserRole(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ departmentId, updates }) => updateDepartment(departmentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const createSuperUser = async (email, password) => {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create the user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: USER_ROLES.SUPER_USER,
      permissions: ROLE_PERMISSIONS[USER_ROLES.SUPER_USER],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return user;
  } catch (error) {
    console.error('Error creating super user:', error);
    throw error;
  }
};

// Add new function to check department-specific permissions
export const hasDepartmentPermission = (user, departmentId, permission) => {
  if (!user) return false;
  
  // Super users have all permissions
  if (user.role === USER_ROLES.SUPER_USER) return true;
  
  // Supervisors can only access their assigned department
  if (user.role === USER_ROLES.SUPERVISOR) {
    return user.department === departmentId && ROLE_PERMISSIONS[USER_ROLES.SUPERVISOR].includes(permission);
  }
  
  // For other roles, check general permissions
  return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
};

// Add new function to get department-specific data
export const getDepartmentData = async (departmentId, user) => {
  if (!hasDepartmentPermission(user, departmentId, PERMISSIONS.VIEW_DEPARTMENT_BUDGET)) {
    throw new Error('You do not have permission to view this department');
  }

  const departmentRef = doc(db, 'departments', departmentId);
  const departmentDoc = await getDoc(departmentRef);
  
  if (!departmentDoc.exists()) {
    throw new Error('Department not found');
  }

  return {
    id: departmentDoc.id,
    ...departmentDoc.data()
  };
};

// Add new function to update department supervisor
export const updateDepartmentSupervisor = async (departmentId, supervisorId) => {
  const departmentRef = doc(db, 'departments', departmentId);
  const supervisorRef = doc(db, 'users', supervisorId);
  
  const [departmentDoc, supervisorDoc] = await Promise.all([
    getDoc(departmentRef),
    getDoc(supervisorRef)
  ]);
  
  if (!departmentDoc.exists() || !supervisorDoc.exists()) {
    throw new Error('Department or supervisor not found');
  }
  
  if (supervisorDoc.data().role !== USER_ROLES.SUPERVISOR) {
    throw new Error('Selected user is not a supervisor');
  }
  
  await updateDoc(departmentRef, {
    supervisorId,
    updatedAt: serverTimestamp()
  });
  
  await updateDoc(supervisorRef, {
    department: departmentId,
    updatedAt: serverTimestamp()
  });
};

// Add new React Query hook for department data
export const useDepartmentData = (departmentId, user) => {
  return useQuery({
    queryKey: ['department', departmentId],
    queryFn: () => getDepartmentData(departmentId, user),
    enabled: !!departmentId && !!user
  });
};

// Add new React Query hook for updating department supervisor
export const useUpdateDepartmentSupervisor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ departmentId, supervisorId }) => updateDepartmentSupervisor(departmentId, supervisorId),
    onSuccess: (_, { departmentId }) => {
      queryClient.invalidateQueries(['department', departmentId]);
      queryClient.invalidateQueries(['users']);
    }
  });
}; 