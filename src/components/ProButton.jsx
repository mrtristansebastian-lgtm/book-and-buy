import { memo } from 'react';

export const ProButton = memo(({ children, onClick, className = "", variant = "primary", disabled = false }) => {
            const base = "relative px-12 py-5 rounded-full font-bold transition-all duration-1000 flex items-center justify-center gap-3 overflow-hidden active:scale-95 disabled:opacity-10 disabled:cursor-not-allowed text-[11px] uppercase tracking-[0.4em]";
            const variants = {
                primary: "bg-black text-white hover:bg-neutral-800 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)]",
                neon: "bg-[#39FF14] text-black hover:shadow-[0_40px_80px_-15px_rgba(57,255,20,0.4)]",
                outline: "border border-neutral-100 text-black hover:bg-neutral-50",
                ghost: "text-neutral-300 hover:text-black transition-colors"
            };
            return (
                <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
                {children}
                </button>
            );
        });
