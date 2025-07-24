import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Calendar, Users, Target, MessageSquare,
  Edit3, Save, X, Share2
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ProjectHeader = ({ project, activeTab, setActiveTab }) => {
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState(project);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleUpdateProject = async () => {
    try {
      const docRef = doc(db, 'projects', project.id);
      await updateDoc(docRef, editedProject);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const calculateProgress = () => {
    if (!project.milestones?.length) return 0;
    const completed = project.milestones.filter(m => m.completed).length;
    return Math.round((completed / project.milestones.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-6">
        {editMode ? (
          <input
            type="text"
            value={editedProject.title}
            onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
            className="text-3xl font-semibold bg-transparent text-gray-900 border-b border-indigo-500/30 focus:border-indigo-500 outline-none px-2 py-1 w-full"
          />
        ) : (
          <h1 className="text-3xl font-semibold text-gray-900">
            {project?.title}
          </h1>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Share2 size={18} />
            Share
          </button>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Edit3 size={18} />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdateProject}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Project Progress</span>
          <span className="text-sm font-medium text-gray-600">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-indigo-600"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {[
          { id: 'overview', icon: Target, label: 'Overview' },
          { id: 'tasks', icon: Calendar, label: 'Tasks' },
          { id: 'team', icon: Users, label: 'Team' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'ai', icon: Brain, label: 'AI Insights' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <Calendar size={16} />
          <span>{project?.startDate}</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <Target size={16} />
          <span>{`${progress}% Complete`}</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <Users size={16} />
          <span>{project?.department}</span>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 border border-indigo-500/20 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-indigo-400">Share Project</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  <X size={20} />
                </button>
              </div>
              <input
                type="text"
                value={`${window.location.origin}/projects/${project.id}`}
                readOnly
                className="w-full bg-slate-700/50 text-indigo-100 rounded-lg px-4 py-2 border border-indigo-500/20 mb-4"
              />
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/projects/${project.id}`);
                    setShowShareModal(false);
                  }}
                  className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <Share2 size={18} />
                  Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectHeader; 