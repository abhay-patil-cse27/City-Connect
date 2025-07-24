import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Plus, X, Users, Calendar, Package, LayoutGrid, GanttChartSquare,
  Filter, Search, Trash2, MoreVertical, Edit2, AlertTriangle, CheckCircle, Target
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, writeBatch, query, orderBy, onSnapshot, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Chart } from 'react-google-charts';
import { useTheme } from '../../contexts/ThemeContext';

const ProjectTasks = ({ projectId, tasks, teamMembers }) => {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskView, setTaskView] = useState('kanban');
  const [draggedTask, setDraggedTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilters, setTaskFilters] = useState({
    priority: 'all',
    assignee: 'all',
    dueDate: 'all'
  });
  const [availableResources, setAvailableResources] = useState([]);
  const [resourceConflicts, setResourceConflicts] = useState([]);
  const { isDark } = useTheme();

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

  useEffect(() => {
    const q = query(collection(db, 'resources'), where('available', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAvailableResources(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const statuses = {
    todo: { 
      label: 'To Do', 
      color: 'bg-gray-50 border-gray-200',
      textColor: 'text-gray-900'
    },
    inProgress: { 
      label: 'In Progress', 
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-900'
    },
    review: { 
      label: 'Review', 
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-900'
    },
    done: { 
      label: 'Done', 
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-900'
    }
  };

  const priorities = {
    low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    high: { label: 'High', color: 'bg-red-100 text-red-700' }
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

      const batch = writeBatch(db);
      
      const taskRef = doc(collection(db, `projects/${projectId}/tasks`));
      batch.set(taskRef, {
        ...newTask,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (newTask.resourceId) {
        const resourceRef = doc(db, 'resources', newTask.resourceId);
        batch.update(resourceRef, {
          available: false,
          allocatedTo: projectId,
          allocatedToTask: taskRef.id,
          allocationStart: newTask.startDate,
          allocationEnd: newTask.dueDate
        });
      }

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

  const onDragStart = (start) => {
    const task = tasks.find(t => t.id === start.draggableId);
    if (!task) return;
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
      const taskRef = doc(db, `projects/${projectId}/tasks`, draggableId);
      const task = tasks.find(t => t.id === draggableId);
      
      if (!task) return;

      const batch = writeBatch(db);
      
      batch.update(taskRef, {
        status: destination.droppableId,
        updatedAt: new Date()
      });

      if ((destination.droppableId === 'done' || destination.droppableId === 'cancelled') && task.resourceId) {
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

  const getFilteredTasks = (status) => {
    return tasks
      .filter(task => task.status === status)
      .filter(task => {
        if (taskSearch && !task.title.toLowerCase().includes(taskSearch.toLowerCase()) &&
            !task.description?.toLowerCase().includes(taskSearch.toLowerCase())) {
          return false;
        }
        
        if (taskFilters.priority !== 'all' && task.priority !== taskFilters.priority) {
          return false;
        }
        
        if (taskFilters.assignee !== 'all' && task.assignee !== taskFilters.assignee) {
          return false;
        }
        
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

  const handleDeleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
      const batch = writeBatch(db);

      // Get the task data to check if it has a resource
      const task = tasks.find(t => t.id === taskId);
      if (task?.resourceId) {
        const resourceRef = doc(db, 'resources', task.resourceId);
        batch.update(resourceRef, {
          available: true,
          allocatedTo: null,
          allocatedToTask: null
        });
      }

      // Delete the task
      batch.delete(taskRef);
      await batch.commit();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Task Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => setTaskView('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  taskView === 'kanban'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={18} />
                Kanban
              </button>
              <button
                onClick={() => setTaskView('gantt')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  taskView === 'gantt'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GanttChartSquare size={18} />
                Gantt
              </button>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      {/* Task View */}
      {taskView === 'kanban' ? (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(statuses).map(([status, { label, color, textColor }]) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className={`text-sm font-semibold ${textColor}`}>{label}</h3>
                  <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    {getFilteredTasks(status).length}
                  </span>
                </div>
                <Droppable droppableId={status} type="task">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-4 rounded-2xl border ${color} min-h-[200px] transition-all duration-200 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-100' : ''
                      }`}
                    >
                      <AnimatePresence>
                        {getFilteredTasks(status).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none'
                                }}
                                className={`group p-4 mb-3 bg-white rounded-xl border shadow-sm transition-all duration-200 ${
                                  snapshot.isDragging ? 'shadow-lg border-indigo-200 rotate-1' : 'border-gray-200 hover:shadow-md'
                                } ${expandedTask?.id === task.id ? 'ring-2 ring-indigo-500' : ''}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-gray-900 truncate pr-4">{task.title}</h4>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTask(task.id);
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Add edit functionality later
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-50"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                      {task.assignee && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                          <Users size={14} className="text-gray-400" />
                                          <span className="truncate max-w-[120px]">{task.assignee}</span>
                                        </div>
                                      )}
                                      {task.dueDate && (
                                        <div className="flex items-center gap-2">
                                          <Calendar size={14} className="text-gray-400" />
                                          <span className={getDaysUntilDue(task) < 0 ? 'text-red-500' : 'text-gray-600'}>
                                            {getDaysUntilDue(task) < 0 
                                              ? `${Math.abs(getDaysUntilDue(task))}d overdue`
                                              : getDaysUntilDue(task) === 0
                                              ? 'Due today'
                                              : `${getDaysUntilDue(task)}d left`}
                                          </span>
                                        </div>
                                      )}
                                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${priorities[task.priority].color}`}>
                                        {priorities[task.priority].label}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </Draggable>
                        ))}
                      </AnimatePresence>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <Chart
            chartType="Gantt"
            data={getGanttData()}
            options={{
              height: 400,
              gantt: {
                trackHeight: 30,
                barCornerRadius: 4,
                labelStyle: {
                  fontName: 'Inter',
                  fontSize: 12
                },
                palette: [
                  '#4F46E5', // Indigo
                  '#10B981', // Green
                  '#F59E0B', // Yellow
                  '#EF4444'  // Red
                ]
              }
            }}
            chartPackages={['gantt']}
            chartVersion="current"
            loader={
              <div className="h-96 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                  <span className="text-gray-600">Loading chart...</span>
                </div>
              </div>
            }
          />
        </div>
      )}

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">New Task</h3>
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignee
                    </label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select assignee</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {Object.entries(priorities).map(([value, { label }]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newTask.startDate}
                      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Conflict Modal */}
      <AnimatePresence>
        {resourceConflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Resource Conflict Detected
                </h3>
                <button
                  onClick={() => setResourceConflicts([])}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  The selected resource is already allocated to the following tasks during this period:
                </p>
                
                {resourceConflicts.map(conflict => (
                  <div key={conflict.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                      {conflict.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Start:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(conflict.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Due:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(conflict.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setResourceConflicts([])}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setResourceConflicts([]);
                      setNewTask({ ...newTask, resourceId: '' });
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Remove Resource
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

export default ProjectTasks; 