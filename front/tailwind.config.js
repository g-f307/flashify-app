// Caminho: tailwind.config.js (Código Completo Corrigido)

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        input: "hsl(var(--input))",
        
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        sidebar: "hsl(var(--sidebar))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "sidebar-border": "hsl(var(--sidebar-border))",
        "card-border": "hsl(var(--card-border))",
        glow: "hsl(var(--glow))",
        "lime-accent": "hsl(var(--lime-accent))",
        "lime-accent-foreground": "hsl(var(--lime-accent-foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      // ===========================================
      // INÍCIO DAS CORREÇÕES DE ANIMAÇÃO
      // ===========================================
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, hsl(191 85% 48%), hsl(191 69% 67%))',      
      },

      // Bloco KEYFRAMES (O que você já tinha, mais as animações do accordion)
      keyframes: {
        // Animações padrão do ShadCN/UI
        "accordion-down": {
          from: { height: "0" }, // Nota: "0" deve ser uma string
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }, // Nota: "0" deve ser uma string
        },

        // Animações da Landing Page
        fadeInUp: {
          'from': { opacity: 0, transform: 'translateY(30px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        fallIn: {
          'from': { opacity: 0, transform: 'translateY(-80px) rotate(-15deg)' },
          'to': { opacity: 1, transform: 'translateY(0) rotate(0)' },
        },
        sendToBack: {
          'to': { transform: 'translateY(30px) scale(0.8)', opacity: 0 },
        },
        deckArrive: {
          'from': { transform: 'scale(0.8)', opacity: 0 },
          'to': { transform: 'scale(1)', opacity: 1 },
        },
        'pulse-shadow': {
          '0%, 100%': { boxShadow: 'var(--shadow-button)' },
          '50%': { boxShadow: '0 8px 30px hsla(45 100% 50% / 0.5)' }, // Sombra mais forte no "meio" da pulsação
        },
      },
      
      // Bloco ANIMATION (Este era o bloco que faltava)
      animation: {
        // Animações padrão do ShadCN/UI
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        // Animações da Landing Page
        fadeInUp: 'fadeInUp 1s ease-out forwards',
        fallIn: 'fallIn 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards',
        sendToBack: 'sendToBack 0.5s ease-in-out forwards',
        deckArrive: 'deckArrive 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'pulse-shadow': 'pulse-shadow 2.5s ease-in-out infinite',
      },

      // ===========================================
      // FIM DAS CORREÇÕES DE ANIMAÇÃO
      // ===========================================
    },
  },
  plugins: [require("tailwindcss-animate")],
};