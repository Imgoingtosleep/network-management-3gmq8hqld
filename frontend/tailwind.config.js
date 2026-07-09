/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0A0B0D', // background หลัก
          900: '#111214',
          800: '#16171B', // surface / card
          700: '#1D1F23',
          600: '#26272C', // border
        },
        ink: {
          100: '#F2F3F5', // ตัวอักษรหลัก
          400: '#9A9CA3', // ตัวอักษรรอง
          600: '#6B6D74',
        },
        nds: {
          DEFAULT: '#4C8DFF', // สีประจำทีม NDS - electric blue
          dim: 'rgba(76,141,255,0.12)',
        },
        cds: {
          DEFAULT: '#FF9A3D', // สีประจำทีม CDS - copper/amber
          dim: 'rgba(255,154,61,0.12)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
