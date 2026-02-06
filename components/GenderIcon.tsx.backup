import React from 'react';

interface GenderIconProps {
  gender: 'male' | 'female';
  size?: number;
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender, size = 64 }) => {
  const isMale = gender === 'male';
  const color = isMale ? '#00d9ff' : '#ff69b4'; // синий неон / розовый неон
  const symbol = isMale ? '♂' : '♀';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}, inset 0 0 20px ${color}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.6,
        color: color,
        fontWeight: 'bold',
        textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
      }}
    >
      {symbol}
    </div>
  );
};
