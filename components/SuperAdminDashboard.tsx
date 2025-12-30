import React, { useState } from 'react';
import { Company, User, SoftwareLead, Tab, UserRole, SalesRepApplicant } from '../types';
import { useStore } from '../lib/store';
import SuperAdminOverview from './super-admin/SuperAdminOverview';
import SuperAdminTenants from './super-admin/SuperAdminTenants';
import SuperAdminTeam from './super-admin/SuperAdminTeam';
import SuperAdminLeads from './super-admin/SuperAdminLeads';
import SuperAdminAIConfig from './super-admin/SuperAdminAIConfig';
import SuperAdminApplicants from './super-admin/SuperAdminApplicants';

interface SuperAdminDashboardProps {
  view: Tab;
  companies: Company[];
  onAddCompany: (company: Partial<Company>) => Promise<string | null>;
  users: User[];
  onAddUser: (user: Partial<User>) => Promise<string | null>;
  onRemoveUser: (userId: string) => void;
  currentUser: User;
  softwareLeads: SoftwareLead[];
  onAddSoftwareLead: (lead: SoftwareLead) => void;
  onUpdateSoftwareLead: (lead: SoftwareLead) => void;
  applicants: SalesRepApplicant[];
  onUpdateApplicant: (applicant: SalesRepApplicant) => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  view, companies, onAddCompany, users, onAddUser, onRemoveUser,
  currentUser, softwareLeads, onAddSoftwareLead, onUpdateSoftwareLead,
  applicants, onUpdateApplicant
}) => {
  const { updateCompany, addToast, deleteSoftwareLead, setTab } = useStore();
  
  // State to handle converting a lead into a tenant (pre-filling the form)
  const [onboardingInitialData, setOnboardingInitialData] = useState<Partial<Company> | null>(null);

  const handleConvertLead = (lead: SoftwareLead) => {
      setOnboardingInitialData({
          name: lead.companyName,
          // We can try to parse address/phone if we had them structured, 
          // for now we pass name and use the contact as admin potentially later
          phone: lead.phone
      });
      setTab(Tab.ADMIN_TENANTS);
      addToast(`Converting ${lead.companyName} to Tenant...`, 'info');
  };

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
          onConvertLead={handleConvertLead} // Pass conversion handler
        />
      )}

      {view === Tab.ADMIN_TENANTS && (
        <SuperAdminTenants 
           companies={companies} 
           users={users}
           onAddCompany={onAddCompany}
           initialData={onboardingInitialData} // Pass pre-filled data
           onClearInitialData={() => setOnboardingInitialData(null)}
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

      {view === Tab.ADMIN_APPLICANTS && (
        <SuperAdminApplicants
          applicants={applicants}
          onUpdateApplicant={onUpdateApplicant}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;