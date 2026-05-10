import React from "react";

export default function VoiceOrb({ state, size = 100, accentColor = "#863bff" }) {
  // state: idle | listening | thinking | speaking

  return (
    <div 
      className={`voice-v2-orb voice-v2-orb--${state}`}
      style={{ 
        width: size, 
        height: size,
        '--orb-accent': accentColor 
      }}
    >
      {/* Outer Glow Layers */}
      <div className="v2-orb-glow-outer" style={{ background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)` }} />
      <div className="v2-orb-glow-inner" style={{ background: `radial-gradient(circle, ${accentColor}66 0%, transparent 70%)` }} />

      <div className="v2-orb-sphere">
        {/* Core Light */}
        <div className="v2-orb-core" style={{ boxShadow: `0 0 30px ${accentColor}, 0 0 60px ${accentColor}` }} />

        {/* Rotating Particle Layers */}
        {[...Array(3)].map((_, layer) => (
          <div 
            key={layer} 
            className="v2-orb-particles" 
            style={{ 
              '--d': `${10 + layer * 5}s`,
              transform: `rotate(${layer * 45}deg)`
            }}
          >
            {[...Array(15)].map((_, i) => (
              <div 
                key={i} 
                className="v2-particle" 
                style={{ 
                  '--i': i,
                  boxShadow: `0 0 4px ${accentColor}`
                }} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
