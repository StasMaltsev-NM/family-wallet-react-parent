import React from 'react';

interface GenderIconProps {
  gender: 'male' | 'female';
  size?: number;
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender, size = 64 }) => {
  const color = gender === 'male' ? '#00d9ff' : '#ff69b4'; // голубой / розовый
  const rotation = gender === 'male' ? 'rotate(180deg)' : 'rotate(0deg)'; // вниз / вверх

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size * 0.8}
        height={size * 0.8}
        viewBox="0 0 100 100"
        style={{ transform: rotation }}
      >
        <polygon
          points="50,10 90,80 10,80"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
