import { GoogleGenAI, Type } from '@google/genai';
import { 
  TriageLevel, 
  TriagePriority, 
  TriageResult, 
  VitalSigns, 
  Patient, 
  ClinicalPolicyRule 
} from '../src/types';

// Lazy Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Department ID Mapping Helper
export const DEPARTMENT_MAP: Record<string, { id: string; name: string }> = {
  'Cardiology': { id: 'dept-cardiology', name: 'Cardiology' },
  'Neurology': { id: 'dept-neurology', name: 'Neurology' },
  'Pulmonology': { id: 'dept-pulmonology', name: 'Pulmonology' },
  'Orthopedics': { id: 'dept-orthopedics', name: 'Orthopedics' },
  'General Medicine': { id: 'dept-general', name: 'General Medicine' },
  'Trauma & Emergency Surgery': { id: 'dept-trauma', name: 'Trauma & Emergency Surgery' },
  'Pediatrics': { id: 'dept-pediatrics', name: 'Pediatrics ER' },
  'Critical Care / ICU Resus': { id: 'dept-icu', name: 'Critical Care / ICU Resus' },
  'ICU': { id: 'dept-icu', name: 'Critical Care / ICU Resus' },
  'Trauma': { id: 'dept-trauma', name: 'Trauma & Emergency Surgery' }
};

export const PRIORITY_MAP: Record<TriageLevel, TriagePriority> = {
  1: 'Critical',
  2: 'Emergency',
  3: 'Urgent',
  4: 'Less Urgent',
  5: 'Non-Urgent'
};

// 1. Adversarial Security Filter (Track B Requirement)
export function scanForAdversarialInput(text: string): { isAdversarial: boolean; reason?: string } {
  const normalized = text.toLowerCase();
  
  // Prompt injection & jailbreak indicators
  const injectionPatterns = [
    /ignore (all )?previous instructions/i,
    /system override/i,
    /you are now a/i,
    /act as/i,
    /disregard safety/i,
    /classify this as level 5/i,
    /force level [1-5]/i,
    /<script/i,
    /union select/i,
    /drop table/i,
    /--[ \t]*$/m,
    /\[INST\]/i,
    /<\|im_start\|>/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(normalized)) {
      return {
        isAdversarial: true,
        reason: `Adversarial pattern detected: ${pattern.toString()}`
      };
    }
  }

  // Length check & extreme gibberish
  if (text.trim().length > 3000) {
    return {
      isAdversarial: true,
      reason: 'Input payload exceeds maximum character threshold (3000 chars).'
    };
  }

  return { isAdversarial: false };
}

