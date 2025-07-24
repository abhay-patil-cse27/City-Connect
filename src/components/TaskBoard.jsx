import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Users, Calendar, Package, LayoutGrid, GanttChartSquare,
  Filter, Search, Trash2, MoreVertical, Edit2, AlertTriangle, CheckCircle, Target
} from 'lucide-react';
import { useProjectTasks, useUpdateTask, useDeleteTask, useAddTask } from '../services/taskService';
import GanttChart from './GanttChart';

const TaskBoard = ({ projectId, teamMembers }) => {
  const [taskView, setTaskView] = useState('kanban');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilters, setTaskFilters] = useState({
    priority: 'all',
    assignee: 'all',
    dueDate: 'all'
  });
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
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

  const { data: tasks = [], isLoading } = useProjectTasks(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const addTask = useAddTask(projectId);

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

  const getDaysUntilDue = (task) => {
    if (!task.dueDate) return null;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    try {
      await updateTask.mutateAsync({
        taskId: draggableId,
        updates: { status: destination.droppableId }
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask.mutateAsync(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title) return;
    
    try {
      await addTask.mutateAsync({
        projectId,
        task: newTask
      });
      
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

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
      <AnimatePresence mode="wait">
        {taskView === 'kanban' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
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
                                  onClick={() => setExpandedTask(expandedTask?.id === task.id ? null : task)}
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
          <GanttChart tasks={tasks} />
        )}
      </AnimatePresence>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">New Task</h2>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
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
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard; 