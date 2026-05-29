import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Award, Upload, CheckCircle, AlertCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

export default function BusPass() {
  const [category, setCategory] = useState('student');
  const [passType, setPassType] = useState('monthly');
  const [docType, setDocType] = useState('student_id');
  const [file, setFile] = useState(null);

  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => { fetchPasses(); }, []);

  async function fetchPasses() {
    try {
      const list = await apiService.getMyPasses();
      setPasses(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please upload a supporting document'); return; }

    setLoading(true);
    setError(null);

    const steps = [
      'Reading uploaded image file...',
      'Running Tesseract OCR text extraction...',
      'Parsing identity tokens from text document...',
      'Executing eligibility classification model...',
      'Scanning registry database for duplicates/fraud...',
      'Finalizing pass application...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('pass_type', passType);
      formData.append('document_type', docType);
      formData.append('file', file);

      await apiService.applyForPass(formData);
      setFile(null);
      fetchPasses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const handlePay = async (passId) => {
    try {
      await apiService.payPass(passId);
      fetchPasses();
    } catch (err) {
      setError(err.message);
    }
  };

  const categories = [
    { value: 'student', label: 'Student', desc: 'Free travel in TN', emoji: '🎓' },
    { value: 'general', label: 'General', desc: 'Commuter rate', emoji: '👤' },
    { value: 'senior_citizen', label: 'Senior Citizen', desc: 'Free/Discounted', emoji: '🧓' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="animate-fade-in">
        <h1 className="section-title flex items-center gap-2">
          <Award className="h-8 w-8 text-tn-primary" />
          Digital Bus Pass Portal
        </h1>
        <p className="section-subtitle">
          Apply, renew, and manage your digitized transport passes powered by OCR & Machine Learning verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl h-fit space-y-5 animate-fade-in-up">
          <h2 className="font-display font-bold text-lg text-tn-text">Apply for Pass</h2>

          {error && (
            <div className="alert alert-error">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-tn-primary animate-spin" />
                <div className="absolute inset-0 h-10 w-10 rounded-full animate-pulse-glow" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-tn-text">AI Engine Processing</p>
                <p className="text-xs text-tn-text-secondary animate-pulse">{processingStep}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category radio cards */}
              <div>
                <label className="form-label">Pass Category</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        if (cat.value === 'student') setDocType('student_id');
                        else if (cat.value === 'senior_citizen') setDocType('senior_id');
                        else setDocType('aadhar');
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${
                        category === cat.value
                          ? 'border-tn-primary bg-tn-primary/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <div>
                        <div className={`font-semibold ${category === cat.value ? 'text-tn-primary' : 'text-tn-text'}`}>{cat.label}</div>
                        <div className="text-[10px] text-tn-text-muted">{cat.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Validity Range</label>
                <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select mt-1">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="form-label">Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="form-select mt-1">
                  {category === 'student' && <option value="student_id">Student College/School ID Card</option>}
                  {category === 'senior_citizen' && <option value="senior_id">Senior Citizen Age Certificate</option>}
                  <option value="aadhar">Aadhar Card (UIDAI)</option>
                  <option value="driving_license">Driving License</option>
                </select>
              </div>

              <div>
                <label className="form-label">Upload Verification Document</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-tn-primary/50 transition-colors cursor-pointer relative group">
                  <input type="file" required accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="space-y-1 text-center pointer-events-none">
                    <Upload className="mx-auto h-8 w-8 text-tn-text-muted group-hover:text-tn-primary transition-colors" />
                    <p className="text-xs text-tn-text-secondary"><span className="text-tn-primary font-semibold">Upload document image</span></p>
                    <p className="text-[10px] text-tn-text-muted">PNG, JPG up to 5MB</p>
                  </div>
                </div>
                {file && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium truncate">✓ {file.name}</p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full py-3">
                Submit Application
              </button>
            </form>
          )}
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-tn-text">Your Applications</h2>
            <button onClick={fetchPasses} className="p-2 text-tn-text-muted hover:text-tn-primary rounded-lg hover:bg-slate-100 transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {fetching ? (
            <div className="space-y-4">
              <div className="skeleton h-32" />
              <div className="skeleton h-32" />
            </div>
          ) : passes.length > 0 ? (
            <div className="space-y-4">
              {passes.map((pass, idx) => (
                <div key={pass.id} className="glass-panel p-6 rounded-2xl space-y-5 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-lg text-tn-text capitalize">
                          {pass.category.replace('_', ' ')} Pass
                        </h3>
                        <span className="badge badge-info">{pass.pass_type}</span>
                      </div>
                      <p className="text-xs text-tn-text-muted mt-0.5">Applied at {new Date(pass.applied_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        pass.status === 'approved' ? 'badge-success' :
                        pass.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {pass.status}
                      </span>
                      {pass.status === 'approved' && pass.payment_status === 'pending' && (
                        <button onClick={() => handlePay(pass.id)} className="btn-primary text-xs py-1.5 px-3">
                          Pay ₹{pass.amount}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ML Verification Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-tn-text-muted font-medium">OCR Extracted Data</span>
                      <p className="text-tn-text mt-1 font-mono text-[10px] line-clamp-3 bg-white border border-slate-100 p-2 rounded-lg max-h-16 overflow-y-auto">
                        {pass.ocr_extracted_text || 'No text extracted'}
                      </p>
                    </div>
                    <div>
                      <span className="text-tn-text-muted font-medium">ML Eligibility Score</span>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${pass.ml_eligibility_score >= 0.5 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${(pass.ml_eligibility_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-tn-text">{(pass.ml_eligibility_score || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-tn-text-muted font-medium">Fraud Risk Score</span>
                      <div className="flex items-center gap-1.5 mt-2">
                        {pass.fraud_risk_score >= 0.5 ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className={`font-semibold ${pass.fraud_risk_score >= 0.5 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {(pass.fraud_risk_score || 0).toFixed(2)} {pass.fraud_risk_score >= 0.5 ? '(Flagged)' : '(Low Risk)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Display */}
                  {pass.status === 'approved' && pass.payment_status === 'paid' && pass.qr_code_url && (
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                      <img src={pass.qr_code_url} alt="Pass QR" className="h-28 w-28 p-1.5 bg-white rounded-xl border border-slate-200 shadow-md" />
                      <div className="space-y-2 text-center sm:text-left">
                        <div>
                          <p className="text-xs text-tn-text-secondary">Digital Conductor Scan Token</p>
                          <p className="text-sm font-bold text-tn-text font-mono">{pass.qr_code_data}</p>
                        </div>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-tn-text-secondary">
                          <div>Valid From: <span className="text-tn-text font-semibold">{new Date(pass.valid_from).toLocaleDateString()}</span></div>
                          <div>Valid To: <span className="text-tn-text font-semibold">{new Date(pass.valid_until).toLocaleDateString()}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-tn-text-secondary text-sm">No pass applications found. Apply for one on the left panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
