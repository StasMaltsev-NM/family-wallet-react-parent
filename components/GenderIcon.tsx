import React from 'react';

interface GenderIconProps {
  gender: 'male' | 'female';
  size?: number;
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender, size = 64 }) => {
  const isMale = gender === 'male';
  const color = isMale ? '#00d9ff' : '#ff69b4'; // голубой неон / розовый неон
  
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.4}px solid transparent`,
          borderRight: `${size * 0.4}px solid transparent`,
          // Мальчик: вершина вниз (borderTop)
          // Девочка: вершина вверх (borderBottom)
          ...(isMale 
            ? { borderTop: `${size * 0.6}px solid ${color}` }
            : { borderBottom: `${size * 0.6}px solid ${color}` }
          ),
          filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color})`,
        }}
      />
    </div>
  );
};
