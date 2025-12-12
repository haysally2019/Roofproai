
import React, { useState } from 'react';
import { Task, User } from '../types';
import { CheckCircle, Circle, Plus, AlertCircle, Clock, Sparkles } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  currentUser: User;
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, currentUser, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [filter, setFilter] = useState<'All' | 'Todo' | 'Done'>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium' });

  const filteredTasks = tasks.filter(t => {
    if (filter === 'All') return true;
    if (filter === 'Todo') return t.status !== 'Done';
    if (filter === 'Done') return t.status === 'Done';
    return true;
  });

  const toggleStatus = (task: Task) => {
    onUpdateTask({
      ...task,
      status: task.status === 'Done' ? 'Todo' : 'Done'
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    
    onAddTask({
      title: newTask.title,
      priority: newTask.priority as any,
      status: 'Todo',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: currentUser.id
    });
    setIsAdding(false);
    setNewTask({ title: '', priority: 'Medium' });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-amber-600 bg-amber-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tasks & Reminders</h2>
          <p className="text-sm text-slate-500">Keep track of follow-ups and deadlines</p>
        </div>
        <div className="flex gap-3">
            <div className="flex bg-white border border-slate-300 rounded-lg p-1">
                {['All', 'Todo', 'Done'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus size={16} />
              Add Task
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredTasks.length === 0 ? (
           <div className="h-64 flex flex-col items-center justify-center text-slate-400 italic">
              <CheckCircle size={48} className="mb-2 opacity-20" />
              <p>No tasks found.</p>
           </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className={`flex items-center p-4 border rounded-lg transition-all ${task.status === 'Done' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:shadow-sm'}`}>
              <button 
                onClick={() => toggleStatus(task)}
                className={`p-1 rounded-full mr-4 transition-colors ${task.status === 'Done' ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
              >
                {task.status === 'Done' ? <CheckCircle size={24} /> : <Circle size={24} />}
              </button>
              
              <div className="flex-1">
                <h4 className={`font-medium text-slate-800 ${task.status === 'Done' ? 'line-through text-slate-500' : ''}`}>
                  {task.title}
                </h4>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                   <span className="flex items-center gap-1"><Clock size={12}/> Due: {task.dueDate}</span>
                   {task.relatedLeadId && <span className="text-indigo-600">Re: Lead #{task.relatedLeadId.substring(0,4)}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                 </span>
                 <button onClick={() => onDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 px-2">
                    &times;
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">New Task</h3>
                <form onSubmit={handleAddSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Task Description</label>
                            <input 
                                autoFocus
                                required
                                value={newTask.title}
                                onChange={e => setNewTask({...newTask, title: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Call Robert about shingles"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                            <select 
                                value={newTask.priority}
                                onChange={e => setNewTask({...newTask, priority: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Task</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
