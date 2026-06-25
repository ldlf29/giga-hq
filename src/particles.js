export function initParticles() {
  const container = document.createElement('div');
  container.id = 'particles-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-1';
  container.style.overflow = 'hidden';
  document.getElementById('app').appendChild(container);

  const colors = [
    'rgb(2, 199, 215)', // Cyan
    'rgb(255, 62, 165)', // Pink
    'rgb(255, 208, 0)', // Yellow
    'rgb(57, 255, 20)' // Green
  ];

  const particlesCount = 25;
  const particles = [];

  for (let i = 0; i < particlesCount; i++) {
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.display = 'block';
    span.style.imageRendering = 'pixelated';
    
    // Initial random state
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const size = 4 + Math.random() * 4; // 4px to 8px
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    span.style.left = `${left}%`;
    span.style.top = `${top}%`;
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.backgroundColor = color;
    span.style.boxShadow = `${color} 0px 0px 10px, ${color} 0px 0px 18px`;
    
    container.appendChild(span);
    
    particles.push({
      el: span,
      timeOffset: Math.random() * 10000,
      speedX: 0.0005 + Math.random() * 0.001,
      speedY: 0.0005 + Math.random() * 0.001,
      speedScale: 0.001 + Math.random() * 0.002,
      speedOpacity: 0.0008 + Math.random() * 0.0015,
      rangeX: 15 + Math.random() * 25, // Pixels to move horizontally
      rangeY: 15 + Math.random() * 25, // Pixels to move vertically
      baseOpacity: 0.15 + Math.random() * 0.15, // Base opacity around 0.15 - 0.3
      opacityRange: 0.1
    });
  }

  function animate(time) {
    particles.forEach(p => {
      const tx = Math.sin(time * p.speedX + p.timeOffset) * p.rangeX;
      const ty = Math.cos(time * p.speedY + p.timeOffset) * p.rangeY;
      const scale = 0.8 + Math.sin(time * p.speedScale + p.timeOffset) * 0.3; // 0.5 to 1.1
      const opacity = p.baseOpacity + Math.sin(time * p.speedOpacity + p.timeOffset) * p.opacityRange;
      
      p.el.style.transform = `translateX(${tx.toFixed(3)}px) translateY(${ty.toFixed(3)}px) scale(${scale.toFixed(3)})`;
      p.el.style.opacity = Math.max(0.05, opacity).toFixed(3); // Keep it slightly visible
    });
    
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