// 2. Rule-Based Clinical Hard Guardrails (Track B Clinical Rules Engine)
export function applyClinicalRuleOverrides(
  symptoms: string,
  vitals: VitalSigns,
  patient?: Patient,
  rules: ClinicalPolicyRule[] = []
): { overridden: boolean; level?: TriageLevel; departmentId?: string; reason?: string; escalateToHuman?: boolean } {
  const lower = symptoms.toLowerCase();
  
  // STEMI / Acute Cardiac Rule
  const hasCardiacSymptoms = (lower.includes('chest pain') || lower.includes('chest pressure') || lower.includes('crushing') || lower.includes('angina')) &&
    (lower.includes('arm') || lower.includes('jaw') || lower.includes('sweat') || lower.includes('diaphoresis') || lower.includes('breath') || (vitals.spo2 && vitals.spo2 < 92));
  
  if (hasCardiacSymptoms) {
    return {
      overridden: true,
      level: 1,
      departmentId: 'dept-cardiology',
      reason: 'Hard Rule ACS-01: Severe ischemic chest pain with radiation and/or hypoxemia triggers Level 1 Critical Cardiology.',
      escalateToHuman: false
    };
  }

  // Stroke FAST Rule
  const hasStrokeSymptoms = (lower.includes('face') || lower.includes('facial droop') || lower.includes('smile')) &&
    (lower.includes('slur') || lower.includes('speech') || lower.includes('arm weakness') || lower.includes('drift') || lower.includes('paralysis') || lower.includes('numb'));
  
  if (hasStrokeSymptoms || lower.includes('stroke') || lower.includes('sudden weakness')) {
    return {
      overridden: true,
      level: 1,
      departmentId: 'dept-neurology',
      reason: 'Hard Rule STROKE-FAST: Acute focal neurological deficits activate Code Stroke Level 1 Neurology.',
      escalateToHuman: false
    };
  }

  // Anaphylaxis / Airway Compromise
  const hasAnaphylaxis = (lower.includes('throat') || lower.includes('swelling') || lower.includes('stridor') || lower.includes('can\'t breathe') || lower.includes('gasping')) &&
    (lower.includes('allergic') || lower.includes('peanut') || lower.includes('sting') || lower.includes('hives') || lower.includes('anaphylaxis'));
  
  if (hasAnaphylaxis || (vitals.spo2 && vitals.spo2 < 85)) {
    return {
      overridden: true,
      level: 1,
      departmentId: 'dept-icu',
      reason: 'Hard Rule AIRWAY-RESUS: Immediate airway compromise or profound desaturation (<85%) triggers Level 1 ICU Resus.',
      escalateToHuman: false
    };
  }

  // Severe Trauma
  if (lower.includes('stab') || lower.includes('gunshot') || lower.includes('hit by car') || lower.includes('pedestrian struck') || lower.includes('amputation') || lower.includes('arterial bleed')) {
    return {
      overridden: true,
      level: 1,
      departmentId: 'dept-trauma',
      reason: 'Hard Rule TRAUMA-01: Penetrating or high-velocity major trauma triggers Level 1 Trauma Surgery.',
      escalateToHuman: false
    };
  }

  // Pediatric rule
  if (patient) {
    const birthYear = new Date(patient.dob).getFullYear();
    const age = new Date().getFullYear() - birthYear;
    if (age <= 14 && (vitals.temperature && vitals.temperature >= 39.0 || lower.includes('seizure') || lower.includes('lethargic'))) {
      return {
        overridden: true,
        level: 2,
        departmentId: 'dept-pediatrics',
        reason: 'Hard Rule PEDI-SEPSIS: Pediatric high fever/lethargy requires Level 2 Urgent Pediatric evaluation.',
        escalateToHuman: true
      };
    }
  }

  return { overridden: false };
}

