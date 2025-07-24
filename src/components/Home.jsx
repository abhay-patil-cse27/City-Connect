import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, Users, Target, AlertTriangle, 
  BarChart3, MessageSquare, FileText, Plus, ChevronRight
} from 'lucide-react';

const Home = () => {
  const { isDark } = useTheme();
  const { user, userRole } = useAuth();
  const [recentProjects, setRecentProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    overdueTasks: 0,
    teamMembers: 0
  });

  useEffect(() => {
    const fetchRecentProjects = async () => {
      const q = query(
        collection(db, 'projects'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      setRecentProjects(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    };

    const fetchStats = async () => {
      const projectsSnapshot = await getDocs(collection(db, 'projects'));
      const activeProjectsSnapshot = await getDocs(
        query(collection(db, 'projects'), where('status', '==', 'active'))
      );
      const tasksSnapshot = await getDocs(
        query(collection(db, 'tasks'), where('status', '==', 'overdue'))
      );
      const teamSnapshot = await getDocs(collection(db, 'users'));

      setStats({
        totalProjects: projectsSnapshot.size,
        activeProjects: activeProjectsSnapshot.size,
        overdueTasks: tasksSnapshot.size,
        teamMembers: teamSnapshot.size
      });
    };

    fetchRecentProjects();
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl p-8 shadow-sm m-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, <span className="text-indigo-100">{user?.email?.split('@')[0]}</span>
            </h1>
            <p className="text-indigo-100/90">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mx-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
              <Calendar className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
            </div>
            <span className="text-base font-semibold text-slate-900 dark:text-white">Total Projects</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalProjects}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-lg">
              <Target className="text-green-600 dark:text-green-400 w-6 h-6" />
            </div>
            <span className="text-base font-semibold text-slate-900 dark:text-white">Active Projects</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.activeProjects}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/50 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400 w-6 h-6" />
            </div>
            <span className="text-base font-semibold text-slate-900 dark:text-white">Overdue Tasks</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.overdueTasks}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
              <Users className="text-blue-600 dark:text-blue-400 w-6 h-6" />
            </div>
            <span className="text-base font-semibold text-slate-900 dark:text-white">Team Members</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.teamMembers}</p>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 mx-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Recent Projects</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your most recent project activities</p>
          </div>
          <Link
            to="/projects"
            className="flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors group"
          >
            View All Projects
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentProjects.slice(0, 3).map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="block p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{project.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">{project.description}</p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(project.createdAt?.toDate()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>{project.teamMembers?.length || 0} members</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Progress</span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {project.progress || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mx-4">
        <Link
          to="/projects/new"
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
              <Plus className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">New Project</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Create a new project</p>
            </div>
          </div>
        </Link>
        <Link
          to="/chat"
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
              <MessageSquare className="text-blue-600 dark:text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Chat</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Team communication</p>
            </div>
          </div>
        </Link>
        <Link
          to="/documents"
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/50 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
              <FileText className="text-purple-600 dark:text-purple-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Documents</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">View shared documents</p>
            </div>
          </div>
        </Link>
        <Link
          to="/forum"
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/50 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900 transition-colors">
              <MessageSquare className="text-orange-600 dark:text-orange-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Forum</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Team discussions</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Home;