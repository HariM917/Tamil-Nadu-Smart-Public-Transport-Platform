import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import {
  Award, Upload, CheckCircle, AlertCircle, AlertTriangle, Loader2, RefreshCw,
  ChevronRight, ChevronLeft, Shield, CreditCard, FileText,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const STEPS = ['Pass Type', 'Application', 'Aadhaar OCR', 'Documents', 'Review & Submit'];

const CATEGORY_LABELS = {
  student: 'Student Pass',
  general: 'Adult Pass',
  senior_citizen: 'Senior Citizen Pass',
};

export default function BusPass() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [passTypes, setPassTypes] = useState([]);
  const [category, setCategory] = useState('student');
  const [passType, setPassType] = useState('monthly');

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [formDob, setFormDob] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [collegeIdFile, setCollegeIdFile] = useState(null);
  const [bonafideFile, setBonafideFile] = useState(null);
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [lastSubmitted, setLastSubmitted] = useState(null);

  useEffect(() => {
    fetchPasses();
    apiService.getPassTypes().then(setPassTypes).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

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

  const selectedPricing = passTypes.find((p) => p.category === category)?.pricing || {};
  const monthlyAmount = selectedPricing[passType] ?? 0;

  const ocrMatchesForm = () => {
    if (!ocrPreview) return null;
    const nameOk =
      !ocrPreview.ocr_name ||
      fullName.toLowerCase().split(/\s+/).some((w) => ocrPreview.ocr_name?.toLowerCase().includes(w));
    const aadhaarOk =
      !aadhaarLast4 ||
      ocrPreview.masked_aadhaar?.replace(/\D/g, '').endsWith(aadhaarLast4);
    return { nameOk, aadhaarOk, allOk: nameOk && aadhaarOk };
  };

  const runOcrPreview = async () => {
    if (!aadhaarFile) {
      setError('Upload your Aadhaar card image first');
      return;
    }
    setOcrLoading(true);
    setError(null);
    try {
      const data = await apiService.previewAadhaarOcr(aadhaarFile);
      setOcrPreview(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!aadhaarFile) {
      setError('Aadhaar document is required');
      return;
    }
    if (category === 'student' && (!collegeIdFile || !bonafideFile)) {
      setError('College ID and Bonafide are required for student passes');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('pass_type', passType);
      formData.append('document_type', 'aadhar');
      formData.append('full_name', fullName);
      if (formDob) formData.append('form_dob', formDob);
      formData.append('aadhaar_last4', aadhaarLast4);
      formData.append('aadhaar_file', aadhaarFile);
      if (category === 'student') {
        formData.append('college_id_file', collegeIdFile);
        formData.append('bonafide_file', bonafideFile);
      }

      const result = await apiService.applyForPass(formData);
      setLastSubmitted(result);
      setStep(0);
      setAadhaarFile(null);
      setCollegeIdFile(null);
      setBonafideFile(null);
      setOcrPreview(null);
      fetchPasses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const match = ocrMatchesForm();

  const renderWizard = () => {
    if (!user?.aadhaar_verified) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-amber-800">Profile Aadhaar verification required</p>
          <a href="/profile" className="btn-primary w-full py-2.5 text-xs inline-block">Verify in Profile</a>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${
                i === step ? 'bg-tn-primary text-white' : i < step ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-error text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-tn-text-secondary">Select your pass category and billing period.</p>
            {(passTypes.length ? passTypes : [
              { category: 'student', label: 'Student Pass', emoji: '🎓', pricing: { monthly: 200 } },
              { category: 'general', label: 'Adult Pass', emoji: '👤', pricing: { monthly: 1000 } },
              { category: 'senior_citizen', label: 'Senior Citizen Pass', emoji: '🧓', pricing: { monthly: 500 } },
            ]).map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setCategory(cat.category)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
                  category === cat.category ? 'border-tn-primary bg-tn-primary/5' : 'border-slate-200'
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <div className="flex-grow">
                  <div className="font-semibold text-sm">{cat.label}</div>
                  <div className="text-[10px] text-tn-text-muted">From ₹{cat.pricing?.monthly}/month</div>
                </div>
              </button>
            ))}
            <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select">
              <option value="monthly">Monthly — ₹{selectedPricing.monthly ?? '—'}</option>
              <option value="quarterly">Quarterly — ₹{selectedPricing.quarterly ?? '—'}</option>
              <option value="annual">Annual — ₹{selectedPricing.annual ?? '—'}</option>
            </select>
            <button type="button" onClick={() => setStep(1)} className="btn-primary w-full flex items-center justify-center gap-1">
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <input className="form-input" placeholder="Full name (as on Aadhaar)" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="form-input" type="date" placeholder="Date of birth" value={formDob} onChange={(e) => setFormDob(e.target.value)} />
            <input
              className="form-input font-mono"
              placeholder="Aadhaar last 4 digits"
              maxLength={4}
              value={aadhaarLast4}
              onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />
            <label className="form-label">Upload Aadhaar (image/PDF)</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files[0])} className="text-xs w-full" />
            {aadhaarFile && <p className="text-xs text-emerald-600">✓ {aadhaarFile.name}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1"><ChevronLeft className="h-4 w-4 inline" /> Back</button>
              <button type="button" onClick={runOcrPreview} disabled={ocrLoading || !aadhaarFile} className="btn-primary flex-1">
                {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Run OCR'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && ocrPreview && (
          <div className="space-y-3 text-sm">
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 border">
              <p><span className="text-tn-text-muted">Name:</span> <strong>{ocrPreview.ocr_name || '—'}</strong></p>
              <p><span className="text-tn-text-muted">DOB:</span> <strong>{ocrPreview.ocr_dob || '—'}</strong></p>
              <p><span className="text-tn-text-muted">Aadhaar:</span> <strong className="font-mono">{ocrPreview.masked_aadhaar || 'XXXX XXXX ****'}</strong></p>
            </div>
            {match && (
              <div className={`rounded-xl p-3 text-xs ${match.allOk ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                {match.allOk ? (
                  <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Form matches OCR — OK to continue</span>
                ) : (
                  <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Name or Aadhaar mismatch — review before submitting</span>
                )}
              </div>
            )}
            <button type="button" onClick={() => setStep(category === 'student' ? 3 : 4)} className="btn-primary w-full">
              {category === 'student' ? 'Upload Student Documents' : 'Review Application'}
            </button>
          </div>
        )}

        {step === 3 && category === 'student' && (
          <div className="space-y-3">
            <label className="form-label">College ID Card</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setCollegeIdFile(e.target.files[0])} className="text-xs w-full" />
            <label className="form-label">Bonafide Certificate</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setBonafideFile(e.target.files[0])} className="text-xs w-full" />
            <button type="button" onClick={() => setStep(4)} disabled={!collegeIdFile || !bonafideFile} className="btn-primary w-full">
              Continue to Review
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs space-y-1">
              <p className="font-bold text-tn-primary flex items-center gap-1"><Shield className="h-4 w-4" /> Summary</p>
              <p>{CATEGORY_LABELS[category]} · {passType} · ₹{monthlyAmount}</p>
              <p>Applicant: {fullName}</p>
              <p className="font-mono">Aadhaar: {ocrPreview?.masked_aadhaar || `XXXX XXXX ${aadhaarLast4}`}</p>
            </div>
            <p className="text-[10px] text-tn-text-muted">
              AI will compute a verification score. If ≥70% and no fraud flags, your pass is auto-approved for payment.
            </p>
            <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Submit Application'}
            </button>
          </div>
        )}

        {lastSubmitted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
            <p className="font-bold text-emerald-800 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Application #{lastSubmitted.id} submitted</p>
            <p>Verification score: <strong>{lastSubmitted.verification_score}%</strong> ({lastSubmitted.ml_verification_status})</p>
            <p>Status: <strong>{lastSubmitted.status}</strong> · Payment: {lastSubmitted.payment_status}</p>
            {lastSubmitted.status === 'approved' && lastSubmitted.payment_status === 'pending' && (
              <button type="button" onClick={() => handlePay(lastSubmitted.id)} className="btn-primary w-full text-xs mt-2 flex items-center justify-center gap-1">
                <CreditCard className="h-4 w-4" /> Pay ₹{lastSubmitted.amount}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="animate-fade-in">
        <h1 className="section-title flex items-center gap-2">
          <Award className="h-8 w-8 text-tn-primary" />
          Digital Bus Pass Portal
        </h1>
        <p className="section-subtitle">
          Multi-step apply workflow with Aadhaar OCR, verification score, payment, and QR digital pass.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl h-fit space-y-4 animate-fade-in-up">
          <h2 className="font-display font-bold text-lg text-tn-text flex items-center gap-2">
            <FileText className="h-5 w-5 text-tn-primary" />
            New Application
          </h2>
          {renderWizard()}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-tn-text">Your Passes</h2>
            <button onClick={fetchPasses} className="p-2 text-tn-text-muted hover:text-tn-primary rounded-lg">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {fetching ? (
            <div className="skeleton h-32" />
          ) : passes.length > 0 ? (
            <div className="space-y-4">
              {passes.map((pass, idx) => (
                <div key={pass.id} className="glass-panel p-6 rounded-2xl space-y-4 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-lg capitalize">
                        {CATEGORY_LABELS[pass.category] || pass.category}
                      </h3>
                      <p className="text-xs text-tn-text-muted">{pass.pass_type} · Applied {new Date(pass.applied_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${pass.status === 'approved' ? 'badge-success' : pass.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                        {pass.status}
                      </span>
                      {pass.status === 'approved' && pass.payment_status === 'pending' && (
                        <button onClick={() => handlePay(pass.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                          <CreditCard className="h-3 w-3" /> Pay ₹{pass.amount}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-tn-text-muted block">Verification</span>
                      <span className="font-bold text-lg">{pass.verification_score ?? 0}%</span>
                    </div>
                    <div>
                      <span className="text-tn-text-muted block">ML Status</span>
                      <span className="font-semibold capitalize">{pass.ml_verification_status}</span>
                    </div>
                    <div>
                      <span className="text-tn-text-muted block">Masked Aadhaar</span>
                      <span className="font-mono">{pass.ocr_aadhaar || '—'}</span>
                    </div>
                    <div>
                      <span className="text-tn-text-muted block">Fraud Risk</span>
                      <span className={pass.fraud_risk_score >= 0.5 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                        {(pass.fraud_risk_score || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {pass.status === 'approved' && pass.payment_status === 'paid' && pass.qr_code_url && (
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                      <img src={pass.qr_code_url} alt="Pass QR" className="h-28 w-28 p-1.5 bg-white rounded-xl border shadow-md" />
                      <div className="text-center sm:text-left text-xs space-y-1">
                        <p className="font-mono font-bold">{pass.qr_code_data}</p>
                        <p>Valid: {pass.valid_from && new Date(pass.valid_from).toLocaleDateString()} — {pass.valid_until && new Date(pass.valid_until).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-sm text-tn-text-secondary">
              No applications yet. Use the wizard to apply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