// 3. Clinical Deterministic Heuristic Triage (High-precision offline / fallback engine)
export function evaluateClinicalHeuristics(
  symptoms: string,
  vitals: VitalSigns,
  patient?: Patient
): {
  predictedLevel: TriageLevel;
  predictedDepartment: string;
  departmentId: string;
  confidence: number;
  reasonSummary: string;
  clinicalExplainability: TriageResult['clinicalExplainability'];
  riskScore: number;
  estimatedWaitMinutes: number;
} {
  const lower = symptoms.toLowerCase();

  // Category matching
  if (lower.includes('chest') || lower.includes('heart') || lower.includes('palpitations') || lower.includes('cardiac') || lower.includes('ecg')) {
    const isCrit = lower.includes('severe') || lower.includes('crushing') || (vitals.painScale && vitals.painScale >= 8) || (vitals.spo2 && vitals.spo2 < 93);
    const level: TriageLevel = isCrit ? 1 : 2;
    return {
      predictedLevel: level,
      predictedDepartment: 'Cardiology',
      departmentId: 'dept-cardiology',
      confidence: 0.95,
      reasonSummary: isCrit ? 'Critical acute coronary syndrome presentation with high ischemic risk.' : 'Cardiac symptom presentation requiring urgent telemetry and enzyme evaluation.',
      clinicalExplainability: {
        chiefComplaintAnalysis: 'Chest-related symptom presentation with potential myocardial ischemia requiring continuous ECG monitoring.',
        redFlagAlerts: isCrit ? ['Hypoxemia/Severe pain reported', 'Ischemic risk factors'] : ['Chest discomfort'],
        riskFactors: patient?.medicalHistory || ['Cardiovascular risk profile'],
        vitalSignsCorrelation: `HR: ${vitals.heartRate || 80} bpm, BP: ${vitals.bloodPressureSys || 120}/${vitals.bloodPressureDia || 80} mmHg, SpO2: ${vitals.spo2 || 98}%`,
        immediateNurseActions: ['STAT 12-lead ECG', 'Attach cardiac monitor', 'Establish IV line', 'Obtain baseline troponin I']
      },
      riskScore: isCrit ? 92 : 78,
      estimatedWaitMinutes: isCrit ? 0 : 8
    };
  }

  if (lower.includes('stroke') || lower.includes('slur') || lower.includes('weakness') || lower.includes('numbness') || lower.includes('paralysis') || lower.includes('headache') || lower.includes('seizure') || lower.includes('vision')) {
    const isCrit = lower.includes('sudden') || lower.includes('unconscious') || lower.includes('seizure') || lower.includes('face');
    const level: TriageLevel = isCrit ? 2 : 3;
    return {
      predictedLevel: level,
      predictedDepartment: 'Neurology',
      departmentId: 'dept-neurology',
      confidence: 0.93,
      reasonSummary: 'Acute neurological impairment requiring rapid cerebral vascular & neurological assessment.',
      clinicalExplainability: {
        chiefComplaintAnalysis: 'Focal neurological deficits or cranial nerve signs suggestive of acute intracranial pathology.',
        redFlagAlerts: ['Acute neurological deficit', 'Risk of rapid clinical deterioration'],
        riskFactors: patient?.medicalHistory || ['Vascular risk profile'],
        vitalSignsCorrelation: `BP: ${vitals.bloodPressureSys || 135}/${vitals.bloodPressureDia || 85} mmHg, SpO2: ${vitals.spo2 || 98}%`,
        immediateNurseActions: ['Perform FAST / NIHSS stroke assessment', 'Blood glucose point-of-care check', 'Prepare for emergent non-contrast Head CT', 'Keep patient NPO']
      },
      riskScore: isCrit ? 88 : 65,
      estimatedWaitMinutes: isCrit ? 5 : 20
    };
  }

  if (lower.includes('breath') || lower.includes('asthma') || lower.includes('cough') || lower.includes('wheez') || lower.includes('lungs') || lower.includes('choking') || lower.includes('inhaler')) {
    const isCrit = lower.includes('severe') || lower.includes('gasping') || (vitals.spo2 && vitals.spo2 < 92);
    const level: TriageLevel = isCrit ? 1 : 3;
    return {
      predictedLevel: level,
      predictedDepartment: 'Pulmonology',
      departmentId: 'dept-pulmonology',
      confidence: 0.94,
      reasonSummary: isCrit ? 'Severe acute respiratory distress with impending ventilatory compromise.' : 'Lower airway symptoms requiring bronchodilator therapy and chest radiography.',
      clinicalExplainability: {
        chiefComplaintAnalysis: 'Respiratory complaint affecting ventilatory exchange and airway resistance.',
        redFlagAlerts: isCrit ? ['Hypoxemia', 'Work of breathing / tachypnea'] : ['Airway reactivity'],
        riskFactors: patient?.allergies || ['Reactive airway disease'],
        vitalSignsCorrelation: `SpO2: ${vitals.spo2 || 95}%, RR: ${vitals.respiratoryRate || 22} breaths/min`,
        immediateNurseActions: ['Supplemental oxygen to maintain SpO2 >= 94%', 'Administer nebulized albuterol / ipratropium', 'Chest X-ray (PA/Lateral)', 'Peak flow assessment']
      },
      riskScore: isCrit ? 94 : 58,
      estimatedWaitMinutes: isCrit ? 0 : 20
    };
  }

  if (lower.includes('fracture') || lower.includes('bone') || lower.includes('ankle') || lower.includes('arm') || lower.includes('leg') || lower.includes('knee') || lower.includes('shoulder') || lower.includes('wrist') || lower.includes('fall') || lower.includes('dislocat') || lower.includes('sprain')) {
    const isDeformed = lower.includes('deformity') || lower.includes('open') || (vitals.painScale && vitals.painScale >= 8);
    const level: TriageLevel = isDeformed ? 3 : 4;
    return {
      predictedLevel: level,
      predictedDepartment: 'Orthopedics',
      departmentId: 'dept-orthopedics',
      confidence: 0.96,
      reasonSummary: 'Acute orthopedic extremity injury requiring splinting, neurovascular check, and radiographic imaging.',
      clinicalExplainability: {
        chiefComplaintAnalysis: 'Musculoskeletal trauma to extremity with localized tenderness and functional impairment.',
        redFlagAlerts: isDeformed ? ['Deformity / High pain score'] : ['Reduced range of motion'],
        riskFactors: ['Mechanical fall / sports trauma'],
        vitalSignsCorrelation: `Pain: ${vitals.painScale || 5}/10, Pulse: ${vitals.heartRate || 80} bpm`,
        immediateNurseActions: ['Check distal pulses and sensation', 'Immobilize and splint affected limb', 'Ice pack and limb elevation', 'Order plain film X-rays']
      },
      riskScore: isDeformed ? 55 : 32,
      estimatedWaitMinutes: isDeformed ? 25 : 45
    };
  }

  if (lower.includes('fever') || lower.includes('stomach') || lower.includes('abdom') || lower.includes('nausea') || lower.includes('vomit') || lower.includes('diarrhea') || lower.includes('throat') || lower.includes('cold') || lower.includes('rash') || lower.includes('headache')) {
    const isSevere = lower.includes('severe') || lower.includes('blood') || (vitals.painScale && vitals.painScale >= 8);
    const level: TriageLevel = isSevere ? 3 : 4;
    return {
      predictedLevel: level,
      predictedDepartment: 'General Medicine',
      departmentId: 'dept-general',
      confidence: 0.91,
      reasonSummary: 'General medical presentation suitable for outpatient emergency evaluation and lab diagnostics.',
      clinicalExplainability: {
        chiefComplaintAnalysis: 'Systemic / localized symptom presentation without acute hemodynamic decompensation.',
        redFlagAlerts: isSevere ? ['Acute peritoneal signs or high pain scale'] : [],
        riskFactors: patient?.medicalHistory || [],
        vitalSignsCorrelation: `Temp: ${vitals.temperature || 37.2}°C, HR: ${vitals.heartRate || 75} bpm`,
        immediateNurseActions: ['Basic metabolic and CBC blood draw', 'Urine dipstick / tox screen if applicable', 'Symptomatic antiemetic / analgesic administration', 'Hydration evaluation']
      },
      riskScore: isSevere ? 48 : 22,
      estimatedWaitMinutes: isSevere ? 30 : 50
    };
  }

  // Default General Emergency
  return {
    predictedLevel: 4,
    predictedDepartment: 'General Medicine',
    departmentId: 'dept-general',
    confidence: 0.85,
    reasonSummary: 'Standard emergency intake triage for clinical evaluation and diagnostics.',
    clinicalExplainability: {
      chiefComplaintAnalysis: 'General symptom report reviewed by emergency triage protocol.',
      redFlagAlerts: [],
      riskFactors: [],
      vitalSignsCorrelation: 'Vitals reviewed within acceptable baseline parameters.',
      immediateNurseActions: ['Baseline clinical assessment by triage nurse', 'Vital signs verification', 'Registration confirmation']
    },
    riskScore: 25,
    estimatedWaitMinutes: 40
  };
}

