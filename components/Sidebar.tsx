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
      className={`group w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all duration-200 ${
        activeTab === tab
          ? 'bg-indigo-600/10 text-indigo-400 font-medium'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
      title={typeof label === 'string' ? label : tab}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={17} className={`transition-colors ${activeTab === tab ? 'text-indigo-400' : 'group-hover:text-slate-200'}`} />
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
        <div className="h-16 flex items-center px-4 border-b border-slate-800/50 shrink-0 relative bg-[#0F172A]">
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 shrink-0">
               <Zap className="text-white fill-white" size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-tight leading-tight">Rafter AI</span>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wide leading-tight uppercase">Roofing Software</span>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button onClick={() => setIsOpen(false)} className="md:hidden ml-auto text-slate-400 hover:text-white">
             <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar overflow-x-hidden">
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SAAS_REP) ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Admin</div>
              <NavItem tab={Tab.ADMIN_OVERVIEW} icon={Globe} label="Overview" />
              <NavItem tab={Tab.ADMIN_LEADS} icon={Users} label="SaaS Leads" />
              
              {/* RESTRICTED: Only Super Admin can see Sales Team (Users Tab) */}
              {currentUser.role === UserRole.SUPER_ADMIN && (
                <NavItem tab={Tab.ADMIN_TEAM} icon={UserCheck} label="Sales Team" />
              )}
              
              <NavItem tab={Tab.ADMIN_TENANTS} icon={Building2} label="Tenants" />
              <NavItem tab={Tab.ADMIN_AGENTS} icon={Headset} label="AI Configuration" />
              <div className="mt-4 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">System</div>
              <NavItem tab={Tab.SETTINGS} icon={SettingsIcon} />
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Main</div>
              <NavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} />
              <NavItem tab={Tab.CALENDAR} icon={Calendar} label="Calendar" />
              <NavItem tab={Tab.LEADS} icon={Users} />
              <NavItem tab={Tab.CLAIMS} icon={Umbrella} alert />
              <NavItem tab={Tab.AI_RECEPTIONIST} icon={Mic} label="AI Receptionist" />

              {/* Collapsible Section: Production */}
              <div className="mt-3">
                 <button
                    onClick={() => setProductionOpen(!productionOpen)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300"
                    title="Production"
                 >
                    <span>Production</span>
                    {productionOpen ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                 </button>
                 {productionOpen && (
                    <div className="pl-2 space-y-0.5 mt-0.5">
                        <NavItem tab={Tab.JOBS} icon={Briefcase} />
                        <NavItem tab={Tab.TASKS} icon={CheckSquare} />
                        <NavItem tab={Tab.ESTIMATES} icon={FileText} />
                    </div>
                 )}
              </div>

              {/* Collapsible Section: Finance */}
              <div className="mt-3">
                 <button
                    onClick={() => setFinanceOpen(!financeOpen)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300"
                    title="Finance"
                 >
                    <span>Finance</span>
                    {financeOpen ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                 </button>
                 {financeOpen && (
                    <div className="pl-2 space-y-0.5 mt-0.5">
                        <NavItem tab={Tab.INVOICES} icon={Receipt} />
                        <NavItem tab={Tab.PRICE_BOOK} icon={Tag} label="Price Book" />
                    </div>
                 )}
              </div>
              
              <div className="mt-4 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Admin</div>
              <NavItem tab={Tab.AUTOMATIONS} icon={Zap} label="Workflows" />
              <NavItem tab={Tab.TEAM} icon={UserCheck} label="Team" />
              <NavItem tab={Tab.SETTINGS} icon={SettingsIcon} />
            </>
          )}
        </nav>

        {/* Profile Footer */}
        <div className="border-t border-slate-800 bg-[#0B1120] shrink-0 p-3">
           <div className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg ring-2 ring-indigo-600/20 shrink-0">
                  {currentUser.avatarInitials}
              </div>

              <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.role}</p>
              </div>

              <button
                onClick={logout}
                className="text-slate-500 hover:text-red-400 transition-colors p-1 hover:bg-slate-800 rounded-md"
                title="Logout"
              >
                 <LogOut size={16} />
              </button>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;