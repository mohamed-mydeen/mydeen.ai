import React from "react";

export default function VoiceOrb({ state, size = 110, accentColor = "#863bff" }) {
  // state: idle | listening | thinking | speaking
  // The goal is a dense, spiraling particle sphere matching the reference image.
  
  // We'll use 60 particles for a dense look without killing performance.
  const particleCount = 60;

  return (
    <div 
      className={`voice-v2-orb voice-v2-orb--${state}`}
      style={{ 
        width: size, 
        height: size,
        '--orb-accent': accentColor 
      }}
    >
      {/* Outer Glows */}
      <div className="v2-orb-glow-outer" style={{ background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)` }} />
      
      <div className="v2-orb-sphere">
        {/* Core light source */}
        <div className="v2-orb-core" style={{ background: '#fff', boxShadow: `0 0 20px ${accentColor}, 0 0 40px ${accentColor}` }} />

        {/* Dense Particle Swarm */}
        <div className="v2-orb-particles-container">
          {[...Array(particleCount)].map((_, i) => (
            <div 
              key={i} 
              className="v2-particle-premium" 
              style={{ 
                '--i': i,
                '--total': particleCount,
                backgroundColor: i % 2 === 0 ? '#fff' : accentColor,
                boxShadow: `0 0 4px ${accentColor}`
              }} 
            />
          ))}
        </div>
        
        {/* Secondary Swarm for depth */}
        <div className="v2-orb-particles-container v2-orb-particles--slow">
          {[...Array(30)].map((_, i) => (
            <div 
              key={`s-${i}`} 
              className="v2-particle-premium" 
              style={{ 
                '--i': i,
                '--total': 30,
                backgroundColor: '#fff',
                opacity: 0.3
              }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
