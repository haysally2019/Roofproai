import React, { useState } from 'react';
import {
  UserPlus, Loader2, CheckCircle, Zap, Briefcase, DollarSign,
  TrendingUp, Users, Award, Mail, Phone, MapPin, LinkedinIcon,
  FileText, MessageSquare, Clock, Target
} from 'lucide-react';

export default function ApplicationForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    experience: '',
    linkedin: '',
    resume: '',
    coverLetter: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-application`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          experience: formData.experience,
          linkedin: formData.linkedin,
          resume: formData.resume,
          cover_letter: formData.coverLetter,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="text-white" size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Application Received!</h2>
            <div className="space-y-3 text-left bg-slate-50 rounded-xl p-6 mb-8">
              <p className="text-slate-700 leading-relaxed">
                Thank you for your interest in joining Rafter AI as a Sales Representative. Your application has been successfully submitted and is now under review.
              </p>
              <div className="border-l-4 border-blue-600 pl-4 py-2">
                <p className="font-semibold text-slate-900 mb-1">What happens next?</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Our team will review your application within 2-3 business days</li>
                  <li>• If selected, we'll reach out to schedule an interview</li>
                  <li>• You'll receive updates via the email address you provided</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Zap className="text-white fill-white" size={32} strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Join the Rafter AI Team
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Become a Sales Representative and help revolutionize the roofing industry
            </p>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <DollarSign className="text-green-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">Competitive</div>
                <div className="text-sm text-blue-100">Commission Structure</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <TrendingUp className="text-blue-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">High Growth</div>
                <div className="text-sm text-blue-100">Career Potential</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Users className="text-purple-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">Remote</div>
                <div className="text-sm text-blue-100">Work Anywhere</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Award className="text-yellow-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">Leading</div>
                <div className="text-sm text-blue-100">AI Technology</div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Benefits */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="text-blue-400" size={24} />
                  Why Join Us?
                </h3>
                <ul className="space-y-3 text-blue-50">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                    <span className="text-sm">Unlimited earning potential with industry-leading commissions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                    <span className="text-sm">Sell cutting-edge AI technology that sells itself</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                    <span className="text-sm">Full training and ongoing support provided</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                    <span className="text-sm">Work remotely with flexible hours</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                    <span className="text-sm">Be part of a fast-growing startup</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                    <span className="text-sm">Direct access to founders and leadership</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="text-purple-400" size={24} />
                  Ideal Candidate
                </h3>
                <ul className="space-y-2 text-blue-50 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    Experience in B2B sales
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    Tech-savvy and quick learner
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    Self-motivated and driven
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    Excellent communication skills
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    Goal-oriented mindset
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-md rounded-2xl p-6 border border-blue-400/30">
                <Clock className="text-blue-300 mb-3" size={32} />
                <h3 className="text-lg font-bold text-white mb-2">Quick Review Process</h3>
                <p className="text-sm text-blue-100">
                  Applications are typically reviewed within 2-3 business days. We'll contact qualified candidates to schedule an interview.
                </p>
              </div>
            </div>

            {/* Right Column - Application Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <UserPlus className="text-indigo-600" size={28} />
                  <h2 className="text-3xl font-bold text-slate-900">Application Form</h2>
                </div>
                <p className="text-slate-600 mb-8">
                  Fill out the form below to apply. Fields marked with <span className="text-red-500">*</span> are required.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                    <p className="text-red-800 font-semibold">Error</p>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-600 font-bold">1</span>
                      </div>
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Mail className="inline mr-1" size={16} />
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-600 font-bold">2</span>
                      </div>
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Mail className="inline mr-1" size={16} />
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Phone className="inline mr-1" size={16} />
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <MapPin className="inline mr-1" size={16} />
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="City, State"
                      />
                      <p className="text-xs text-slate-500 mt-1">Help us understand your location for regional opportunities</p>
                    </div>
                  </div>

                  {/* Professional Background */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-600 font-bold">3</span>
                      </div>
                      Professional Background
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <Briefcase className="inline mr-1" size={16} />
                          Sales Experience
                        </label>
                        <textarea
                          value={formData.experience}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                          placeholder="Tell us about your sales experience, industries you've worked in, and notable achievements..."
                        />
                        <p className="text-xs text-slate-500 mt-1">Include years of experience, types of sales, and any relevant accomplishments</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <LinkedinIcon className="inline mr-1" size={16} />
                          LinkedIn Profile
                        </label>
                        <input
                          type="url"
                          value={formData.linkedin}
                          onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          <FileText className="inline mr-1" size={16} />
                          Resume URL
                        </label>
                        <input
                          type="url"
                          value={formData.resume}
                          onChange={(e) => setFormData({ ...formData, resume: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="https://example.com/your-resume.pdf"
                        />
                        <p className="text-xs text-slate-500 mt-1">Upload your resume to Google Drive or Dropbox and paste the shareable link</p>
                      </div>
                    </div>
                  </div>

                  {/* Why Join Us */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-600 font-bold">4</span>
                      </div>
                      Tell Us About Yourself
                    </h3>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <MessageSquare className="inline mr-1" size={16} />
                        Why do you want to join Rafter AI?
                      </label>
                      <textarea
                        value={formData.coverLetter}
                        onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                        placeholder="Share your motivation for joining our team, what excites you about AI technology, and how you can contribute to our success..."
                      />
                      <p className="text-xs text-slate-500 mt-1">This is your chance to stand out - tell us what makes you a great fit!</p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-indigo-400 disabled:to-blue-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2 text-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={24} />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <UserPlus size={24} />
                          Submit Application
                        </>
                      )}
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-3">
                      By submitting this application, you agree to our privacy policy and terms of service.
                    </p>
                  </div>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-200 text-center">
                  <p className="text-sm text-slate-600">
                    Already have an account?{' '}
                    <button
                      onClick={() => (window.location.href = '/')}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-blue-200 text-sm">
            <p>&copy; 2025 Rafter AI Inc. • Transforming the roofing industry with AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
