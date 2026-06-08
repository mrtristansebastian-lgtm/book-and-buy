// --- Modern typography library ---
        export const FONT_OPTIONS = [
            { id: 'inter', name: 'Inter', category: 'Sans', family: '"Inter", sans-serif' },
            { id: 'plus-jakarta', name: 'Jakarta', category: 'Sans', family: '"Plus Jakarta Sans", sans-serif' },
            { id: 'figtree', name: 'Figtree', category: 'Sans', family: '"Figtree", sans-serif' },
            { id: 'public-sans', name: 'Public Sans', category: 'Sans', family: '"Public Sans", sans-serif' },
            { id: 'spline-sans', name: 'Spline', category: 'Sans', family: '"Spline Sans", sans-serif' },
            { id: 'outfit', name: 'Outfit', category: 'Sans', family: '"Outfit", sans-serif' },
            { id: 'dm-sans', name: 'DM Sans', category: 'Sans', family: '"DM Sans", sans-serif' },
            { id: 'manrope', name: 'Manrope', category: 'Sans', family: '"Manrope", sans-serif' },
            { id: 'chivo', name: 'Chivo', category: 'Sans', family: '"Chivo", sans-serif' },
            { id: 'space-grotesk', name: 'Space Grotesk', category: 'Sans', family: '"Space Grotesk", sans-serif' },
            { id: 'bricolage', name: 'Bricolage', category: 'Sans', family: '"Bricolage Grotesque", sans-serif' },
            { id: 'montserrat', name: 'Montserrat', category: 'Sans', family: '"Montserrat", sans-serif' },
            { id: 'poppins', name: 'Poppins', category: 'Sans', family: '"Poppins", sans-serif' },
            { id: 'work-sans', name: 'Work Sans', category: 'Sans', family: '"Work Sans", sans-serif' },
            { id: 'roboto', name: 'Roboto', category: 'Sans', family: '"Roboto", sans-serif' },
            { id: 'source-sans-3', name: 'Source Sans 3', category: 'Sans', family: '"Source Sans 3", sans-serif' },
            { id: 'urbanist', name: 'Urbanist', category: 'Sans', family: '"Urbanist", sans-serif' },
            { id: 'rubik', name: 'Rubik', category: 'Sans', family: '"Rubik", sans-serif' },
            { id: 'nunito-sans', name: 'Nunito Sans', category: 'Sans', family: '"Nunito Sans", sans-serif' },
            { id: 'lexend', name: 'Lexend', category: 'Sans', family: '"Lexend", sans-serif' },
            { id: 'ibm-plex-sans', name: 'IBM Plex Sans', category: 'Sans', family: '"IBM Plex Sans", sans-serif' },
            { id: 'syne', name: 'Syne', category: 'Display Sans', family: '"Syne", sans-serif' },
            { id: 'oswald', name: 'Oswald', category: 'Display Sans', family: '"Oswald", sans-serif' },
            { id: 'unbounded', name: 'Unbounded', category: 'Display Sans', family: '"Unbounded", sans-serif' },
            { id: 'newsreader', name: 'Newsreader', category: 'Serif', family: '"Newsreader", serif' },
            { id: 'marcellus', name: 'Marcellus', category: 'Serif', family: '"Marcellus", serif' },
            { id: 'spectral', name: 'Spectral', category: 'Serif', family: '"Spectral", serif' },
            { id: 'lora', name: 'Lora', category: 'Serif', family: '"Lora", serif' },
            { id: 'cormorant', name: 'Cormorant', category: 'Serif', family: '"Cormorant Garamond", serif' },
            { id: 'cinzel', name: 'Cinzel', category: 'Serif', family: '"Cinzel", serif' },
            { id: 'kalam', name: 'Kalam', category: 'Hand', family: '"Kalam", cursive' },
            { id: 'ibm-plex-mono', name: 'IBM Plex Mono', category: 'Mono', family: '"IBM Plex Mono", monospace' },
            { id: 'jetbrains-mono', name: 'JetBrains Mono', category: 'Mono', family: '"JetBrains Mono", monospace' },
            { id: 'space-mono', name: 'Space Mono', category: 'Mono', family: '"Space Mono", monospace' }
        ];

        export const getFontFamily = (id) => {
            const font = FONT_OPTIONS.find(f => f.id === id);
            return font ? font.family : '"Plus Jakarta Sans", "Figtree", sans-serif';
        };
