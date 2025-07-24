import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import ProjectHeader from './ProjectHeader';
import ProjectTasks from './ProjectTasks';
import ProjectTeam from './ProjectTeam';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [budget, setBudget] = useState({
    total: 0,
    spent: 0,
    remaining: 0,
    categories: [
      { id: 'resources', name: 'Resources', allocated: 0, spent: 0 },
      { id: 'equipment', name: 'Equipment', allocated: 0, spent: 0 },
      { id: 'software', name: 'Software', allocated: 0, spent: 0 },
      { id: 'training', name: 'Training', allocated: 0, spent: 0 }
    ]
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setLoading(false);
      }
    };

    // Listen for tasks updates
    const qTasks = query(collection(db, `projects/${id}/tasks`), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    // Listen for team members updates
    const qTeam = query(collection(db, `projects/${id}/team`), orderBy('name'));
    const unsubscribeTeam = onSnapshot(qTeam, (snapshot) => {
      setTeamMembers(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    fetchProject();
    return () => {
      unsubscribeTasks();
      unsubscribeTeam();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-emerald-50 p-8">
        <div className="text-center text-2xl text-gray-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto p-4 py-8"
      >
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-emerald-500/20 shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="p-6 border-b border-emerald-500/20">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <ArrowLeft size={20} />
                Back to Projects
              </button>
            </div>
          </div>

          {/* Project Content */}
          <ProjectHeader 
            project={project}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Content Sections */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                <ProjectTasks 
                  projectId={id}
                  tasks={tasks}
                  teamMembers={teamMembers}
                />
                <ProjectBudget 
                  projectId={id}
                  budget={budget}
                  setBudget={setBudget}
                />
              </div>
            )}

            {activeTab === 'team' && (
              <div className="p-8">
                <ProjectTeam 
                  projectId={id}
                  teamMembers={teamMembers}
                />
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="p-8">
                <ProjectAI 
                  project={project}
                  tasks={tasks}
                  teamMembers={teamMembers}
                  budget={budget}
                />
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectDetails; 