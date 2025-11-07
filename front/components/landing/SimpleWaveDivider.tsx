// Caminho: components/landing/SimpleWaveDivider.tsx

interface WaveDividerProps {
  position?: 'top' | 'bottom';
  flip?: boolean;
  color?: string; // Espera uma cor, ex: '#FFFFFF'
}

/**
 * Componente de divisor em formato de onda (Simples, para seções)
 * Usado para separar seções da landing page
 */
const SimpleWaveDivider = ({ position = 'bottom', flip = false, color = '#FFFFFF' }: WaveDividerProps) => {
  const positionClass = position === 'top' ? 'top-0' : 'bottom-0';
  const transformClass = flip ? 'scale-y-[-1]' : '';

  return (
    <div className={`absolute ${positionClass} left-0 w-full overflow-hidden leading-none ${transformClass}`}>
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block w-full h-[60px] md:h-[80px]"
      >
        <path
          d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
          fill={color}
        />
      </svg>
    </div>
  );
};

export default SimpleWaveDivider;