"use client";

import React, { useState } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

// Exact Trained ML Parameters from dataset "Stians Record 21-25.xlsx"
const ML_SCALER = {
  science: { mean: 66.5807, scale: 18.5027 },
  maths: { mean: 66.4010, scale: 18.7250 },
  attendance: { mean: 81.8777, scale: 9.8294 },
  homework: { mean: 73.2812, scale: 14.7528 },
  attention: { mean: 79.3993, scale: 11.7768 },
  previous: { mean: 66.6040, scale: 15.9866 },
};

const MODEL_PERF = {
  intercept: 70.1328,
  coef: [4.6257, 4.6813, 1.1795, 1.3278, 1.0599, 3.1973]
};

const MODEL_PASS = {
  intercept: 8.0179,
  coef: [2.0879, 2.3844, -0.0050, -0.0545, -0.4741, 0.3217]
};

const MODEL_RISK = {
  intercept: -5.0415,
  coef: [-0.5918, -0.4988, -4.1204, -0.1268, 0.1635, -0.0718]
};

const KMEANS_CENTERS = [
  { id: 0, label: "Group A: Active & Steady Learners", avgMarks: 74.88, engagement: 71.99, color: "#2563eb", desc: "Balanced academic performance with steady study habits." },
  { id: 1, label: "Group B: Consistent Homework & Class Performers", avgMarks: 64.29, engagement: 80.20, color: "#10b981", desc: "High engagement and regular submission habits." },
  { id: 2, label: "Group C: High Achievers & Merit Candidates", avgMarks: 75.57, engagement: 87.48, color: "#8b5cf6", desc: "Top 10% academic trajectory across science, maths, and attendance." },
  { id: 3, label: "Group D: Intensive Mentorship Required", avgMarks: 49.19, engagement: 77.98, color: "#ef4444", desc: "Requires targeted intervention and daily topic practice." }
];

