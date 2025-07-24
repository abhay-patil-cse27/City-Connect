import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus, Package, Search, Trash2, Edit2, X, Upload, Building2, Tags, ChevronDown } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL} from "firebase/storage";
import { useTheme } from '../contexts/ThemeContext';

const Resources = () => {
    const { isDark } = useTheme();
    const [resources, setResources] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newResource, setNewResource] = useState({
        name: '',
        type: '',
        department: '',
        available: true,
        image: null,
    });
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resourcesPerPage = 8;
    const [editResourceId, setEditResourceId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState(null);
    const departmentDropdownRef = useRef(null);

    useEffect(() => {
        const q = query(collection(db, 'resources'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setResources(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const departmentsSnapshot = await getDocs(collection(db, 'departments'));
                const departmentsList = departmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Add default departments if they don't exist
                const defaultDepartments = [
                    { id: 'civil', name: 'Civil' },
                    { id: 'energy', name: 'Energy' }
                ];

                // Check if default departments already exist
                const existingDefaultDepts = departmentsList.filter(dept => 
                    defaultDepartments.some(defaultDept => defaultDept.name === dept.name)
                );

                // Add missing default departments
                const missingDefaultDepts = defaultDepartments.filter(defaultDept =>
                    !existingDefaultDepts.some(existingDept => existingDept.name === defaultDept.name)
                );

                // Add missing departments to Firestore
                for (const dept of missingDefaultDepts) {
                    await addDoc(collection(db, 'departments'), {
                        name: dept.name,
                        createdAt: new Date()
                    });
                }

                // Combine existing and default departments
                const allDepartments = [...departmentsList, ...missingDefaultDepts];
                setDepartments(allDepartments);
            } catch (error) {
                console.error("Error fetching departments:", error);
            }
        };

        fetchDepartments();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
                setShowDepartmentDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredDepartments = departments.filter(dept => 
        dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
    );

    const handleSearchFilter = (resource) => {
        // Convert search term and resource name to lowercase for case-insensitive comparison
        const searchTerm = search.toLowerCase().trim();
        const resourceName = resource.name.toLowerCase();
        
        // Check if the resource name includes the search term
        const matchesSearch = searchTerm === '' || resourceName.includes(searchTerm);
        
        // Check type filter
        const matchesType = !filterType || resource.type.toLowerCase() === filterType.toLowerCase();
        
        // Check department filter - make it case-insensitive and trim whitespace
        const matchesDepartment = !filterDepartment || 
            resource.department.toLowerCase().trim() === filterDepartment.toLowerCase().trim();
        
        return matchesSearch && matchesType && matchesDepartment;
    };

    // Add console logs to debug department filtering
    useEffect(() => {
        console.log('Current filterDepartment:', filterDepartment);
        console.log('Filtered resources:', resources.filter(handleSearchFilter));
    }, [filterDepartment, resources]);

    // Update the search input handler to reset to first page when searching
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    };

    const handleImageUpload = async (file) => {
        const storageRef = ref(storage, `resources/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleAddResource = async () => {
        if (!newResource.name || !newResource.type || !newResource.department) return alert("Please fill all fields");

        try {
            let imageUrl = null;
            if (newResource.image) {
                imageUrl = await handleImageUpload(newResource.image);
            }
    
            await addDoc(collection(db, "resources"), {
                ...newResource,
                image: imageUrl,
            });
    
            setNewResource({
                name: '',
                type: '',
                department: '',
                available: true,
                image: null
            });
            setShowForm(false);
        } catch (error) {
            console.error("Error adding resource:", error);
        }
    };

    const handleEditResource = async () => {
        if (!editResourceId) return;

        const resourceRef = doc(db, 'resources', editResourceId);
        try {
            let imageUrl = newResource.image;
            if (newResource.image instanceof File) {
                imageUrl = await handleImageUpload(newResource.image);
            }
    
            await updateDoc(resourceRef, {
                ...newResource,
                image: imageUrl
            });
    
            setNewResource({
                name: '',
                type: '',
                department: '',
                available: true,
                image: null
            });
            setEditResourceId(null);
            setShowForm(false);
        } catch (error) {
            console.error("Error updating resource:", error);
        }
    };

    const handleDeleteResource = async () => {
        if (!resourceToDelete) return;

        try {
            await deleteDoc(doc(db, 'resources', resourceToDelete.id));
            setShowDeleteModal(false);
            setResourceToDelete(null);
        } catch (error) {
            console.error("Error deleting resource: ", error);
        }
    };

    const paginatedResources = resources
        .filter(handleSearchFilter)
        .slice((currentPage - 1) * resourcesPerPage, currentPage * resourcesPerPage);

    const totalPages = Math.ceil(resources.filter(handleSearchFilter).length / resourcesPerPage);

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'} p-6`}>
            <div className="container mx-auto max-w-full">
                <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 shadow-xl`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                            <Package className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            Resource Management
                        </h2>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg"
                        >
                            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {showForm ? 'Cancel' : 'Add Resource'}
                        </button>
                    </div>

                    {showForm && (
                        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 mb-6 border ${isDark ? 'border-slate-700' : 'border-slate-200'} shadow-lg`}>
                            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                                {editResourceId ? <Edit2 className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />}
                                {editResourceId ? 'Edit Resource' : 'Add New Resource'}
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Resource Name"
                                        value={newResource.name}
                                        onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                                        className={`w-full ${isDark ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-slate-50 text-gray-900 placeholder-gray-400 border-slate-200'} rounded-xl px-4 py-3 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300`}
                                    />
                                    <Package className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type"
                                        value={newResource.type}
                                        onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                                        className={`w-full ${isDark ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-slate-50 text-gray-900 placeholder-gray-400 border-slate-200'} rounded-xl px-4 py-3 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300`}
                                    />
                                    <Tags className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Department"
                                        value={newResource.department}
                                        onChange={(e) => setNewResource({ ...newResource, department: e.target.value })}
                                        className={`w-full ${isDark ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-slate-50 text-gray-900 placeholder-gray-400 border-slate-200'} rounded-xl px-4 py-3 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300`}
                                    />
                                    <Building2 className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                </div>
                                <label className={`flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={newResource.available}
                                        onChange={(e) => setNewResource({ ...newResource, available: e.target.checked })}
                                        className={`form-checkbox h-5 w-5 text-indigo-600 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-slate-50'}`}
                                    />
                                    <span>Available</span>
                                </label>
                                <div className="relative sm:col-span-2">
                                    <input
                                        type="file"
                                        onChange={(e) => setNewResource({ ...newResource, image: e.target.files[0] })}
                                        className={`w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50 text-gray-900 border-slate-200'} rounded-xl px-4 py-3 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700`}
                                    />
                                    <Upload className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                </div>
                            </div>
                            <button
                                onClick={editResourceId ? handleEditResource : handleAddResource}
                                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg flex items-center gap-2 justify-center w-full"
                            >
                                {editResourceId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {editResourceId ? 'Save Changes' : 'Add Resource'}
                            </button>
                        </div>
                    )}

                    <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 mb-6 border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name"
                                    value={search}
                                    onChange={handleSearchChange}
                                    className={`w-full ${isDark ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-slate-50 text-gray-900 placeholder-gray-400 border-slate-200'} rounded-xl px-4 py-3 pl-10 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300`}
                                />
                                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Filter by Type"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className={`w-full ${isDark ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-slate-50 text-gray-900 placeholder-gray-400 border-slate-200'} rounded-xl px-4 py-3 pl-10 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300`}
                                />
                                <Tags className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                            </div>
                            <div className="relative" ref={departmentDropdownRef}>
                                <div
                                    onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                                    className={`w-full ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50 text-gray-900 border-slate-200'} rounded-xl px-4 py-3 pl-10 pr-10 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300 cursor-pointer flex items-center justify-between`}
                                >
                                    <span className="truncate">
                                        {filterDepartment || 'All Departments'}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'} transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                                </div>
                                {showDepartmentDropdown && (
                                    <div className={`absolute z-10 w-full mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg`}>
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                placeholder="Search departments..."
                                                value={departmentSearch}
                                                onChange={(e) => setDepartmentSearch(e.target.value)}
                                                className={`w-full ${isDark ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-slate-50 text-gray-900 placeholder-gray-400 border-slate-200'} rounded-lg px-3 py-2 border focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 outline-none transition-all duration-300`}
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            <button
                                                onClick={() => {
                                                    setFilterDepartment('');
                                                    setDepartmentSearch('');
                                                    setShowDepartmentDropdown(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left hover:bg-indigo-50 ${isDark ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-indigo-50'}`}
                                            >
                                                All Departments
                                            </button>
                                            {filteredDepartments.map((dept) => (
                                                <button
                                                    key={dept.id}
                                                    onClick={() => {
                                                        setFilterDepartment(dept.name);
                                                        setDepartmentSearch('');
                                                        setShowDepartmentDropdown(false);
                                                        setCurrentPage(1); // Reset to first page when changing department
                                                    }}
                                                    className={`w-full px-4 py-2 text-left hover:bg-indigo-50 ${isDark ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-indigo-50'}`}
                                                >
                                                    {dept.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[65vh] overflow-y-auto p-2 
                        scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full
                        scrollbar-thumb-indigo-500 scrollbar-track-transparent
                        hover:scrollbar-thumb-indigo-600
                        dark:scrollbar-thumb-indigo-400 dark:hover:scrollbar-thumb-indigo-300
                        scrollbar-thumb-opacity-50 hover:scrollbar-thumb-opacity-100
                        transition-all duration-300">
                        {paginatedResources.map((resource) => (
                            <div key={resource.id} 
                                className={`${isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} 
                                rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group flex flex-col h-[280px] overflow-hidden`}
                            >
                                <div className="relative h-40 overflow-hidden">
                                    {resource.image ? (
                                        <img
                                            src={resource.image}
                                            alt={resource.name}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className={`w-full h-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}>
                                            <Package className={`w-16 h-16 ${isDark ? 'text-gray-500' : 'text-gray-400'} opacity-50`} />
                                        </div>
                                    )}
                                    <div className={`absolute top-2 right-2 flex gap-1 ${isDark ? 'bg-slate-700/80' : 'bg-white/80'} backdrop-blur-sm p-1.5 rounded-lg shadow-sm`}>
                                        <button
                                            onClick={() => {
                                                const resourceCopy = {...resource};
                                                delete resourceCopy.id;
                                                setNewResource(resourceCopy);
                                                setEditResourceId(resource.id);
                                                setShowForm(true);
                                            }}
                                            className={`p-1.5 ${isDark ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-500 hover:text-indigo-600'} 
                                            transition-colors rounded-lg hover:bg-white/20`}
                                            title="Edit Resource"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setResourceToDelete(resource);
                                                setShowDeleteModal(true);
                                            }}
                                            className={`p-1.5 ${isDark ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-600'} 
                                            transition-colors rounded-lg hover:bg-white/20`}
                                            title="Delete Resource"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className={`absolute top-2 left-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                        resource.available 
                                            ? isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-800'
                                            : isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {resource.available ? 'Available' : 'In Use'}
                                    </div>
                                </div>
                                
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white group-hover:text-indigo-400' : 'text-gray-900 group-hover:text-indigo-600'} 
                                    mb-2 transition-colors truncate`}>
                                        {resource.name}
                                    </h3>
                                    <div className="mt-auto space-y-2">
                                        <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <Tags className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <span className="text-sm truncate">{resource.type}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <Building2 className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <span className="text-sm truncate">{resource.department}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-2 ${isDark ? 'text-gray-400 hover:text-indigo-400 disabled:text-gray-600' : 'text-gray-500 hover:text-indigo-600 disabled:text-gray-300'} transition-colors`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`p-2 ${isDark ? 'text-gray-400 hover:text-indigo-400 disabled:text-gray-600' : 'text-gray-500 hover:text-indigo-600 disabled:text-gray-300'} transition-colors`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {showDeleteModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 max-w-md w-full mx-4`}>
                                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Delete Resource</h3>
                                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                                    Are you sure you want to delete "{resourceToDelete?.name}"? This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setResourceToDelete(null);
                                        }}
                                        className={`px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteResource}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Resources;