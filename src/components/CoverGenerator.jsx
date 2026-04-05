import React from 'react';

const CoverGenerator = ({ title, author, size = 'md' }) => {
  // Simple hash for consistent colors based on title
  const getHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const colors = [
    ['#8b5e3c', '#c4a484'],
    ['#2d6a4f', '#52b788'],
    ['#003049', '#669bbc'],
    ['#4a4e69', '#9a8c98'],
    ['#312244', '#5c4d7d'],
    ['#353535', '#707070'],
  ];

  const hash = Math.abs(getHash(title));
  const [c1, c2] = colors[hash % colors.length];
  const initials = author ? author.charAt(0).toUpperCase() : '?';

  const styles = {
    sm: { width: '48px', height: '72px', fontSize: '10px' },
    md: { width: '100px', height: '140px', fontSize: '14px' },
    lg: { width: '140px', height: '200px', fontSize: '18px' },
  };

  const { width, height, fontSize } = styles[size];

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '12px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ opacity: 0.1, fontSize: '60px', position: 'absolute', bottom: '-10px', right: '-10px', fontWeight: 'bold' }}>
        {initials}
      </div>
      <div style={{ fontWeight: '600', fontSize, lineHeight: 1.2, zIndex: 1 }}>{title}</div>
      <div style={{ fontSize: '10px', opacity: 0.8, zIndex: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{author}</div>
    </div>
  );
};

export default CoverGenerator;
