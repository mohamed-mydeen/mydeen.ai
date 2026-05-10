import React from "react";

/**
 * Enhanced VoiceOrb – A more 3D-feeling, glowing particle sphere
 */
export default function VoiceOrb({ state = "idle", size = 200 }) {
  const stateClass = `voice-v2-orb voice-v2-orb--${state}`;

  return (
    <div className={stateClass} style={{ width: size, height: size }}>
      {/* Outer Glows */}
      <div className="v2-orb-glow-outer" />
      <div className="v2-orb-glow-inner" />

      {/* Main Sphere Body */}
      <div className="v2-orb-sphere">
        {/* Particle layers for 3D depth */}
        <div className="v2-orb-particles layer-1">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="v2-particle" style={{ "--i": i, "--d": "10s" }} />
          ))}
        </div>
        <div className="v2-orb-particles layer-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="v2-particle" style={{ "--i": i, "--d": "15s" }} />
          ))}
        </div>
        
        {/* Core light source */}
        <div className="v2-orb-core" />
      </div>

      {/* Reaction elements */}
      {state === "listening" && (
        <div className="v2-orb-listening-waves">
          <div className="v2-wave" />
          <div className="v2-wave" />
          <div className="v2-wave" />
        </div>
      )}

      {state === "thinking" && (
        <div className="v2-orb-thinking-pulses">
          <div className="v2-pulse" />
          <div className="v2-pulse" />
        </div>
      )}
    </div>
  );
}
