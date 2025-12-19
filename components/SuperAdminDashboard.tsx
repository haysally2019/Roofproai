import React from 'react';
import { Company, User, SoftwareLead, Tab } from '../types';
import { useStore } from '../lib/store';
import SuperAdminOverview from './super-admin/SuperAdminOverview';
import SuperAdminTenants from './super-admin/SuperAdminTenants';
import SuperAdminTeam from './super-admin/SuperAdminTeam';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import SuperAdminAIConfig from './super-admin/SuperAdminAIConfig';

interface SuperAdminDashboardProps {
  view: Tab;
  companies: Company[];
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  users: User[];
  onAddUser: (user: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
  currentUser: User;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  view, companies, onAddCompany, users, onAddUser, onRemoveUser,
  currentUser, softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead
}) => {
  const { updateCompany, addToast, deleteSoftwareLead } = useStore();

  return (
    <div className="space-y-6 animate-fade-in">
      {view === Tab.ADMIN_OVERVIEW && (
        <SuperAdminOverview companies={companies} users={users} leads={softwareLeads} />
      )}

      {view === Tab.ADMIN_LEADS && (
        <SuperAdminLeads 
          leads={softwareLeads} 
          users={users} 
          currentUser={currentUser}
          onAddLead={onAddSoftwareLead}
          onUpdateLead={onUpdateSoftwareLead}
          onDeleteLead={deleteSoftwareLead}
        />
      )}

      {view === Tab.ADMIN_TENANTS && (
        <SuperAdminTenants 
           companies={companies} 
           onAddCompany={onAddCompany}
        />
      )}

      {view === Tab.ADMIN_TEAM && (
        <SuperAdminTeam 
          users={users} 
          onAddUser={onAddUser} 
          onRemoveUser={onRemoveUser} 
        />
      )}

      {view === Tab.ADMIN_AGENTS && (
        <SuperAdminAIConfig 
          companies={companies} 
          updateCompany={updateCompany} 
          addToast={addToast}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;