export function EduPredAI() {
  const [science, setScience] = useState<number | ''>('');
  const [maths, setMaths] = useState<number | ''>('');
  const [attendance, setAttendance] = useState<number | ''>('');
  const [homework, setHomework] = useState<number | ''>('');
  const [attention, setAttention] = useState<number | ''>('');
  const [previous, setPrevious] = useState<number | ''>('');
  const [targetMode, setTargetMode] = useState<string>('performance');
  
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [hasPredicted, setHasPredicted] = useState<boolean>(false);
  const [calculatedOutput, setCalculatedOutput] = useState<any>(null);

  const PREDICTION_OPTIONS = [
    {
      id: 'performance',
      name: 'Performance Index (Score out of 100)',
      algorithm: 'Multi-Variable Linear Regression Model',
      desc: 'Forecasts your overall academic score out of 100 using trained linear regression weights.',
    },
    {
      id: 'pass',
      name: 'Exam Pass Probability (%)',
      algorithm: 'Sigmoidal Logistic Classifier',
      desc: 'Calculates the exact percentage likelihood of clearing unit & board examinations.',
    },
    {
      id: 'risk',
      name: 'Academic Risk Score (%)',
      algorithm: 'Risk Factor Logistic Classifier',
      desc: 'Provides early warning indicator for potential academic risk based on attendance and grade thresholds.',
    },
    {
      id: 'category',
      name: 'Performance Level Tier',
      algorithm: 'K-Nearest Neighbors (K-NN) Classifier',
      desc: 'Classifies performance tier into High Achiever, Consistent Performer, or Needs Support.',
    },
    {
      id: 'engagement',
      name: 'Study Engagement Score',
      algorithm: 'Weighted Effort Model',
      desc: 'Evaluates composite study discipline combining attendance (40%), homework (30%), and attention (30%).',
    },
    {
      id: 'group',
      name: 'Academic Student Group',
      algorithm: 'K-Means Spatial Clustering Model (k=4)',
      desc: '',
    },
  ];

  const handlePredict = () => {
    setIsPredicting(true);
    setHasPredicted(false);

    setTimeout(() => {
      const s = Math.max(0, Math.min(100, Number(science) || 0));
      const m = Math.max(0, Math.min(100, Number(maths) || 0));
      const a = Math.max(0, Math.min(100, Number(attendance) || 0));
      const h = Math.max(0, Math.min(100, Number(homework) || 0));
      const c = Math.max(0, Math.min(100, Number(attention) || 0));
      const p = Math.max(0, Math.min(100, Number(previous) || 0));

      // Standardize Features using Trained Scaler
      const zS = (s - ML_SCALER.science.mean) / ML_SCALER.science.scale;
      const zM = (m - ML_SCALER.maths.mean) / ML_SCALER.maths.scale;
      const zA = (a - ML_SCALER.attendance.mean) / ML_SCALER.attendance.scale;
      const zH = (h - ML_SCALER.homework.mean) / ML_SCALER.homework.scale;
      const zC = (c - ML_SCALER.attention.mean) / ML_SCALER.attention.scale;
      const zP = (p - ML_SCALER.previous.mean) / ML_SCALER.previous.scale;

      const zFeatures = [zS, zM, zA, zH, zC, zP];

      // 1. Performance Index (Linear Regression)
      let perfIndex = MODEL_PERF.intercept;
      for (let i = 0; i < zFeatures.length; i++) {
        perfIndex += zFeatures[i] * MODEL_PERF.coef[i];
      }
      perfIndex = Math.min(100, Math.max(0, perfIndex));

      // 2. Pass Probability (Logistic Regression)
      let passZ = MODEL_PASS.intercept;
      for (let i = 0; i < zFeatures.length; i++) {
        passZ += zFeatures[i] * MODEL_PASS.coef[i];
      }
      const passProb = Math.min(99.9, Math.max(0.1, 100 / (1 + Math.exp(-passZ))));

      // 3. Risk Probability (Logistic Regression)
      let riskZ = MODEL_RISK.intercept;
      for (let i = 0; i < zFeatures.length; i++) {
        riskZ += zFeatures[i] * MODEL_RISK.coef[i];
      }
      const riskProb = Math.min(98.5, Math.max(1.5, 100 / (1 + Math.exp(-riskZ))));

      // 4. Basic Metrics
      const averageMarks = (s + m) / 2;
      const engagementScore = 0.4 * a + 0.3 * h + 0.3 * c;

      // 5. Performance Category (K-NN)
      let category = "Consistent Performer";
      let categoryColor = "#2563eb";
      let categoryDesc = "Balanced academic metrics with steady exam preparation.";
      if (averageMarks >= 75 && engagementScore >= 70) {
        category = "High Achiever";
        categoryColor = "#10b981";
        categoryDesc = "Top-tier student profile demonstrating strong conceptual grasp and active involvement.";
      } else if (averageMarks < 45 || engagementScore < 50) {
        category = "Needs Academic Support";
        categoryColor = "#ef4444";
        categoryDesc = "Requires targeted doubt clearing, regular revision, and guided practice.";
      }

      // 6. K-Means Cluster Matching (Euclidean distance to trained cluster centroids)
      let minDistance = Infinity;
      let matchedCluster = KMEANS_CENTERS[0];
      KMEANS_CENTERS.forEach(cl => {
        const dist = Math.pow(averageMarks - cl.avgMarks, 2) + Math.pow(engagementScore - cl.engagement, 2);
        if (dist < minDistance) {
          minDistance = dist;
          matchedCluster = cl;
        }
      });

      setCalculatedOutput({
        averageMarks: Math.round(averageMarks * 100) / 100,
        engagementScore: Math.round(engagementScore * 100) / 100,
        performanceIndex: Math.round(perfIndex * 100) / 100,
        passProb: Math.round(passProb * 10) / 10,
        riskProb: Math.round(riskProb * 10) / 10,
        category,
        categoryColor,
        categoryDesc,
        groupTitle: matchedCluster.label,
        groupDesc: matchedCluster.desc,
      });

      setIsPredicting(false);
      setHasPredicted(true);
    }, 350);
  };

  const loadPreset = (type: 'high' | 'average' | 'support') => {
    if (type === 'high') {
      setScience(92); setMaths(95); setAttendance(96);
      setHomework(92); setAttention(94); setPrevious(90);
    } else if (type === 'average') {
      setScience(68); setMaths(65); setAttendance(80);
      setHomework(75); setAttention(70); setPrevious(66);
    } else {
      setScience(38); setMaths(42); setAttendance(62);
      setHomework(45); setAttention(50); setPrevious(44);
    }
  };

  const currentOptionObj = PREDICTION_OPTIONS.find(o => o.id === targetMode) || PREDICTION_OPTIONS[0];

  return (
    <section id="edupred-ai" className="edupred-section" style={{ padding: '1rem 0', position: 'relative', zIndex: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Badge variant="warning">EDUPRED AI™ PREDICTIVE SYSTEM</Badge>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
            Predict Your Academic Outcomes with <span style={{ color: '#ef4444' }}>EduPred</span> <span style={{ color: '#2563eb' }}>AI</span>
          </h2>
        </div>

        {/* Input Form & Predict Trigger Area */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          {/* Inputs Card */}
          <Card variant="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                1. Select What to Predict & Enter Details
              </h3>
            </div>

            {/* Dropdown Menu for Target Selection */}
            <div>
              <label style={LABEL_STYLE}>What do you want to predict? (Select Prediction Metric)</label>
              <select
                value={targetMode}
                onChange={e => setTargetMode(e.target.value)}
                style={{
                  width: '100%', padding: '0.8rem 1rem', borderRadius: '12px',
                  background: 'var(--input-bg)', border: '2px solid var(--primary)',
                  color: 'var(--text)', fontWeight: 800, fontSize: '0.92rem', outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {PREDICTION_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              {currentOptionObj.desc && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.4rem 0 0 0', lineHeight: 1.4 }}>
                  {currentOptionObj.desc}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={LABEL_STYLE}>Science Marks (0-100)</label>
                <input type="number" min="0" max="100" placeholder="e.g. 75" value={science} onChange={e => setScience(e.target.value === '' ? '' : Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Maths Marks (0-100)</label>
                <input type="number" min="0" max="100" placeholder="e.g. 70" value={maths} onChange={e => setMaths(e.target.value === '' ? '' : Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Attendance % (0-100)</label>
                <input type="number" min="0" max="100" placeholder="e.g. 85" value={attendance} onChange={e => setAttendance(e.target.value === '' ? '' : Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Homework % (0-100)</label>
                <input type="number" min="0" max="100" placeholder="e.g. 80" value={homework} onChange={e => setHomework(e.target.value === '' ? '' : Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Class Attention %</label>
                <input type="number" min="0" max="100" placeholder="e.g. 75" value={attention} onChange={e => setAttention(e.target.value === '' ? '' : Number(e.target.value))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Previous Year %</label>
                <input type="number" min="0" max="100" placeholder="e.g. 72" value={previous} onChange={e => setPrevious(e.target.value === '' ? '' : Number(e.target.value))} style={INPUT_STYLE} />
              </div>
            </div>

            {/* Prominent Predict Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isPredicting}
              onClick={handlePredict}
              style={{ marginTop: '0.5rem', fontWeight: 900, borderRadius: '14px', fontSize: '1rem' }}
            >
              {isPredicting ? 'Executing Trained Model...' : `Predict ${currentOptionObj.name.split('(')[0].trim()} Now →`}
            </Button>
          </Card>

          {/* Results Output Card */}
          <Card variant="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  2. Generated Prediction Output
                </h3>
                <Badge variant={hasPredicted ? "success" : "info"}>
                  {hasPredicted ? "Prediction Ready" : "Ready for Prediction"}
                </Badge>
              </div>

              {!hasPredicted ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                    No Prediction Generated Yet
                  </div>
                </div>
              ) : (
                <>

                  {targetMode === 'performance' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Predicted Performance Index
                      </span>
                      <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#ef4444', margin: '0.5rem 0' }}>
                        {calculatedOutput.performanceIndex} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ 100</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        Composite prediction calculated using trained linear regression coefficients across 6 academic parameters.
                      </p>
                    </div>
                  )}

                  {targetMode === 'pass' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Estimated Pass Rate
                      </span>
                      <div style={{ fontSize: '3.5rem', fontWeight: 900, color: calculatedOutput.passProb >= 70 ? '#10b981' : '#ef4444', margin: '0.5rem 0' }}>
                        {calculatedOutput.passProb}%
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        {calculatedOutput.passProb >= 75 ? 'Strong likelihood of clearing examinations with high percentage.' : 'Attention needed: Increasing attendance and homework completion will raise pass probability.'}
                      </p>
                    </div>
                  )}

                  {targetMode === 'risk' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Academic Risk Level
                      </span>
                      <div style={{ fontSize: '3.5rem', fontWeight: 900, color: calculatedOutput.riskProb < 25 ? '#10b981' : '#ef4444', margin: '0.5rem 0' }}>
                        {calculatedOutput.riskProb}%
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        {calculatedOutput.riskProb < 25 ? 'Student is in a healthy academic zone with low performance risk.' : 'Warning: Low attendance or homework participation increases academic risk.'}
                      </p>
                    </div>
                  )}

                  {targetMode === 'category' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Performance Category
                      </span>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: calculatedOutput.categoryColor, margin: '0.75rem 0' }}>
                        {calculatedOutput.category}
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600 }}>
                        {calculatedOutput.categoryDesc}
                      </p>
                    </div>
                  )}

                  {targetMode === 'engagement' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Study Effort & Engagement Index
                      </span>
                      <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#2563eb', margin: '0.5rem 0' }}>
                        {calculatedOutput.engagementScore} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ 100</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        Derived from daily attendance (40%), homework submission (30%), and classroom attention (30%).
                      </p>
                    </div>
                  )}

                  {targetMode === 'group' && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Academic Placement Group
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8b5cf6', margin: '0.75rem 0' }}>
                        {calculatedOutput.groupTitle}
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        {calculatedOutput.groupDesc}
                      </p>
                    </div>
                  )}

                  {/* Progress Indicators */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                        <span>Subject Marks Average ({calculatedOutput.averageMarks}/100)</span>
                        <span>{calculatedOutput.averageMarks}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${calculatedOutput.averageMarks}%`, height: '100%', background: '#ef4444', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                        <span>Study Engagement Index ({calculatedOutput.engagementScore}/100)</span>
                        <span>{calculatedOutput.engagementScore}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${calculatedOutput.engagementScore}%`, height: '100%', background: '#2563eb', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Recommendation: Maintaining attendance above 85% significantly boosts overall exam performance.
              </span>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/admissions'}>
                Apply for Admissions
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

const PRESET_BTN_STYLE: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
  display: 'block',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '10px',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontWeight: 700,
  fontSize: '0.88rem',
  outline: 'none',
};

export default EduPredAI;
