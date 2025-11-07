// Caminho: components/landing/HeroWaveDivider.tsx

/**
 * Componente de divisor com efeito de onda (Complexo, para o Hero)
 * Cria transições suaves e fluidas entre seções
 */

interface WaveDividerProps {
  position?: "top" | "bottom";
  color?: string; // Espera uma classe do Tailwind, ex: 'fill-card'
  flip?: boolean;
}

const HeroWaveDivider = ({ 
  position = "bottom", 
  color = "fill-primary",
  flip = true 
}: WaveDividerProps) => {
  return (
    <div
      className={`absolute ${position}-0 left-0 w-full overflow-hidden leading-none pointer-events-none ${
        flip ? "rotate-180" : ""
      }`}
      style={{ height: "200px", zIndex: 0}}
    >
      <svg
        className={`relative block w-full ${color} transition-all duration-300`}
        style={{ height: "140px" }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 130"
        preserveAspectRatio="none"
      >
        {/* Camada de fundo com ondas suaves */}
        <path
          d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
          className="opacity-50"
        />
        {/* Camada intermediária */}
        <path
          d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
          className="opacity-70"
        />
        {/* Camada frontal com mais detalhes */}
        <path
          d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
          className="opacity-100"
        />
      </svg>
    </div>
  );
};

export default HeroWaveDivider;