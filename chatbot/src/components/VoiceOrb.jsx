import React from "react";

/**
 * VoiceOrb – animated SVG orb that reacts to idle / listening / thinking / speaking states.
 */
export default function VoiceOrb({ state = "idle", size = 200 }) {
  const stateClass = `voice-orb voice-orb--${state}`;

  return (
    <div className={stateClass} style={{ width: size, height: size }}>
      {/* Core glow layers */}
      <div className="orb-core" />
      <div className="orb-ring orb-ring--1" />
      <div className="orb-ring orb-ring--2" />
      <div className="orb-ring orb-ring--3" />

      {/* Particle field – only visible while speaking/listening */}
      <div className="orb-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="orb-particle" style={{ "--i": i }} />
        ))}
      </div>

      {/* Wave bars – listening mode */}
      {state === "listening" && (
        <div className="orb-wave-bars">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="orb-wave-bar" style={{ "--i": i }} />
          ))}
        </div>
      )}

      {/* Thinking dots */}
      {state === "thinking" && (
        <div className="orb-thinking">
          <span /><span /><span />
        </div>
      )}
    </div>
  );
}
