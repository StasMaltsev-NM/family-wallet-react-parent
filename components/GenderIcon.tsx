import React from 'react';

interface GenderIconProps {
  gender: 'male' | 'female';
  size?: number;
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender, size = 64 }) => {
  const isMale = gender === 'male';
  const color = isMale ? '#00d9ff' : '#ff4db8';
  const points = isMale ? '50,76 18,26 82,26' : '50,24 18,74 82,74';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.55)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <polygon
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
