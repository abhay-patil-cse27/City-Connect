import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentData) => {
      const docRef = await addDoc(collection(db, 'departments'), {
        ...departmentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { id: docRef.id, ...departmentData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId, updates }) => {
      const departmentRef = doc(db, 'departments', departmentId);
      await updateDoc(departmentRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { id: departmentId, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentId) => {
      const departmentRef = doc(db, 'departments', departmentId);
      await deleteDoc(departmentRef);
      return departmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, change }) => {
      const departmentRef = doc(db, 'departments', id);
      const departmentDoc = await getDoc(departmentRef);
      const departmentData = departmentDoc.data();

      let newBudget = departmentData.budget;
      if (change.type === 'increase') {
        newBudget += change.amount;
      } else {
        newBudget -= change.amount;
      }

      await updateDoc(departmentRef, {
        budget: newBudget,
        updatedAt: new Date().toISOString()
      });

      return { id, budget: newBudget };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
};

export const useUpdateDepartmentSupervisor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId, supervisorId }) => {
      const departmentRef = doc(db, 'departments', departmentId);
      await updateDoc(departmentRef, {
        supervisorId,
        updatedAt: new Date().toISOString()
      });
      return { departmentId, supervisorId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
    }
  });
}; 