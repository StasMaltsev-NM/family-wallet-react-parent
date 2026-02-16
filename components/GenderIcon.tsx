import React from 'react';

interface GenderIconProps {
  gender: 'male' | 'female';
  size?: number;
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender, size = 64 }) => {
  const isMale = gender === 'male';
  const color = isMale ? '#00d9ff' : '#ff4db8';
  const symbol = isMale ? '▼' : '▲';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 100%)',
        border: `1.5px solid ${color}66`,
        boxShadow: `0 0 12px ${color}40, inset 0 0 14px ${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        color: color,
        fontWeight: 'bold',
        textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
      }}
    >
      {symbol}
    </div>
  );
};
