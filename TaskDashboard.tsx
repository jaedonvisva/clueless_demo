/**
 * Task Management Dashboard Component
 * ===================================
 * 
 * A React TypeScript component for managing tasks and projects.
 * Features drag-and-drop, filtering, and real-time updates.
 * 
 * @version 1.2.0
 * @author Development Team
 * @since 2024-01-15
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

// Type definitions
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed';
  startDate: string;
  endDate?: string;
  teamMembers: string[];
}

interface TaskFilters {
  status?: Task['status'];
  priority?: Task['priority'];
  assignee?: string;
  projectId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface TaskDashboardProps {
  userId: string;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
  };
  onTaskUpdate?: (task: Task) => void;
  theme?: 'light' | 'dark';
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TaskDashboard: React.FC<TaskDashboardProps> = ({
  userId,
  permissions,
  onTaskUpdate,
  theme = 'light'
}) => {
  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksResponse, projectsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/tasks?userId=${userId}`),
          axios.get(`${API_BASE_URL}/projects?userId=${userId}`)
        ]);

        setTasks(tasksResponse.data);
        setProjects(projectsResponse.data);
      } catch (err) {
        setError('Failed to fetch data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    if (filters.assignee) {
      filtered = filtered.filter(task => task.assignee === filters.assignee);
    }
    if (filters.projectId) {
      filtered = filtered.filter(task => task.projectId === filters.projectId);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate >= startDate && dueDate <= endDate;
      });
    }

    // Sort by priority and due date
    return filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, filters, searchQuery]);

  // Task status update handler
  const handleStatusUpdate = useCallback(async (taskId: string, newStatus: Task['status']) => {
    if (!permissions.canEdit) {
      setError('You do not have permission to edit tasks');
      return;
    }

    try {
      const response = await axios.patch(`${API_BASE_URL}/tasks/${taskId}`, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      const updatedTask = response.data;
      
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      );

      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    } catch (err) {
      setError('Failed to update task status');
      console.error('Error updating task:', err);
    }
  }, [permissions.canEdit, onTaskUpdate]);

  // Create new task
  const handleCreateTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const newTask = response.data;
      setTasks(prevTasks => [...prevTasks, newTask]);
      setIsCreatingTask(false);
    } catch (err) {
      setError('Failed to create task');
      console.error('Error creating task:', err);
    }
  }, []);

  // Delete task
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!permissions.canDelete) {
      setError('You do not have permission to delete tasks');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
    }
  }, [permissions.canDelete]);

  // Get task counts by status
  const taskCounts = useMemo(() => {
    return {
      todo: tasks.filter(task => task.status === 'todo').length,
      inProgress: tasks.filter(task => task.status === 'in-progress').length,
      review: tasks.filter(task => task.status === 'review').length,
      completed: tasks.filter(task => task.status === 'completed').length
    };
  }, [tasks]);

  // Get overdue tasks
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(task => 
      task.status !== 'completed' && 
      new Date(task.dueDate) < now
    );
  }, [tasks]);

  // Priority color mapping
  const getPriorityColor = (priority: Task['priority']): string => {
    const colors = {
      urgent: '#ff4444',
      high: '#ff8800',
      medium: '#ffaa00',
      low: '#00aa44'
    };
    return colors[priority];
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: Task['status'] }> = ({ status }) => {
    const statusConfig = {
      'todo': { label: 'To Do', className: 'bg-gray-200 text-gray-800' },
      'in-progress': { label: 'In Progress', className: 'bg-blue-200 text-blue-800' },
      'review': { label: 'Review', className: 'bg-yellow-200 text-yellow-800' },
      'completed': { label: 'Completed', className: 'bg-green-200 text-green-800' }
    };

    const config = statusConfig[status];
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Task card component
  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
    
    return (
      <div 
        className={`p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}
        onClick={() => setSelectedTask(task)}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {task.title}
          </h3>
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getPriorityColor(task.priority) }}
            />
            <StatusBadge status={task.status} />
          </div>
        </div>
        
        <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {task.description.length > 100 
            ? `${task.description.substring(0, 100)}...` 
            : task.description
          }
        </p>
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
          <span>Assignee: {task.assignee}</span>
        </div>
        
        {task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span 
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {isOverdue && (
          <div className="mt-2 text-red-600 text-xs font-medium">
            ⚠️ Overdue
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Task Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="text-2xl font-bold text-blue-600">{taskCounts.todo}</div>
            <div className="text-sm text-gray-500">To Do</div>
          </div>
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="text-2xl font-bold text-yellow-600">{taskCounts.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="text-2xl font-bold text-purple-600">{taskCounts.review}</div>
            <div className="text-sm text-gray-500">Review</div>
          </div>
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="text-2xl font-bold text-green-600">{taskCounts.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>

        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Warning:</strong> You have {overdueTasks.length} overdue task(s).
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`px-3 py-2 border rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
          />
          
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              status: e.target.value as Task['status'] || undefined 
            }))}
            className={`px-3 py-2 border rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              priority: e.target.value as Task['priority'] || undefined 
            }))}
            className={`px-3 py-2 border rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <button
            onClick={() => setIsCreatingTask(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={!permissions.canEdit}
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No tasks found</div>
          <p className="text-gray-500">
            {searchQuery || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Create your first task to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskDashboard;
