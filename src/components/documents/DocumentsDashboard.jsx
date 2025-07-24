import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FileText, FolderPlus, Search, Filter, Download, Trash2,
  Share2, History, Eye, Edit2, Plus, X, Upload, Clock,
  Users, Tag, CheckCircle, AlertTriangle, Folder
} from 'lucide-react';

const DocumentsDashboard = () => {
  const { isDark } = useTheme();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [newDocument, setNewDocument] = useState({
    name: '',
    description: '',
    type: '',
    tags: [],
    department: '',
    accessLevel: 'public',
    version: '1.0',
    status: 'draft'
  });

  const [newFolder, setNewFolder] = useState({
    name: '',
    description: '',
    department: '',
    accessLevel: 'public'
  });

  useEffect(() => {
    let documentsUnsubscribe;
    
    try {
      // Simplified query to avoid index requirement initially
      const baseQuery = collection(db, 'documents');
      
      // Only add conditions if we have a current folder
      const documentsQuery = currentFolder 
        ? query(baseQuery, where('folder', '==', currentFolder))
        : query(baseQuery, where('folder', '==', null));

      documentsUnsubscribe = onSnapshot(documentsQuery, (snapshot) => {
        // Sort documents client-side
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        docs.sort((a, b) => b.lastUpdated?.toDate() - a.lastUpdated?.toDate());
        setDocuments(docs);
      }, (error) => {
        console.error("Error fetching documents:", error);
      });
    } catch (error) {
      console.error("Error setting up documents listener:", error);
    }

    // Subscribe to folders collection
    const foldersQuery = query(collection(db, 'folders'));
    const foldersUnsubscribe = onSnapshot(foldersQuery, (snapshot) => {
      const folderDocs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setFolders(folderDocs.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => {
      if (documentsUnsubscribe) documentsUnsubscribe();
      if (foldersUnsubscribe) foldersUnsubscribe();
    };
  }, [currentFolder]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewDocument(prev => ({
        ...prev,
        name: file.name.split('.')[0],
        type: file.type
      }));
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !newDocument.name) {
      setUploadError('Please select a file and provide a name');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create a unique file path including folder structure and timestamp
      const timestamp = Date.now();
      const filePath = currentFolder
        ? `documents/${currentFolder}/${timestamp}_${selectedFile.name}`
        : `documents/${timestamp}_${selectedFile.name}`;

      const storageRef = ref(storage, filePath);
      
      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      // Return a promise that resolves when the upload is complete
      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            setUploadError('Error uploading file: ' + error.message);
            setIsUploading(false);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Add document metadata to Firestore
              await addDoc(collection(db, 'documents'), {
                ...newDocument,
                fileName: selectedFile.name,
                fileUrl: downloadURL,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                folder: currentFolder,
                uploadedBy: 'Current User',
                uploadedAt: new Date(),
                lastUpdated: new Date(),
                versions: [{
                  version: '1.0',
                  url: downloadURL,
                  uploadedBy: 'Current User',
                  uploadedAt: new Date(),
                  notes: 'Initial version'
                }]
              });

              setShowUploadModal(false);
              resetForm();
              resolve();
            } catch (error) {
              console.error('Error saving document metadata:', error);
              reject(error);
            }
          }
        );
      });

      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error during upload:', error);
      setUploadError('Error during upload: ' + error.message);
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolder.name) {
      return;
    }

    try {
      await addDoc(collection(db, 'folders'), {
        ...newFolder,
        createdAt: new Date(),
        createdBy: 'Current User', // Replace with actual user info
        lastUpdated: new Date(),
        parentFolder: currentFolder
      });

      setShowNewFolderModal(false);
      setNewFolder({
        name: '',
        description: '',
        department: '',
        accessLevel: 'public'
      });
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleDeleteDocument = async (documentId, fileUrl) => {
    try {
      // Delete file from storage
      const storageRef = ref(storage, fileUrl);
      await deleteObject(storageRef);

      // Delete document from Firestore
      await deleteDoc(doc(db, 'documents', documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleFolderClick = (folderId) => {
    setCurrentFolder(folderId);
  };

  const handleNavigateBack = () => {
    setCurrentFolder(null);
  };

  const resetForm = () => {
    setNewDocument({
      name: '',
      description: '',
      type: '',
      tags: [],
      department: '',
      accessLevel: 'public',
      version: '1.0',
      status: 'draft'
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'text-yellow-500 bg-yellow-500/10';
      case 'published': return 'text-green-500 bg-green-500/10';
      case 'archived': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Document Management</h1>
          {currentFolder && (
            <div className="flex items-center mt-2">
              <button
                onClick={handleNavigateBack}
                className={`text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} flex items-center`}
              >
                ← Back to root
              </button>
              <span className={`mx-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>|</span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Current folder: {folders.find(f => f.id === currentFolder)?.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'} w-5 h-5`} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDark 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="doc">Word</option>
          <option value="xls">Excel</option>
          <option value="img">Images</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {folders
          .filter(folder => !currentFolder ? !folder.parentFolder : folder.parentFolder === currentFolder)
          .map(folder => (
            <div
              key={folder.id}
              onClick={() => handleFolderClick(folder.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isDark 
                  ? 'border-slate-700 hover:bg-slate-800' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <Folder className="w-6 h-6 text-yellow-500 mr-3" />
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{folder.name}</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{folder.description}</p>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents
          .filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || doc.type.includes(filterType);
            return matchesSearch && matchesType;
          })
          .map(document => (
            <div 
              key={document.id} 
              className={`p-4 border rounded-lg ${
                isDark 
                  ? 'border-slate-700 bg-slate-800' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-blue-500 mr-3" />
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{document.name}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{document.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(document.fileUrl, '_blank')}
                    className={`p-1 rounded transition-colors ${
                      isDark 
                        ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document.id, document.fileUrl)}
                    className={`p-1 rounded transition-colors ${
                      isDark 
                        ? 'hover:bg-slate-700 text-red-400 hover:text-red-300' 
                        : 'hover:bg-gray-100 text-red-600 hover:text-red-700'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${
                      isDark 
                        ? 'bg-slate-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>Version: {document.version}</p>
                <p>Last updated: {new Date(document.lastUpdated.toDate()).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div className={`rounded-lg p-6 w-full max-w-lg ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Upload Document</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetForm();
                  }}
                  className={`p-1 rounded transition-colors ${
                    isDark 
                      ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>File</label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className={`w-full ${isDark ? 'text-gray-300' : 'text-gray-900'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                  <textarea
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    rows="3"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newDocument.tags.join(', ')}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()) }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Access Level</label>
                  <select
                    value={newDocument.accessLevel}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, accessLevel: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>

                {uploadError && (
                  <div className="text-red-600 text-sm">{uploadError}</div>
                )}

                {isUploading && (
                  <div className={`w-full rounded-full h-2.5 ${
                    isDark ? 'bg-slate-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                <button
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div className={`rounded-lg p-6 w-full max-w-lg ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Folder</h2>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className={`p-1 rounded transition-colors ${
                    isDark 
                      ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Folder Name</label>
                  <input
                    type="text"
                    value={newFolder.name}
                    onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                  <textarea
                    value={newFolder.description}
                    onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    rows="3"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Department</label>
                  <input
                    type="text"
                    value={newFolder.department}
                    onChange={(e) => setNewFolder(prev => ({ ...prev, department: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Access Level</label>
                  <select
                    value={newFolder.accessLevel}
                    onChange={(e) => setNewFolder(prev => ({ ...prev, accessLevel: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateFolder}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentsDashboard; 