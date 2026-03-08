// Pre-generated particle positions (avoid Math.random() in render)
export const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 5 + (i % 3) * 15) % 100}%`,
  top: `${(i * 7 + (i % 5) * 8) % 100}%`,
  animationDelay: `${(i * 0.15) % 3}s`,
  animationDuration: `${2 + (i % 4) * 0.5}s`,
}));

// Pre-generated CTA background particles
export const CTA_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 6.67) % 100}%`,
  top: `${(i * 7.5 + (i % 3) * 10) % 100}%`,
  animationDelay: `${(i * 0.13) % 2}s`,
  animationDuration: `${1 + (i % 3) * 0.5}s`,
}));
