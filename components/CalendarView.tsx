
import React, { useState, useMemo } from 'react';
import { CalendarEvent, User, LeadStatus } from '../types';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Briefcase, Shield } from 'lucide-react';
import { useStore } from '../lib/store';

interface CalendarViewProps {
  events: CalendarEvent[];
  currentUser: User;
  onAddEvent: (event: Partial<CalendarEvent>) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, currentUser, onAddEvent }) => {
  const { leads } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '09:00', type: 'Meeting' });

  // --- MERGE EVENTS ---
  const allEvents = useMemo(() => {
    // 1. Manual Events
    const combined = [...events];

    // 2. Lead Auto-Events
    leads.forEach(lead => {
        // Production Date
        if (lead.productionDate) {
            combined.push({
                id: `prod-${lead.id}`,
                title: `${lead.name} - Install`,
                start: new Date(lead.productionDate + 'T07:00:00'),
                end: new Date(lead.productionDate + 'T17:00:00'),
                type: 'Install',
                assignedTo: lead.projectManagerId || lead.assignedTo,
                color: 'bg-purple-100 text-purple-700 border-purple-200'
            });
        }
        // Adjuster Meetings
        if (lead.status === LeadStatus.ADJUSTER_MEETING) {
             // Mocking a future date based on created date if no specific date field exists for demo
             // In real app, we would have an 'adjusterMeetingDate' field.
             const date = new Date(lead.createdAt || Date.now());
             date.setDate(date.getDate() + 5); // 5 days after creation
             combined.push({
                id: `adj-${lead.id}`,
                title: `Adj. Mtg: ${lead.name}`,
                start: date,
                end: new Date(date.getTime() + 3600000),
                type: 'Inspection',
                assignedTo: lead.assignedTo,
                color: 'bg-blue-100 text-blue-700 border-blue-200'
            });
        }
    });

    return combined;
  }, [events, leads]);

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    
    const start = new Date(`${newEvent.date}T${newEvent.time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour duration

    onAddEvent({
      title: newEvent.title,
      start: start,
      end: end,
      type: newEvent.type as any,
      assignedTo: currentUser.id
    });
    setIsAdding(false);
    setNewEvent({ title: '', date: '', time: '09:00', type: 'Meeting' });
  };

  const renderDays = () => {
    const days = [];
    // Padding for prev month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`pad-${i}`} className="h-16 md:h-32 bg-slate-50 border border-slate-100"></div>);
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const daysEvents = allEvents.filter(e => {
        const eDate = new Date(e.start);
        return eDate.getDate() === i && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear();
      });

      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), i).toDateString();

      // Mobile: Show limited events
      const displayEvents = daysEvents; 

      days.push(
        <div key={i} className={`h-16 md:h-32 border border-slate-100 p-1 md:p-2 overflow-hidden hover:bg-slate-50 transition-colors relative group ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
          <div className="flex justify-between items-start mb-1">
            <span className={`text-xs md:text-sm font-semibold w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>{i}</span>
            <button 
              onClick={() => {
                setNewEvent(prev => ({...prev, date: dateStr}));
                setIsAdding(true);
              }}
              className="hidden md:block opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[35px] md:max-h-[80px] no-scrollbar">
            {displayEvents.map(ev => (
              <div 
                key={ev.id} 
                className={`text-[8px] md:text-[10px] p-0.5 md:p-1.5 rounded border-l-2 font-medium cursor-pointer shadow-sm mb-1 flex items-center gap-1
                  ${ev.color ? ev.color : 
                    ev.type === 'Inspection' ? 'bg-blue-50 border-blue-500 text-blue-700' : 
                    ev.type === 'Install' ? 'bg-purple-50 border-purple-500 text-purple-700' : 
                    'bg-emerald-50 border-emerald-500 text-emerald-700'}`}
              >
                <span className="hidden md:inline">{ev.type === 'Install' && <Briefcase size={10} />}</span>
                <span className="hidden md:inline">{ev.type === 'Inspection' && <Shield size={10} />}</span>
                <span className="truncate">{new Date(ev.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}).replace(/^0/, '')} {ev.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-600"><ChevronLeft size={18} /></button>
            <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-600"><ChevronRight size={18} /></button>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} />
          <span className="md:hidden">Add Event</span>
          <span className="hidden md:inline">New Event</span>
        </button>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] md:text-xs font-semibold text-slate-500 uppercase">{d.substring(0,3)}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-slate-100">
        <div className="grid grid-cols-7 gap-px border-l border-slate-200">
          {renderDays()}
        </div>
      </div>

      {/* Add Event Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Schedule Event</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    required
                    type="text"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Adjuster Meeting - Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      required
                      type="date"
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input
                      required
                      type="time"
                      value={newEvent.time}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Install">Production / Install</option>
                    <option value="Deadline">Deadline</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
