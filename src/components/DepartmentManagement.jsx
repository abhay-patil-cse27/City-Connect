import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Users,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useUsers } from '../services/userService';
import { hasDepartmentPermission } from '../services/userService';
import { USER_ROLES, PERMISSIONS } from '../constants/roles';

const DepartmentManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    head: '',
    status: 'active'
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const q = query(collection(db, 'departments'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const { data: users = [], isLoading: usersLoading } = useUsers();

  // Filter users to get only supervisors
  const supervisors = users.filter(u => u.role === USER_ROLES.SUPERVISOR);

  // Check if user has permission to manage departments
  const canManageDepartments = hasDepartmentPermission(user, null, PERMISSIONS.MANAGE_DEPARTMENTS);

  // Calculate department statistics
  const departmentStats = useMemo(() => {
    return departments.reduce((acc) => {
      acc.totalDepartments += 1;
      return acc;
    }, { totalDepartments: 0 });
  }, [departments]);

  // Filter and search departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dept.head.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'active' && dept.status === 'active') ||
                          (filterStatus === 'inactive' && dept.status === 'inactive');
      return matchesSearch && matchesFilter;
    });
  }, [departments, searchQuery, filterStatus]);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'departments'), {
        ...newDepartment,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Update the cache
      queryClient.setQueryData(['departments'], (oldData) => [
        ...oldData,
        { id: docRef.id, ...newDepartment }
      ]);

      setSuccess('Department added successfully!');
      setShowAddModal(false);
      setNewDepartment({ name: '', description: '', head: '', status: 'active' });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    try {
      const departmentRef = doc(db, 'departments', selectedDepartment.id);
      await updateDoc(departmentRef, {
        ...selectedDepartment,
        updatedAt: new Date()
      });

      // Update the cache
      queryClient.setQueryData(['departments'], (oldData) =>
        oldData.map(dept =>
          dept.id === selectedDepartment.id
            ? { ...dept, ...selectedDepartment }
            : dept
        )
      );

      setSuccess('Department updated successfully!');
      setShowEditModal(false);
      setSelectedDepartment(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      const departmentRef = doc(db, 'departments', selectedDepartment.id);
      await deleteDoc(departmentRef);

      // Update the cache
      queryClient.setQueryData(['departments'], (oldData) =>
        oldData.filter(dept => dept.id !== selectedDepartment.id)
      );

      setSuccess('Department deleted successfully!');
      setShowDeleteModal(false);
      setSelectedDepartment(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAssignSupervisor = async (departmentId, supervisorId) => {
    try {
      const departmentRef = doc(db, 'departments', departmentId);
      await updateDoc(departmentRef, {
        supervisorId,
        updatedAt: new Date()
      });

      // Update the cache
      queryClient.setQueryData(['departments'], (oldData) =>
        oldData.map(dept =>
          dept.id === departmentId
            ? { ...dept, supervisorId }
            : dept
        )
      );

      setSuccess('Supervisor assigned successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  if (departmentsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Department Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor your organization&apos;s departments
          </p>
        </div>
        {canManageDepartments && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Add Department
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Building2 className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Departments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{departmentStats.totalDepartments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Departments</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2"
        >
          <XCircle size={20} />
          {error}
        </motion.div>
      )}

      <AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => {
          const canManageDepartment = hasDepartmentPermission(user, dept.id, PERMISSIONS.MANAGE_DEPARTMENT);
          
          return (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{dept.head}</p>
                </div>
                {canManageDepartment && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedDepartment(dept);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Edit Department"
                    >
                      <Pencil size={18} />
                    </button>
                    {canManageDepartments && (
                      <button
                          onClick={() => {
                            setSelectedDepartment(dept);
                            setShowDeleteModal(true);
                          }}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Department"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{dept.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dept.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                  }`}>
                    {dept.status}
                  </span>
                </div>
              {canManageDepartments && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Supervisor
                  </label>
                  <select
                    value={dept.supervisorId || ''}
                    onChange={(e) => handleAssignSupervisor(dept.id, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select a supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      </AnimatePresence>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Department</h2>
            <form onSubmit={handleAddDepartment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Head
                </label>
                <input
                  type="text"
                  value={newDepartment.head}
                  onChange={(e) => setNewDepartment({ ...newDepartment, head: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={newDepartment.status}
                  onChange={(e) => setNewDepartment({ ...newDepartment, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Department
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Department</h2>
            <form onSubmit={handleUpdateDepartment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Name
                </label>
                <input
                  type="text"
                  value={selectedDepartment.name}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Head
                </label>
                <input
                  type="text"
                  value={selectedDepartment.head}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, head: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={selectedDepartment.description}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={selectedDepartment.status}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Update Department
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Department Modal */}
      {showDeleteModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Department</h2>
                  </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the department &quot;{selectedDepartment.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
                <button
                onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                onClick={handleDeleteDepartment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                Delete Department
                </button>
              </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement; 