export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { science, maths, attendance, homework, attention, previous } = body;

    const s = Math.max(0, Math.min(100, Number(science) || 0));
    const m = Math.max(0, Math.min(100, Number(maths) || 0));
    const a = Math.max(0, Math.min(100, Number(attendance) || 0));
    const h = Math.max(0, Math.min(100, Number(homework) || 0));
    const c = Math.max(0, Math.min(100, Number(attention) || 0));
    const p = Math.max(0, Math.min(100, Number(previous) || 0));

    const zS = (s - ML_SCALER.science.mean) / ML_SCALER.science.scale;
    const zM = (m - ML_SCALER.maths.mean) / ML_SCALER.maths.scale;
    const zA = (a - ML_SCALER.attendance.mean) / ML_SCALER.attendance.scale;
    const zH = (h - ML_SCALER.homework.mean) / ML_SCALER.homework.scale;
    const zC = (c - ML_SCALER.attention.mean) / ML_SCALER.attention.scale;
    const zP = (p - ML_SCALER.previous.mean) / ML_SCALER.previous.scale;

    const zFeatures = [zS, zM, zA, zH, zC, zP];

    // Linear Regression Performance Index
    let perfIndex = MODEL_PERF.intercept;
    for (let i = 0; i < zFeatures.length; i++) {
      perfIndex += zFeatures[i] * MODEL_PERF.coef[i];
    }
    perfIndex = Math.min(100, Math.max(0, perfIndex));

    // Logistic Regression Pass Probability
    let passZ = MODEL_PASS.intercept;
    for (let i = 0; i < zFeatures.length; i++) {
      passZ += zFeatures[i] * MODEL_PASS.coef[i];
    }
    const passProb = Math.min(99.9, Math.max(0.1, 100 / (1 + Math.exp(-passZ))));

    // Logistic Regression At-Risk Probability
    let riskZ = MODEL_RISK.intercept;
    for (let i = 0; i < zFeatures.length; i++) {
      riskZ += zFeatures[i] * MODEL_RISK.coef[i];
    }
    const riskProb = Math.min(98.5, Math.max(1.5, 100 / (1 + Math.exp(-riskZ))));

    const averageMarks = (s + m) / 2;
    const engagementScore = 0.4 * a + 0.3 * h + 0.3 * c;

    return NextResponse.json({
      averageMarks: Math.round(averageMarks * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
      performanceIndex: Math.round(perfIndex * 100) / 100,
      passProb: Math.round(passProb * 10) / 10,
      riskProb: Math.round(riskProb * 10) / 10,
      confidence: {
        regressionR2: 94.8,
        classifierAccuracy: 91.5
      }
    });
  } catch (error) {
    console.error("EduPred prediction error:", error);
    return NextResponse.json({ error: "Failed to calculate prediction" }, { status: 500 });
  }
}
