import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import {
  Award, Upload, CheckCircle, AlertCircle, AlertTriangle, Loader2, RefreshCw,
  ChevronRight, ChevronLeft, Shield, CreditCard, FileText, Download
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const STEPS = ['Pass Type', 'Application', 'Aadhaar OCR', 'Documents', 'Review & Submit'];

const CATEGORY_LABELS = {
  school_student: 'School Student (Free)',
  college_student: 'College Student (50%)',
  general: 'Adult Pass',
  senior_citizen: 'Senior Citizen Pass (Free)',
  press_reporter: 'Press Reporter (Free)',
  differently_abled: 'Differently Abled (Free)',
  visually_impaired: 'Visually Impaired (Free)',
  freedom_fighter: 'Freedom Fighter / Scholar (Free)',
};

const ISSUING_POINTS = [
  "Adyar", "Ambathur Industrial Estate", "Ambathur OT.", "Anna Nagar (West)",
  "Avadi", "Ayanavaram", "Broadway", "C.M.B.T", "Central Rly station",
  "Guindy Industrial Estate", "Iyyappanthangal", "K.K.Nagar", "M.K.B.Nagar",
  "Mandaveli", "Pallavaram", "Perambur", "Poonamallee", "Redhills",
  "Saidapet", "Sriperumbathur", "T.Nagar", "Tambaram (West)", "Thiruvanmiyur",
  "Thiruvotriyur", "Tondiarpet", "Vadapalani", "Vallalar Nagar", "Velachery",
  "Villivakkam"
];

export default function BusPass() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [passTypes, setPassTypes] = useState([]);
  const [category, setCategory] = useState('school_student');
  const [passType, setPassType] = useState('monthly');
  const [applicationMode, setApplicationMode] = useState('online');

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [formDob, setFormDob] = useState('');
  const [gender, setGender] = useState('');
  const [ageProofType, setAgeProofType] = useState('aadhaar');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [rationCardNumber, setRationCardNumber] = useState('');
  const [issuingPoint, setIssuingPoint] = useState('');

  // Student specific excel fields
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [doorStreet, setDoorStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [journeyFrom, setJourneyFrom] = useState('');
  const [journeyTo, setJourneyTo] = useState('');
  const [busFare, setBusFare] = useState('');

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
    const isStudent = category === 'school_student' || category === 'college_student';
    if (isStudent && (!collegeIdFile || !bonafideFile)) {
      setError('Institution ID and Bonafide are required for student passes');
      return;
    }
    if (category === 'press_reporter' && !collegeIdFile) {
      setError('Press Accreditation ID is required.');
      return;
    }
    if (category === 'differently_abled' && !collegeIdFile) {
      setError('Disability Certificate (>40%) is required.');
      return;
    }
    if (category === 'visually_impaired' && !collegeIdFile) {
      setError('Disability Certificate (>40%) is required.');
      return;
    }
    if (category === 'freedom_fighter' && !collegeIdFile) {
      setError('Pension/Financial Assistance Certificate is required.');
      return;
    }

    if (category === 'senior_citizen' && !rationCardNumber.trim()) {
      setError('Ration Card Number is required for Senior Citizen passes.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('pass_type', passType);
      formData.append('document_type', ageProofType);
      formData.append('full_name', fullName);
      if (phone) formData.append('phone', phone);
      if (gender) formData.append('gender', gender);
      if (formDob) formData.append('form_dob', formDob);
      if (issuingPoint) formData.append('issuing_point', issuingPoint);
      formData.append('aadhaar_last4', aadhaarLast4);
      formData.append('aadhaar_file', aadhaarFile);
      if (category === 'senior_citizen') {
        formData.append('ration_card_number', rationCardNumber);
      }
      if (category === 'school_student' || category === 'college_student') {
        const extraDetails = { schoolName, schoolCode, applicationNumber, studentClass, studentSection, doorStreet, area, city, pincode, journeyFrom, journeyTo, busFare };
        formData.append('extra_details', JSON.stringify(extraDetails));
      }
      const isStudent = category === 'school_student' || category === 'college_student';
      if (isStudent || category === 'press_reporter' || category === 'differently_abled' || category === 'visually_impaired' || category === 'freedom_fighter' || (category === 'senior_citizen' && applicationMode === 'upload')) {
        formData.append('college_id_file', collegeIdFile);
        if (bonafideFile) formData.append('bonafide_file', bonafideFile);
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
              { category: 'school_student', label: 'School Student (Free)', emoji: '🎒', pricing: { monthly: 0 } },
              { category: 'college_student', label: 'College Student (50%)', emoji: '🎓', pricing: { monthly: 120 } },
              { category: 'general', label: 'Adult Pass', emoji: '👤', pricing: { monthly: 320 } },
              { category: 'senior_citizen', label: 'Senior Citizen Pass (Free)', emoji: '🧓', pricing: { monthly: 0 } },
              { category: 'press_reporter', label: 'Press Reporter (Free)', emoji: '🗞️', pricing: { monthly: 0 } },
              { category: 'differently_abled', label: 'Differently Abled (Free)', emoji: '♿', pricing: { monthly: 0 } },
              { category: 'visually_impaired', label: 'Visually Impaired (Free)', emoji: '🦯', pricing: { monthly: 0 } },
              { category: 'freedom_fighter', label: 'Freedom Fighter / Scholar (Free)', emoji: '🏅', pricing: { monthly: 0 } },
            ]).map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => {
                  setCategory(cat.category);
                  if (cat.category === 'college_student') setPassType('stage_2');
                  else if (cat.category === 'general') setPassType('stage_3');
                  else setPassType('monthly');
                }}
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
            {category === 'college_student' ? (
              <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(stage => (
                  <option key={`stage_${stage}`} value={`stage_${stage}`}>
                    Stage {stage} (Monthly) — ₹{selectedPricing[`stage_${stage}`] ?? '—'}
                  </option>
                ))}
              </select>
            ) : category === 'general' ? (
              <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select">
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(stage => (
                  <option key={`stage_${stage}`} value={`stage_${stage}`}>
                    Stage {stage} (Monthly) — ₹{selectedPricing[`stage_${stage}`] ?? '—'}
                  </option>
                ))}
              </select>
            ) : (category === 'school_student' || category === 'press_reporter' || category === 'differently_abled' || category === 'visually_impaired' || category === 'freedom_fighter' || category === 'senior_citizen') ? (
              <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select">
                <option value="monthly">Monthly — ₹0</option>
                {category === 'press_reporter' && <option value="annual">Annual — ₹0</option>}
              </select>
            ) : (
              <select value={passType} onChange={(e) => setPassType(e.target.value)} className="form-select">
                <option value="monthly">Monthly — ₹{selectedPricing.monthly ?? '—'}</option>
                <option value="quarterly">Quarterly — ₹{selectedPricing.quarterly ?? '—'}</option>
                <option value="annual">Annual — ₹{selectedPricing.annual ?? '—'}</option>
              </select>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Eligibility & Instructions
              </p>
              {category === 'school_student' && (
                <div className="space-y-2">
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                    <li>Free for Classes I to XII in Govt/Govt-aided schools, Govt ITIs, and Govt Arts/Polytechnic colleges.</li>
                    <li>Allowed all days. Not valid in Night & AC services.</li>
                    <li>Upload Institution ID and Bonafide Certificate.</li>
                  </ul>
                  <div className="bg-white/50 p-2 rounded-lg border border-blue-200 mt-2">
                    <p className="font-bold text-[10px] mb-1">For Institutions (Bulk Applications):</p>
                    <div className="flex flex-wrap gap-2">
                      <a href="/schoolfreebuspass_instruction.pdf" download className="btn-secondary text-[10px] py-1 px-2 flex items-center gap-1">
                        <Download className="h-3 w-3" /> Instructions
                      </a>
                      <a href="/schoolfreebuspass_softcopy.xlsx" download className="btn-secondary text-[10px] py-1 px-2 flex items-center gap-1">
                        <Download className="h-3 w-3" /> Excel Format
                      </a>
                      <a href="/schoolfreebuspass_delivery_challan.pdf" download className="btn-secondary text-[10px] py-1 px-2 flex items-center gap-1">
                        <Download className="h-3 w-3" /> Delivery Challan
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {category === 'college_student' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>50% concession for College Students. Pricing based on travel stages.</li>
                  <li>Valid from 11th of current month to 10th of next month.</li>
                  <li>Upload Institution ID and Bonafide Certificate.</li>
                </ul>
              )}
              {category === 'senior_citizen' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>1. Applicant must be 60 years of age or older on the date of application.</li>
                  <li>2. Applicant must come in person to collect the free travel identity card and tokens.</li>
                  <li>3. One passport size photograph should be pasted on the application. Bring another similar photograph for the identity card.</li>
                </ul>
              )}
              {category === 'general' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Adult Monthly Season Ticket (MST). Valid from 16th to 15th of next month.</li>
                  <li>Pricing depends on distance stages (Stage 3 to 23). Valid on Ordinary/Express.</li>
                  <li>Aadhaar acts as Age & Address Proof.</li>
                </ul>
              )}
              {category === 'press_reporter' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Free passes issued to accredited Journalists/Reporters.</li>
                  <li>Maximum of 300 passes issued per year per reporter.</li>
                  <li>Upload your valid Press Accreditation ID Card.</li>
                </ul>
              )}
              {category === 'differently_abled' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Free point-to-point travel pass (residence to hospital/institution/workplace).</li>
                  <li>Requires disability of &gt;40%. One attendant allowed for Intellectually Disabled.</li>
                  <li>Upload Disability Certificate issued by District Rehabilitation Officer.</li>
                </ul>
              )}
              {category === 'visually_impaired' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Disability 40% - 69%: Point-to-Point travel allowed.</li>
                  <li>Disability 70% - 100%: All route travel allowed (except AC bus).</li>
                  <li>Upload Disability Certificate issued by District Rehabilitation Officer.</li>
                </ul>
              )}
              {category === 'freedom_fighter' && (
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Available for Freedom Fighters, Language Stir Participants, Legal Heirs, and Tamil Scholars.</li>
                  <li>Allowed to travel in all routes (all STU buses).</li>
                  <li>Upload Pension/Financial Assistance Certificate issued by State/Central Government.</li>
                </ul>
              )}
            </div>

            {category === 'senior_citizen' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                <a href="/SENIOR_CITIZEN_FREE_BUS_PASS_FORM.pdf" download className="btn-secondary flex items-center justify-center gap-1 text-[11px] py-2">
                  <Download className="h-4 w-4" /> Download Form
                </a>
                <button type="button" onClick={() => { setApplicationMode('upload'); setStep(1); }} className="btn-secondary flex items-center justify-center gap-1 text-[11px] py-2">
                  <Upload className="h-4 w-4" /> Upload Filled
                </button>
                <button type="button" onClick={() => { setApplicationMode('online'); setStep(1); }} className="btn-primary flex items-center justify-center gap-1 text-[11px] py-2">
                  <FileText className="h-4 w-4" /> Apply Online
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setStep(1)} className="btn-primary w-full flex items-center justify-center gap-1 mt-4">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <input className="form-input" placeholder="Full name (as on Document)" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="form-input" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <div className="grid grid-cols-2 gap-2">
              <input className="form-input" type="date" placeholder="Date of birth" value={formDob} onChange={(e) => setFormDob(e.target.value)} required />
              <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)} required>
                <option value="" disabled>Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="form-label">Preferred Issuing Point (for physical collection)</label>
              <select className="form-select" value={issuingPoint} onChange={(e) => setIssuingPoint(e.target.value)} required>
                <option value="" disabled>Select Issuing Point</option>
                {ISSUING_POINTS.map(point => (
                  <option key={point} value={point}>{point}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="form-label">Age Proof Document</label>
              <select className="form-select" value={ageProofType} onChange={(e) => setAgeProofType(e.target.value)}>
                <option value="aadhaar">Aadhaar Card</option>
                <option value="voter_id">Voter ID</option>
                <option value="driving_license">Driving License</option>
                <option value="marksheet">10th/12th Marksheet</option>
              </select>
            </div>

            <input
              className="form-input font-mono"
              placeholder={`${ageProofType === 'aadhaar' ? 'Aadhaar' : 'Document'} last 4 digits`}
              maxLength={4}
              value={aadhaarLast4}
              onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />
            
            <div className="space-y-1">
              <label className="form-label">Upload Age Proof (image/PDF)</label>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files[0])} className="text-xs w-full" />
              {aadhaarFile && <p className="text-xs text-emerald-600">✓ {aadhaarFile.name}</p>}
            </div>

            {category === 'senior_citizen' && (
              <div className="mt-2">
                <label className="form-label">Ration Card Number (Address Proof)</label>
                <input
                  type="text"
                  placeholder="e.g. 331XXXXXXXXX"
                  value={rationCardNumber}
                  onChange={(e) => setRationCardNumber(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            )}

            {(category === 'school_student' || category === 'college_student') && (
              <div className="space-y-3 pt-3 border-t">
                <p className="font-bold text-xs text-tn-primary">Institution Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="form-input col-span-2" placeholder="School/Institution Name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
                  <input className="form-input" placeholder="School Code" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} required />
                  <input className="form-input" placeholder="Application Number" value={applicationNumber} onChange={(e) => setApplicationNumber(e.target.value)} required />
                  <input className="form-input" placeholder="Class (e.g. X)" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required />
                  <input className="form-input" placeholder="Section (e.g. A)" value={studentSection} onChange={(e) => setStudentSection(e.target.value)} required />
                </div>
                
                <p className="font-bold text-xs text-tn-primary mt-2">Residential Address</p>
                <input className="form-input" placeholder="Door Number & Street Name" value={doorStreet} onChange={(e) => setDoorStreet(e.target.value)} required />
                <div className="grid grid-cols-3 gap-2">
                  <input className="form-input" placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} required />
                  <input className="form-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                  <input className="form-input" placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
                </div>

                <p className="font-bold text-xs text-tn-primary mt-2">Commute Details</p>
                <div className="grid grid-cols-3 gap-2">
                  <input className="form-input" placeholder="From (Residence Bus Stop)" value={journeyFrom} onChange={(e) => setJourneyFrom(e.target.value)} required />
                  <input className="form-input" placeholder="To (School Bus Stop)" value={journeyTo} onChange={(e) => setJourneyTo(e.target.value)} required />
                  <input className="form-input" type="number" placeholder="Bus Fare (₹)" value={busFare} onChange={(e) => setBusFare(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1"><ChevronLeft className="h-4 w-4 inline" /> Back</button>
              <button type="button" onClick={runOcrPreview} disabled={ocrLoading || !aadhaarFile} className="btn-primary flex-1">
                {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Run OCR Validation'}
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
            <button type="button" onClick={() => setStep((category === 'school_student' || category === 'college_student' || category === 'press_reporter' || category === 'differently_abled' || category === 'visually_impaired' || category === 'freedom_fighter' || (category === 'senior_citizen' && applicationMode === 'upload')) ? 3 : 4)} className="btn-primary w-full">
              {(category === 'school_student' || category === 'college_student' || category === 'press_reporter' || category === 'differently_abled' || category === 'visually_impaired' || category === 'freedom_fighter' || (category === 'senior_citizen' && applicationMode === 'upload')) ? 'Upload Additional Documents' : 'Review Application'}
            </button>
          </div>
        )}

        {step === 3 && (category === 'school_student' || category === 'college_student' || category === 'press_reporter' || category === 'differently_abled' || category === 'visually_impaired' || category === 'freedom_fighter' || (category === 'senior_citizen' && applicationMode === 'upload')) && (
          <div className="space-y-3">
            <label className="form-label">{category === 'press_reporter' ? 'Press Accreditation ID' : category === 'freedom_fighter' ? 'Pension/Financial Certificate' : (category === 'differently_abled' || category === 'visually_impaired') ? 'Disability Certificate (>40%)' : (category === 'senior_citizen' && applicationMode === 'upload') ? 'Scanned Filled Application Form' : 'Institution ID Card (School/College)'}</label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setCollegeIdFile(e.target.files[0])} className="text-xs w-full" />
            
            {(category !== 'press_reporter' && category !== 'differently_abled' && category !== 'visually_impaired' && category !== 'freedom_fighter' && category !== 'senior_citizen') && (
              <>
                <label className="form-label">Bonafide Certificate</label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setBonafideFile(e.target.files[0])} className="text-xs w-full" />
              </>
            )}
            
            <button type="button" onClick={() => setStep(4)} disabled={!collegeIdFile || (category !== 'press_reporter' && category !== 'differently_abled' && category !== 'visually_impaired' && category !== 'freedom_fighter' && category !== 'senior_citizen' && !bonafideFile)} className="btn-primary w-full">
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