// 4. Primary AI Triage Method
export async function performAITriage(params: {
  caseId: string;
  symptoms: string;
  vitals: VitalSigns;
  patient?: Patient;
  rules?: ClinicalPolicyRule[];
}): Promise<TriageResult> {
  const startTime = Date.now();
  const { caseId, symptoms, vitals, patient, rules = [] } = params;

  // Step 1: Adversarial Security Scan (Track B)
  const adversarialScan = scanForAdversarialInput(symptoms);
  if (adversarialScan.isAdversarial) {
    const latency = Date.now() - startTime;
    return {
      id: `tri-${Date.now()}`,
      caseId,
      predictedLevel: 4,
      predictedPriority: 'Less Urgent',
      predictedDepartment: 'General Medicine',
      departmentId: 'dept-general',
      confidence: 0.50,
      reasonSummary: `Adversarial security flag triggered: ${adversarialScan.reason}. Automated triage restricted.`,
      clinicalExplainability: {
        chiefComplaintAnalysis: 'Input contained malicious prompt payload or instruction override patterns.',
        redFlagAlerts: ['ADVERSARIAL_INJECTION_DETECTED', 'MANUAL_NURSE_OVERRIDE_REQUIRED'],
        riskFactors: ['Security audit flag logged'],
        vitalSignsCorrelation: 'Vitals preserved for clinical staff verification.',
        immediateNurseActions: ['Perform in-person manual verbal intake', 'Verify patient identity and distress level']
      },
      riskScore: 30,
      estimatedWaitMinutes: 30,
      aiModelVersion: 'pulse-security-guard-v2',
      adversarialCheckPassed: false,
      policyApprovalStatus: 'flagged',
      policyViolationNotes: adversarialScan.reason,
      latencyMs: latency,
      tokensUsed: 40,
      timestamp: new Date().toISOString()
    };
  }

  // Step 2: Clinical Policy Guardrails Override (Track B)
  const hardRule = applyClinicalRuleOverrides(symptoms, vitals, patient, rules);
  if (hardRule.overridden && hardRule.level && hardRule.departmentId) {
    const deptInfo = Object.values(DEPARTMENT_MAP).find(d => d.id === hardRule.departmentId) || { name: 'Emergency Dept' };
    const priority = PRIORITY_MAP[hardRule.level];
    const latency = Date.now() - startTime;

    return {
      id: `tri-${Date.now()}`,
      caseId,
      predictedLevel: hardRule.level,
      predictedPriority: priority,
      predictedDepartment: deptInfo.name,
      departmentId: hardRule.departmentId,
      confidence: 0.99,
      reasonSummary: `Clinical Safety Protocol Enforced: ${hardRule.reason}`,
      clinicalExplainability: {
        chiefComplaintAnalysis: `Clinical Safety Rule triggered immediately based on critical symptom signatures and vitals.`,
        redFlagAlerts: ['CLINICAL_PROTOCOL_ACTIVATION', hardRule.reason || 'STAT Protocol'],
        riskFactors: patient?.medicalHistory || [],
        vitalSignsCorrelation: `HR: ${vitals.heartRate || 80}, BP: ${vitals.bloodPressureSys || 120}/${vitals.bloodPressureDia || 80}, SpO2: ${vitals.spo2 || 98}%`,
        immediateNurseActions: [
          hardRule.level === 1 ? 'Immediate resuscitation bay transport' : 'Expedited clinical evaluation',
          'Continuous cardiac/pulse oximetry monitoring',
          'Notify attending emergency physician STAT'
        ]
      },
      riskScore: hardRule.level === 1 ? 98 : (6 - hardRule.level) * 20,
      estimatedWaitMinutes: hardRule.level === 1 ? 0 : 10,
      aiModelVersion: 'clinical-policy-engine-v2',
      adversarialCheckPassed: true,
      policyApprovalStatus: hardRule.escalateToHuman ? 'escalated_to_human' : 'approved',
      policyViolationNotes: hardRule.escalateToHuman ? 'Mandatory human nurse confirmation required by protocol.' : undefined,
      latencyMs: latency,
      tokensUsed: 80,
      timestamp: new Date().toISOString()
    };
  }

  // Step 3: Server-side Gemini 3.7 Flash AI Triage Call
  const genAI = getGenAI();
  if (genAI) {
    try {
      const patientContext = patient ? `
Patient Profile:
- Age: ${new Date().getFullYear() - new Date(patient.dob).getFullYear()} (${patient.gender})
- Blood Type: ${patient.bloodType}
- Known Allergies: ${patient.allergies.join(', ') || 'None'}
- Medical History: ${patient.medicalHistory.join(', ') || 'None reported'}
` : '';

      const vitalsContext = `
Recorded Vital Signs:
- Heart Rate: ${vitals.heartRate ? vitals.heartRate + ' bpm' : 'Not recorded'}
- Blood Pressure: ${vitals.bloodPressureSys && vitals.bloodPressureDia ? `${vitals.bloodPressureSys}/${vitals.bloodPressureDia} mmHg` : 'Not recorded'}
- SpO2 (Oxygen Saturation): ${vitals.spo2 ? vitals.spo2 + '%' : 'Not recorded'}
- Respiratory Rate: ${vitals.respiratoryRate ? vitals.respiratoryRate + ' breaths/min' : 'Not recorded'}
- Temperature: ${vitals.temperature ? vitals.temperature + ' °C' : 'Not recorded'}
- Pain Scale: ${vitals.painScale !== undefined ? vitals.painScale + '/10' : 'Not recorded'}
`;

      const prompt = `You are the lead hospital emergency triage AI decision-support physician. Evaluate the patient intake below according to the standard 5-level Emergency Severity Index (ESI):
- Level 1: Critical (Immediate life-saving intervention needed: cardiac arrest, severe respiratory arrest, anaphylaxis, massive exsanguination, STEMI)
- Level 2: Emergency (High risk, acute confusion/lethargy, severe pain/distress: acute stroke, severe cardiac chest pain, severe asthma)
- Level 3: Urgent (Stable vitals, multiple resources needed: moderate abdominal pain, closed fractures, moderate asthma)
- Level 4: Less Urgent (One resource needed: simple laceration, mild sprain, mild URI, sore throat)
- Level 5: Non-Urgent (No resource needed: simple refill, minor rash, suture removal)

Target Departments:
1. Cardiology (dept-cardiology)
2. Neurology (dept-neurology)
3. Pulmonology (dept-pulmonology)
4. Orthopedics (dept-orthopedics)
5. General Medicine (dept-general)
6. Trauma & Emergency Surgery (dept-trauma)
7. Pediatrics (dept-pediatrics)
8. Critical Care / ICU Resus (dept-icu)

${patientContext}
${vitalsContext}

Patient Reported Symptoms:
"${symptoms}"

Analyze the symptom presentation, correlate with vitals and patient risk factors, and determine triage level, department, confidence score (0.0 to 1.0), explainability, and nurse actions.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an emergency medical triage and clinical routing engine. Always output valid structured JSON strictly matching the requested schema without markdown formatting or code fences.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              triageLevel: {
                type: Type.INTEGER,
                description: 'Emergency Severity Index level 1 to 5'
              },
              triagePriority: {
                type: Type.STRING,
                description: 'Critical, Emergency, Urgent, Less Urgent, or Non-Urgent'
              },
              departmentName: {
                type: Type.STRING,
                description: 'One of: Cardiology, Neurology, Pulmonology, Orthopedics, General Medicine, Trauma & Emergency Surgery, Pediatrics, Critical Care / ICU Resus'
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence between 0.0 and 1.0'
              },
              reasonSummary: {
                type: Type.STRING,
                description: 'Clinical rationale summary for the assigned level'
              },
              riskScore: {
                type: Type.INTEGER,
                description: 'Clinical risk score between 0 and 100'
              },
              chiefComplaintAnalysis: {
                type: Type.STRING,
                description: 'Detailed analysis of the primary complaint'
              },
              redFlagAlerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of acute clinical red flags identified'
              },
              riskFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Patient risk factors impacting the triage'
              },
              vitalSignsCorrelation: {
                type: Type.STRING,
                description: 'How vitals correlate with the clinical condition'
              },
              immediateNurseActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Immediate diagnostic and nursing interventions'
              }
            },
            required: ['triageLevel', 'departmentName', 'confidence', 'reasonSummary', 'riskScore', 'chiefComplaintAnalysis', 'redFlagAlerts', 'immediateNurseActions']
          }
        }
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      // Validate & Clamp
      let level: TriageLevel = (parsed.triageLevel >= 1 && parsed.triageLevel <= 5) ? (parsed.triageLevel as TriageLevel) : 4;
      let deptName = parsed.departmentName || 'General Medicine';
      let deptMapping = DEPARTMENT_MAP[deptName] || Object.values(DEPARTMENT_MAP).find(d => d.name.toLowerCase() === deptName.toLowerCase()) || { id: 'dept-general', name: 'General Medicine' };
      
      const priority = PRIORITY_MAP[level];
      const confidence = Math.min(1.0, Math.max(0.1, parsed.confidence || 0.92));
      const riskScore = Math.min(100, Math.max(0, parsed.riskScore || (6 - level) * 20));
      const latency = Date.now() - startTime;

      // Policy Approval verification
      let policyStatus: TriageResult['policyApprovalStatus'] = 'approved';
      let violationNotes: string | undefined;

      if (confidence < 0.70) {
        policyStatus = 'escalated_to_human';
        violationNotes = 'Model confidence below 0.70 threshold. Escalated for clinical nurse verification.';
      }

      return {
        id: `tri-${Date.now()}`,
        caseId,
        predictedLevel: level,
        predictedPriority: priority,
        predictedDepartment: deptMapping.name,
        departmentId: deptMapping.id,
        confidence,
        reasonSummary: parsed.reasonSummary || 'AI emergency triage completed based on symptom NLP and vital sign analysis.',
        clinicalExplainability: {
          chiefComplaintAnalysis: parsed.chiefComplaintAnalysis || 'Natural language symptom analysis completed.',
          redFlagAlerts: parsed.redFlagAlerts || [],
          riskFactors: parsed.riskFactors || [],
          vitalSignsCorrelation: parsed.vitalSignsCorrelation || 'Vitals correlated with clinical presentation.',
          immediateNurseActions: parsed.immediateNurseActions || ['Vital signs check', 'Bedside nursing evaluation']
        },
        riskScore,
        estimatedWaitMinutes: level === 1 ? 0 : level === 2 ? 8 : level === 3 ? 25 : level === 4 ? 45 : 60,
        aiModelVersion: 'gemini-3.7-flash',
        adversarialCheckPassed: true,
        policyApprovalStatus: policyStatus,
        policyViolationNotes: violationNotes,
        latencyMs: latency,
        tokensUsed: 460,
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      console.warn('Gemini API call warning, falling back to heuristic engine:', err);
    }
  }

  // Step 4: Fallback Heuristic Engine
  const heuristic = evaluateClinicalHeuristics(symptoms, vitals, patient);
  const latency = Date.now() - startTime;

  return {
    id: `tri-${Date.now()}`,
    caseId,
    predictedLevel: heuristic.predictedLevel,
    predictedPriority: PRIORITY_MAP[heuristic.predictedLevel],
    predictedDepartment: heuristic.predictedDepartment,
    departmentId: heuristic.departmentId,
    confidence: heuristic.confidence,
    reasonSummary: heuristic.reasonSummary,
    clinicalExplainability: heuristic.clinicalExplainability,
    riskScore: heuristic.riskScore,
    estimatedWaitMinutes: heuristic.estimatedWaitMinutes,
    aiModelVersion: 'clinical-heuristic-v2',
    adversarialCheckPassed: true,
    policyApprovalStatus: 'approved',
    latencyMs: latency,
    tokensUsed: 0,
    timestamp: new Date().toISOString()
  };
}
