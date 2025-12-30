import React, { useState } from 'react';
import { SalesRepApplicant, ApplicantStatus } from '../../types';
import { User, Mail, Phone, MapPin, Briefcase, FileText, Linkedin, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface SuperAdminApplicantsProps {
  applicants: SalesRepApplicant[];
  onUpdateApplicant: (applicant: SalesRepApplicant) => void;
}

const SuperAdminApplicants: React.FC<SuperAdminApplicantsProps> = ({
  applicants,
  onUpdateApplicant
}) => {
  const [selectedApplicant, setSelectedApplicant] = useState<SalesRepApplicant | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApplicantStatus | 'All'>('All');
  const [notes, setNotes] = useState('');

  const filteredApplicants = applicants.filter(applicant =>
    filterStatus === 'All' || applicant.status === filterStatus
  );

  const handleStatusChange = (applicant: SalesRepApplicant, newStatus: ApplicantStatus) => {
    onUpdateApplicant({
      ...applicant,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleSaveNotes = () => {
    if (selectedApplicant) {
      onUpdateApplicant({
        ...selectedApplicant,
        notes,
        updatedAt: new Date().toISOString()
      });
      setSelectedApplicant(null);
      setNotes('');
    }
  };

  const getStatusColor = (status: ApplicantStatus) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Reviewing': return 'bg-yellow-100 text-yellow-800';
      case 'Interview': return 'bg-purple-100 text-purple-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ApplicantStatus) => {
    switch (status) {
      case 'New': return <Clock size={16} />;
      case 'Reviewing': return <Eye size={16} />;
      case 'Interview': return <User size={16} />;
      case 'Approved': return <CheckCircle size={16} />;
      case 'Rejected': return <XCircle size={16} />;
      default: return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sales Rep Applications</h2>
        <p className="text-slate-600">Review and manage applications for sales representative positions</p>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {(['All', 'New', 'Reviewing', 'Interview', 'Approved', 'Rejected'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {status} {status !== 'All' && `(${applicants.filter(a => a.status === status).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredApplicants.map(applicant => (
          <div
            key={applicant.id}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg text-slate-800">
                  {applicant.firstName} {applicant.lastName}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(applicant.status)} mt-1`}>
                  {getStatusIcon(applicant.status)}
                  {applicant.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail size={16} />
                <a href={`mailto:${applicant.email}`} className="hover:text-blue-600">
                  {applicant.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={16} />
                <a href={`tel:${applicant.phone}`} className="hover:text-blue-600">
                  {applicant.phone}
                </a>
              </div>
              {applicant.location && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={16} />
                  <span>{applicant.location}</span>
                </div>
              )}
              {applicant.experience && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase size={16} />
                  <span className="line-clamp-1">{applicant.experience}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              {applicant.resume && (
                <a
                  href={applicant.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm"
                >
                  <FileText size={14} />
                  Resume
                </a>
              )}
              {applicant.linkedIn && (
                <a
                  href={applicant.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  <Linkedin size={14} />
                  LinkedIn
                </a>
              )}
            </div>

            {applicant.coverLetter && (
              <div className="mb-3 p-2 bg-slate-50 rounded text-xs text-slate-600 max-h-20 overflow-y-auto">
                <p className="font-medium mb-1">Cover Letter:</p>
                <p className="whitespace-pre-wrap">{applicant.coverLetter}</p>
              </div>
            )}

            {applicant.notes && (
              <div className="mb-3 p-2 bg-yellow-50 rounded text-xs text-slate-600">
                <p className="font-medium mb-1">Notes:</p>
                <p className="whitespace-pre-wrap">{applicant.notes}</p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedApplicant(applicant);
                  setNotes(applicant.notes || '');
                }}
                className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm flex items-center gap-1"
              >
                <FileText size={14} />
                Add Note
              </button>

              {applicant.status === 'New' && (
                <button
                  onClick={() => handleStatusChange(applicant, 'Reviewing')}
                  className="px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  Review
                </button>
              )}

              {(applicant.status === 'Reviewing' || applicant.status === 'New') && (
                <button
                  onClick={() => handleStatusChange(applicant, 'Interview')}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  Interview
                </button>
              )}

              {applicant.status !== 'Approved' && applicant.status !== 'Rejected' && (
                <>
                  <button
                    onClick={() => handleStatusChange(applicant, 'Approved')}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(applicant, 'Rejected')}
                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
              Applied: {new Date(applicant.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {filteredApplicants.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <User size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">No Applications Found</h3>
          <p className="text-slate-600">
            {filterStatus === 'All'
              ? 'No applications have been submitted yet.'
              : `No applications with status "${filterStatus}".`}
          </p>
        </div>
      )}

      {selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              Add Notes - {selectedApplicant.firstName} {selectedApplicant.lastName}
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this applicant..."
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSelectedApplicant(null);
                  setNotes('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminApplicants;
