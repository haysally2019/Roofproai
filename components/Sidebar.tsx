
import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Umbrella, FileText, Briefcase, CheckSquare, 
  Receipt, Tag, UserCheck, Settings as SettingsIcon, Globe, Building2, 
  Hexagon, Hammer, LogOut, ChevronDown, ChevronRight, X, Calendar, Headset, Mic, Zap
} from 'lucide-react';
import { useStore } from '../lib/store';
import { UserRole, Tab } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { currentUser, activeTab, setTab, logout } = useStore();
  const [productionOpen, setProductionOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);

  if (!currentUser) return null;

  const NavItem = ({ tab, icon: Icon, label, alert }: { tab: Tab, icon: any, label?: string, alert?: boolean }) => (
    <button
      onClick={() => {
        setTab(tab);
        if (window.innerWidth < 768) setIsOpen(false); // Close on mobile click
      }}
      className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 ${
        activeTab === tab 
          ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
      title={typeof label === 'string' ? label : tab}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={`transition-colors ${activeTab === tab ? 'text-indigo-400' : 'group-hover:text-slate-200'}`} />
        <span className="text-sm whitespace-nowrap">{label || tab}</span>
      </div>
      {alert && (
         <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-30 bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 shadow-xl transition-transform duration-300 
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        w-64 h-full shrink-0 overflow-hidden`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/50 shrink-0 relative bg-[#0F172A]">
          <div className="flex items-center gap-3 font-bold text-xl text-white w-full">
            <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
               <Hexagon className="text-indigo-600 fill-indigo-600/20" size={32} strokeWidth={2.5} />
               <Hammer className="absolute text-white" size={14} />
            </div>
            <span className="tracking-tight whitespace-nowrap">ALTUS <span className="text-indigo-500">AI</span></span>
          </div>
          
          {/* Mobile Close Button */}
          <button onClick={() => setIsOpen(false)} className="md:hidden ml-auto text-slate-400 hover:text-white">
             <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto no-scrollbar overflow-x-hidden">
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SAAS_REP) ? (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2 mb-1">Admin</div>
              <NavItem tab={Tab.ADMIN_OVERVIEW} icon={Globe} label="Overview" />
              <NavItem tab={Tab.ADMIN_LEADS} icon={Users} label="SaaS Leads" />
              <NavItem tab={Tab.ADMIN_TEAM} icon={UserCheck} label="Sales Team" />
              <NavItem tab={Tab.ADMIN_TENANTS} icon={Building2} label="Tenants" />
              <NavItem tab={Tab.ADMIN_AGENTS} icon={Headset} label="AI Configuration" />
              <div className="mt-6 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">System</div>
              <NavItem tab={Tab.SETTINGS} icon={SettingsIcon} />
            </>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2 mb-1">Main</div>
              <NavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} />
              <NavItem tab={Tab.CALENDAR} icon={Calendar} label="Calendar" />
              <NavItem tab={Tab.LEADS} icon={Users} />
              <NavItem tab={Tab.CLAIMS} icon={Umbrella} alert />
              <NavItem tab={Tab.AI_RECEPTIONIST} icon={Mic} label="AI Receptionist" />

              {/* Collapsible Section: Production */}
              <div className="mt-4">
                 <button 
                    onClick={() => setProductionOpen(!productionOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300"
                    title="Production"
                 >
                    <span>Production</span>
                    {productionOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                 </button>
                 {productionOpen && (
                    <div className="pl-2 space-y-0.5 mt-1">
                        <NavItem tab={Tab.JOBS} icon={Briefcase} />
                        <NavItem tab={Tab.TASKS} icon={CheckSquare} />
                        <NavItem tab={Tab.ESTIMATES} icon={FileText} />
                    </div>
                 )}
              </div>

              {/* Collapsible Section: Finance */}
              <div className="mt-4">
                 <button 
                    onClick={() => setFinanceOpen(!financeOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300"
                    title="Finance"
                 >
                    <span>Finance</span>
                    {financeOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                 </button>
                 {financeOpen && (
                    <div className="pl-2 space-y-0.5 mt-1">
                        <NavItem tab={Tab.INVOICES} icon={Receipt} />
                        <NavItem tab={Tab.PRICE_BOOK} icon={Tag} label="Price Book" />
                    </div>
                 )}
              </div>
              
              <div className="mt-6 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin</div>
              <NavItem tab={Tab.AUTOMATIONS} icon={Zap} label="Workflows" />
              <NavItem tab={Tab.TEAM} icon={UserCheck} label="Team" />
              <NavItem tab={Tab.SETTINGS} icon={SettingsIcon} />
            </>
          )}
        </nav>

        {/* Profile Footer */}
        <div className="border-t border-slate-800 bg-[#0B1120] shrink-0 p-4">
           <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-indigo-600/20 shrink-0">
                  {currentUser.avatarInitials}
              </div>
              
              <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
              </div>
              
              <button 
                onClick={logout} 
                className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-slate-800 rounded-md" 
                title="Logout"
              >
                 <LogOut size={18} />
              </button>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
