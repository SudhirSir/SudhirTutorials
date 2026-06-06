import { useState, useRef } from 'react';

export default function ScholarshipPredictor3D() {
  const [targetExam, setTargetExam] = useState<'JEE' | 'NEET'>('JEE');
  const [studyHours, setStudyHours] = useState<number>(6);
  const [mockScore, setMockScore] = useState<number>(75);
  
  // 3D Card state
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top;  // y position within the element
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotate max 15 degrees
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  // Calculate Scholarship
  let scholarshipPct = 0;
  let schLabel = '';
  let feeDiscount = '';
  let motivational = '';
  
  if (mockScore >= 95 && studyHours >= 10) { scholarshipPct = 100; schLabel = '💎 Full Merit Scholarship'; feeDiscount = '100% Fee Waiver'; motivational = 'Exceptional! You are a rank-topper. We invest in brilliant minds like yours — study FREE at SUDHIR TUTORIALS!'; }
  else if (mockScore >= 90 && studyHours >= 8) { scholarshipPct = 75; schLabel = '🥇 Gold Scholarship'; feeDiscount = '75% Fee Waiver'; motivational = 'Outstanding performance! You qualify for our prestigious Gold Scholarship. Join us and secure your dream rank!'; }
  else if (mockScore >= 80 && studyHours >= 6) { scholarshipPct = 50; schLabel = '🥈 Silver Scholarship'; feeDiscount = '50% Fee Waiver'; motivational = 'Impressive score! With our structured program, you will leap to the top percentile. A 50% scholarship awaits you!'; }
  else if (mockScore >= 70 && studyHours >= 4) { scholarshipPct = 25; schLabel = '🥉 Merit Award'; feeDiscount = '25% Fee Discount'; motivational = 'You show great potential! Our expert mentors will multiply your rank. Claim your 25% merit award today!'; }
  else { scholarshipPct = 10; schLabel = '🌟 Welcome Bonus'; feeDiscount = '10% Enrollment Discount'; motivational = 'Every topper started where you are. Join SUDHIR TUTORIALS and watch your score skyrocket with expert guidance!'; }

  return (
    <div 
      style={{ perspective: '1500px', width: '100%', display: 'flex', justifyContent: 'center' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={cardRef}
        className="glass-card arena-card 3d-card"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered ? 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          transformStyle: 'preserve-3d',
          position: 'relative',
          padding: '2.5rem',
          boxShadow: isHovered ? '0 30px 60px rgba(239, 68, 68, 0.2)' : '0 10px 30px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(135deg, rgba(15,15,22,0.9), rgba(25,25,35,0.95))',
          overflow: 'hidden'
        }}
      >
        {/* Dynamic Glare Effect */}
        {isHovered && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: `radial-gradient(circle at ${50 + rotation.y * 2}% ${50 - rotation.x * 2}%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
            pointerEvents: 'none',
            zIndex: 1
          }} />
        )}

        <div className="card-header-icon" style={{ transform: 'translateZ(40px)', position: 'relative', zIndex: 2 }}>
          <span className="icon" style={{ fontSize: '2.5rem', display: 'inline-block', filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))' }}>💎</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scholarship Predictor 3D</h3>
        </div>
        
        <p className="card-desc" style={{ transform: 'translateZ(30px)', position: 'relative', zIndex: 2, color: '#aaa', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Interact with this card. Find out instantly how much scholarship you qualify for at <strong style={{ color: 'var(--primary)' }}>SUDHIR TUTORIALS</strong>!
        </p>
        
        <div style={{ transform: 'translateZ(50px)', position: 'relative', zIndex: 2 }}>
          <div className="input-group">
            <label className="input-label" style={{ color: '#fff' }}>Select Program</label>
            <div className="selector-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setTargetExam('JEE')}
                className={`selector-btn ${targetExam === 'JEE' ? 'active' : ''}`}
                style={{
                  background: targetExam === 'JEE' ? 'linear-gradient(135deg, var(--primary), #b91c1c)' : 'rgba(255,255,255,0.05)',
                  color: targetExam === 'JEE' ? '#fff' : '#888',
                  border: targetExam === 'JEE' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                🚀 JEE (IIT/NIT)
              </button>
              <button 
                onClick={() => setTargetExam('NEET')}
                className={`selector-btn ${targetExam === 'NEET' ? 'active' : ''}`}
                style={{
                  background: targetExam === 'NEET' ? 'linear-gradient(135deg, var(--secondary), #1d4ed8)' : 'rgba(255,255,255,0.05)',
                  color: targetExam === 'NEET' ? '#fff' : '#888',
                  border: targetExam === 'NEET' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                🩺 NEET (Medical)
              </button>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="input-label" style={{ color: '#fff' }}>Daily Study Dedication</label>
              <span className="scholarship-badge" style={{ background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: 800 }}>{studyHours} hrs/day</span>
            </div>
            <input 
              type="range" min="2" max="14" step="1" 
              value={studyHours} 
              onChange={e => setStudyHours(parseInt(e.target.value))}
              className="slider-input"
              style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', outline: 'none', appearance: 'none' }}
            />
          </div>

          <div className="input-group" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="input-label" style={{ color: '#fff' }}>Last Exam Score (%)</label>
              <span className="scholarship-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: 800 }}>{mockScore}%</span>
            </div>
            <input 
              type="range" min="50" max="100" step="5" 
              value={mockScore} 
              onChange={e => setMockScore(parseInt(e.target.value))}
              className="slider-input"
              style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', outline: 'none', appearance: 'none' }}
            />
          </div>

          <div style={{ 
            marginTop: '2.5rem', 
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(37,99,235,0.15) 100%)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', 
            padding: '1.5rem',
            transform: 'translateZ(60px)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Your Scholarship</span>
              <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>{schLabel}</span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(135deg, #f87171, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 15px rgba(239,68,68,0.3))' }}>{scholarshipPct}% OFF</div>
              <div style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: 700 }}>{feeDiscount}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.5', margin: 0, fontStyle: 'italic' }}>"{motivational}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
