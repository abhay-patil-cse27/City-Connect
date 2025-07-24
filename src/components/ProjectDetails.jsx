import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence, AnimateSharedLayout } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, Calendar, Users, MapPin, Clock, MessageSquare, 
  Plus, Trash2, ChevronUp, ChevronDown, Edit3, Save, X,
  Activity, Target, AlertTriangle, CheckCircle, Share2,
  LayoutGrid, GanttChartSquare, Filter, Search, PieChart, BarChart, DollarSign, TrendingUp, Wallet,
  Brain, Zap, FileText, Package, ChevronRight, BarChart2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Chart } from 'react-google-charts';
import { useTheme } from '../contexts/ThemeContext';
import ProjectTasks from './project/ProjectTasks';
import {
  generateProjectInsights,
  analyzeMilestones,
  generateMeetingSummary,
  analyzeResourceAllocation,
  generateStatusReport,
  generateTaskSuggestions,
  optimizeBudgetAllocation
} from '../lib/huggingface';
import TaskBoard from './TaskBoard';
import ConflictAnalysis from './ConflictAnalysis';
import { 
  useProject, 
  useProjectTasks, 
  useProjectTeam, 
  useProjectComments,
  useUpdateProject,
  useDeleteProject,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useAddTeamMember,
  useRemoveTeamMember,
  useAddComment
} from '../services/projectService';
import { useChats, useCreateChat } from '../services/chatService';

const customIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newMember, setNewMember] = useState({ name: '', role: '' });
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  const [showComments, setShowComments] = useState(true);
  const [showTeam, setShowTeam] = useState(true);
  const [progress, setProgress] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '', completed: false });
  const [activeTab, setActiveTab] = useState('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const { isDark } = useTheme();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    status: 'todo',
    priority: 'medium',
    startDate: '',
    dueDate: '',
    dependencies: [],
    resourceId: '',
    resourceAllocation: 0
  });
  const [taskView, setTaskView] = useState('kanban');
  const [draggedTask, setDraggedTask] = useState(null);
  const [budget, setBudget] = useState({
    total: 0,
    spent: 0,
    remaining: 0,
    categories: []
  });
  const [budgetCategories, setBudgetCategories] = useState([
    { id: 'resources', name: 'Resources', allocated: 0, spent: 0 },
    { id: 'equipment', name: 'Equipment', allocated: 0, spent: 0 },
    { id: 'software', name: 'Software', allocated: 0, spent: 0 },
    { id: 'training', name: 'Training', allocated: 0, spent: 0 }
  ]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilters, setTaskFilters] = useState({
    priority: 'all',
    assignee: 'all',
    dueDate: 'all'
  });
  const [availableResources, setAvailableResources] = useState([]);
  const [expandedTask, setExpandedTask] = useState(null);
  const [resourceConflicts, setResourceConflicts] = useState([]);
  const { data: chats = [] } = useChats(user?.uid);
  const createChat = useCreateChat();

  // Use React Query hooks
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(id);
  const { data: teamMembers = [], isLoading: teamLoading } = useProjectTeam(id);
  const { data: comments = [], isLoading: commentsLoading } = useProjectComments(id);

  // Use mutations
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const addTeamMemberMutation = useAddTeamMember();
  const removeTeamMemberMutation = useRemoveTeamMember();
  const addCommentMutation = useAddComment();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (project) {
      setEditedProject(project);
      calculateProgress();
    }
  }, [project]);

  useEffect(() => {
    const q = query(collection(db, 'resources'), where('available', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAvailableResources(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        projectId: id,
        commentData: {
          content: newComment,
          authorId: user.uid,
          authorName: user.email,
          timestamp: new Date()
        }
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddTeamMember = async () => {
    if (!newMember.name || !newMember.role) return;
    try {
      await addTeamMemberMutation.mutateAsync({
        projectId: id,
        memberData: newMember
      });
      setNewMember({ name: '', role: '' });
    } catch (error) {
      console.error('Error adding team member:', error);
    }
  };

  const handleDeleteTeamMember = async (memberId) => {
    try {
      await removeTeamMemberMutation.mutateAsync({
        projectId: id,
        memberId
      });
    } catch (error) {
      console.error('Error deleting team member:', error);
    }
  };

  const handleUpdateProject = async () => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId: id,
        updates: editedProject
      });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProjectMutation.mutateAsync(id);
        navigate('/projects');
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const checkResourceConflicts = (taskId, resourceId, startDate, endDate) => {
    const conflicts = tasks.filter(task => {
      if (task.id === taskId) return false;
      if (!task.resourceId || task.resourceId !== resourceId) return false;
      
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.dueDate);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      
      return (
        (newStart >= taskStart && newStart <= taskEnd) ||
        (newEnd >= taskStart && newEnd <= taskEnd) ||
        (newStart <= taskStart && newEnd >= taskEnd)
      );
    });

    return conflicts;
  };

  const handleAddTask = async () => {
    try {
      // Check for conflicts if resource is selected
      if (newTask.resourceId) {
        const conflicts = checkResourceConflicts(
          null,
          newTask.resourceId,
          newTask.startDate,
          newTask.dueDate
        );

        if (conflicts.length > 0) {
          setResourceConflicts(conflicts);
          return;
        }
      }

      // Start a batch write
      const batch = writeBatch(db);
      
      // Add the task
      const taskRef = doc(collection(db, `projects/${id}/tasks`));
      batch.set(taskRef, {
        ...newTask,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // If a resource is selected, update its status
      if (newTask.resourceId) {
        const resourceRef = doc(db, 'resources', newTask.resourceId);
        batch.update(resourceRef, {
          available: false,
          allocatedTo: id,
          allocatedToTask: taskRef.id,
          allocationStart: newTask.startDate,
          allocationEnd: newTask.dueDate
        });
      }

      // Commit the batch
      await batch.commit();

      setShowNewTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        assignee: '',
        status: 'todo',
        priority: 'medium',
        startDate: '',
        dueDate: '',
        dependencies: [],
        resourceId: '',
        resourceAllocation: 0
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, `projects/${id}/tasks`, taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) return;

      const task = taskDoc.data();
      const batch = writeBatch(db);

      // Update task status
      batch.update(taskRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // If task is completed or cancelled and has a resource, release it
      if ((newStatus === 'done' || newStatus === 'cancelled') && task.resourceId) {
        const resourceRef = doc(db, 'resources', task.resourceId);
        batch.update(resourceRef, {
          available: true,
          allocatedTo: null,
          allocatedToTask: null
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getGanttData = () => {
    const data = [
      [
        { type: 'string', label: 'Task ID' },
        { type: 'string', label: 'Task Name' },
        { type: 'string', label: 'Resource' },
        { type: 'date', label: 'Start Date' },
        { type: 'date', label: 'End Date' },
        { type: 'number', label: 'Duration' },
        { type: 'number', label: 'Percent Complete' },
        { type: 'string', label: 'Dependencies' },
      ]
    ];

    tasks.forEach(task => {
      data.push([
        task.id,
        task.title,
        task.assignee || '',
        new Date(task.startDate),
        new Date(task.dueDate),
        null,
        task.status === 'done' ? 100 : task.status === 'review' ? 75 : task.status === 'inProgress' ? 50 : 0,
        task.dependencies?.join(',') || null
      ]);
    });

    return data;
  };

  const handleBudgetUpdate = (id, value) => {
    // Implementation of handleBudgetUpdate
  };

  const handleBudgetSave = () => {
    // Implementation of handleBudgetSave
  };

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const insights = await generateProjectInsights(
        'Analyze current project status and provide strategic recommendations',
        {
          name: project?.title || 'Current Project',
          department: project?.department || 'All Departments',
          teamMembers: teamMembers.map(m => m.name)
        }
      );



      const extractInsights = (insights) => {
        // Find the starting point of the insights in the context
        const startIndex = insights.indexOf("1. ");
        
        if (startIndex === -1) return []; // Return empty array if no insights are found
      
        // Extract only the insights section
        const insightsSection = insights.substring(startIndex);
      
       
        return insightsSection
      };
      const extractedInsights = extractInsights(insights);
      setAiInsights(extractedInsights);


     // setAiInsights(insights);
    } catch (error) {
      setAiError('Failed to generate insights. Please try again.');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzeMilestones = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const analysis = await analyzeMilestones(milestones);
      setAiInsights(analysis);
    } catch (error) {
      setAiError('Failed to analyze milestones. Please try again.');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzeResources = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const analysis = await analyzeResourceAllocation({
        budget,
        tasks,
        teamMembers
      });
      setAiInsights(analysis);
    } catch (error) {
      setAiError('Failed to analyze resources. Please try again.');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateStatusReport = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const report = await generateStatusReport({
        progress,
        milestones,
        tasks,
        budget,
        teamMembers
      });
      setAiInsights(report);
    } catch (error) {
      setAiError('Failed to generate status report. Please try again.');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateTaskSuggestions = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const suggestions = await generateTaskSuggestions({
        name: project?.title || 'Untitled Project',
        department: project?.department || 'General',
        tasks: tasks || [],
        teamMembers: teamMembers || [],
        progress: progress || 0
      });

      if (!suggestions.tasks || !Array.isArray(suggestions.tasks) || suggestions.tasks.length === 0) {
        throw new Error('No valid tasks were generated');
      }

      // Validate and add suggested tasks to the project
      for (const task of suggestions.tasks) {
        // Validate required fields
        if (!task.title || !task.description || !task.priority) {
          console.warn('Skipping invalid task:', task);
          continue;
        }

        // Ensure dates are valid
        const startDate = task.startDate || new Date().toISOString().split('T')[0];
        const dueDate = task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Add the task
        await addDoc(collection(db, `projects/${id}/tasks`), {
          ...task,
          startDate,
          dueDate,
          status: 'todo',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setAiInsights(`Successfully added ${suggestions.tasks.length} new tasks to the project.`);
    } catch (error) {
      console.error('Error generating tasks:', error);
      setAiError(error.message || 'Failed to generate task suggestions. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOptimizeBudget = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const optimization = await optimizeBudgetAllocation({
        name: project?.title,
        budget,
        progress
      });

      // Update budget categories
      for (const category of optimization.categories) {
        const categoryRef = budgetCategories.find(c => c.id === category.id);
        if (categoryRef) {
          categoryRef.allocated = category.allocated;
          categoryRef.spent = category.spent;
        }
      }

      setBudgetCategories([...budgetCategories]);
      setAiInsights(optimization.recommendations);
    } catch (error) {
      setAiError('Failed to optimize budget. Please try again.');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const getFilteredTasks = (status) => {
    return tasks
      .filter(task => task.status === status)
      .filter(task => {
        // Search filter
        if (taskSearch && !task.title.toLowerCase().includes(taskSearch.toLowerCase()) &&
            !task.description.toLowerCase().includes(taskSearch.toLowerCase())) {
          return false;
        }
        
        // Priority filter
        if (taskFilters.priority !== 'all' && task.priority !== taskFilters.priority) {
          return false;
        }
        
        // Assignee filter
        if (taskFilters.assignee !== 'all' && task.assignee !== taskFilters.assignee) {
          return false;
        }
        
        // Due date filter
        if (taskFilters.dueDate !== 'all') {
          const today = new Date();
          const taskDate = new Date(task.dueDate);
          const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
          
          switch (taskFilters.dueDate) {
            case 'overdue':
              if (diffDays >= 0) return false;
              break;
            case 'today':
              if (diffDays !== 0) return false;
              break;
            case 'week':
              if (diffDays < 0 || diffDays > 7) return false;
              break;
            case 'month':
              if (diffDays < 0 || diffDays > 30) return false;
              break;
          }
        }
        
        return true;
      });
  };

  const getTaskProgress = (task) => {
    if (!task.startDate || !task.dueDate) return 0;
    const start = new Date(task.startDate);
    const end = new Date(task.dueDate);
    const now = new Date();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getDaysUntilDue = (task) => {
    if (!task.dueDate) return null;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleTaskClick = (task) => {
    setExpandedTask(expandedTask?.id === task.id ? null : task);
  };

  const handleStartChatWithCreator = async () => {
    if (!project?.creatorId || !user) return;

    try {
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.participants.includes(project.creatorId) && 
        chat.participants.length === 2
      );

      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      // Create new chat
      const newChat = await createChat.mutateAsync({
        participants: [user.uid, project.creatorId],
        type: 'direct',
        name: project.creatorName,
        description: `Direct chat with ${project.creatorName}`,
        projectId: id
      });

      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  if (projectLoading) {
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

  const calculateProgress = () => {
    if (!milestones.length) return 0;
    const completed = milestones.filter(m => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title || !newMilestone.dueDate) return;
    try {
      await addDoc(collection(db, `projects/${id}/milestones`), {
        ...newMilestone,
        timestamp: new Date()
      });
      setNewMilestone({ title: '', dueDate: '', completed: false });
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const toggleMilestoneStatus = async (milestoneId, currentStatus) => {
    try {
      const docRef = doc(db, `projects/${id}/milestones`, milestoneId);
      await updateDoc(docRef, { completed: !currentStatus });
      setProgress(calculateProgress());
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const statuses = {
    todo: { 
      label: 'To Do', 
      color: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      textColor: 'text-slate-800 dark:text-slate-200'
    },
    inProgress: { 
      label: 'In Progress', 
      color: 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800',
      textColor: 'text-indigo-800 dark:text-indigo-200'
    },
    review: { 
      label: 'Review', 
      color: 'bg-purple-50 dark:bg-purple-900/50 border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-800 dark:text-purple-200'
    },
    done: { 
      label: 'Done', 
      color: 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-200'
    }
  };

  const priorities = {
    low: { label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    medium: { label: 'Medium', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
    high: { label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' }
  };

  const onDragStart = (start) => {
    const task = tasks.find(t => t.id === start.draggableId);
    if (!task) {
      console.warn(`Task with ID ${start.draggableId} not found`);
      return;
    }
    setDraggedTask(task);
    document.body.style.cursor = 'grabbing';
  };

  const onDragEnd = async (result) => {
    setDraggedTask(null);
    document.body.style.cursor = 'default';
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    try {
      // Verify task still exists before updating
      const taskRef = doc(db, `projects/${id}/tasks`, draggableId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        console.warn(`Task ${draggableId} no longer exists`);
        // Remove the task from local state if it's been deleted
        setTasks(prev => prev.filter(task => task.id !== draggableId));
        return;
      }

      const updatedStatus = destination.droppableId;
      const task = taskDoc.data();
      const batch = writeBatch(db);
      
      // Update task status
      batch.update(taskRef, {
        status: updatedStatus,
        updatedAt: new Date()
      });

      // If task is completed or cancelled and has a resource, release it
      if ((updatedStatus === 'done' || updatedStatus === 'cancelled') && task.resourceId) {
        const resourceRef = doc(db, 'resources', task.resourceId);
        batch.update(resourceRef, {
          available: true,
          allocatedTo: null,
          allocatedToTask: null
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      // Optimistically update the UI
      setTasks(prev => prev.map(task => 
        task.id === draggableId 
          ? { ...task, status: updatedStatus }
          : task
      ));
      
      console.log('Task status updated:', draggableId, destination.droppableId);
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert the optimistic update on error
      const originalTask = tasks.find(t => t.id === draggableId);
      if (originalTask) {
        setTasks(prev => prev.map(task => 
          task.id === draggableId 
            ? { ...task, status: source.droppableId }
            : task
        ));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Project Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden backdrop-blur-xl bg-white/50">
          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
                  {project?.title}
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed">{project?.description}</p>
                {project?.creatorName && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users size={18} />
                      <span>Created by {project.creatorName}</span>
                    </div>
                    {project.creatorId !== user?.uid && (
                      <button
                        onClick={handleStartChatWithCreator}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <MessageSquare size={16} />
                        Chat with Creator
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <Share2 size={20} />
                  Share
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all duration-200"
                >
                  <Edit3 size={20} />
                  Edit
                </button>
              </div>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <Target className="text-indigo-600 w-6 h-6" />
                  </div>
                  <span className="text-base font-semibold text-gray-900">Progress</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{calculateProgress()}%</p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="text-green-600 w-6 h-6" />
                  </div>
                  <span className="text-base font-semibold text-gray-900">Completed</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {tasks.filter(t => t.status === 'done').length}
                </p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <Clock className="text-yellow-600 w-6 h-6" />
                  </div>
                  <span className="text-base font-semibold text-gray-900">In Progress</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {tasks.filter(t => t.status === 'inProgress').length}
                </p>
              </div>
              <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="text-red-600 w-6 h-6" />
                  </div>
                  <span className="text-base font-semibold text-gray-900">Overdue</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'done').length}
                </p>
              </div>
            </div>

            {/* Project Navigation */}
            <div className="flex gap-6 border-b border-gray-200">
              {[
                { id: 'overview', icon: Target, label: 'Overview' },
                { id: 'tasks', icon: Calendar, label: 'Tasks' },
                { id: 'team', icon: Users, label: 'Team' },
                { id: 'chat', icon: MessageSquare, label: 'Comments' },
                { id: 'ai', icon: Brain, label: 'AI Insights' },
                { id: 'conflicts', icon: AlertTriangle, label: 'Conflicts' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-5 py-4 text-base font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[2px]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon size={20} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-6"
            >
              {activeTab === 'tasks' && (
                <TaskBoard projectId={id} teamMembers={teamMembers} />
              )}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Project Details */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
                    {editMode ? (
                      <textarea
                        value={editedProject.description}
                        onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        rows="4"
                      />
                    ) : (
                      <p className="text-gray-600 leading-relaxed">{project?.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="flex items-center gap-3 text-gray-600">
                        <Calendar size={18} />
                        <span>{project?.startDate}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Clock size={18} />
                        <span>{project?.endDate}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Users size={18} />
                        <span>{project?.department}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Target size={18} />
                        <span>{`${progress}% Complete`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Location */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Location</h2>
                    <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                      <MapContainer
                        center={[project?.location.lat, project?.location.lng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[project?.location.lat, project?.location.lng]} icon={customIcon}>
                          <Popup>{project?.title}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                            <p className="text-sm text-gray-500">{member.role}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteTeamMember(member.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Member Name"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Role"
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      onClick={handleAddTeamMember}
                      className="md:col-span-2 bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Add Team Member
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Comments</h2>
                  
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{comment.authorName}</span>
                          <span className="text-sm text-gray-500">
                            {comment.timestamp?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <MessageSquare size={18} />
                      Comment
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">AI-Powered Insights</h2>
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Brain size={20} />
                      <span>Powered by AI</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={handleGenerateInsights}
                      disabled={aiLoading}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                    >
                      <Brain className="text-indigo-600" size={24} />
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">Project Insights</h3>
                        <p className="text-sm text-gray-500">Get strategic recommendations</p>
                      </div>
                    </button>

                    <button
                      onClick={handleAnalyzeMilestones}
                      disabled={aiLoading}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                    >
                      <Target className="text-indigo-600" size={24} />
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">Milestone Analysis</h3>
                        <p className="text-sm text-gray-500">Analyze project milestones</p>
                      </div>
                    </button>

                    <button
                      onClick={handleGenerateTaskSuggestions}
                      disabled={aiLoading}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                    >
                      <Plus className="text-indigo-600" size={24} />
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">Generate Tasks</h3>
                        <p className="text-sm text-gray-500">AI-suggested tasks</p>
                      </div>
                    </button>

                    <button
                      onClick={handleOptimizeBudget}
                      disabled={aiLoading}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                    >
                      <DollarSign className="text-indigo-600" size={24} />
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">Optimize Budget</h3>
                        <p className="text-sm text-gray-500">AI budget recommendations</p>
                      </div>
                    </button>
                  </div>

                  {aiLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                        <span className="text-gray-600">Generating insights...</span>
                      </div>
                    </div>
                  )}

                  {aiError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                      {aiError}
                    </div>
                  )}

                  {aiInsights && (
                    <div className="mt-6">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">AI Analysis</h3>
                        <div className="prose prose-gray max-w-none">
                          <pre className="whitespace-pre-wrap text-gray-600">{aiInsights}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'conflicts' && project && (
                <ConflictAnalysis projectId={id} projectData={project} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Share Project</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={`${window.location.origin}/projects/${id}`}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-200 pr-24"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/projects/${id}`);
                      setShowShareModal(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Share2 size={16} />
                    Copy
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectDetails;