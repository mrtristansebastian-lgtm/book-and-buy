export function BuildABookingBrand({ className = '', title = 'Build A Booking', variant = 'dark' }) {
  const isLight = variant === 'light';

  return (
    <svg
      className={`build-booking-brand block overflow-visible ${className}`}
      viewBox="0 0 276 56"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <image
        href={isLight ? '/build-a-booking-mark-light.png' : '/build-a-booking-mark-dark.png'}
        x="2"
        y="4"
        width="32"
        height="48"
        preserveAspectRatio="xMidYMid meet"
      />
      <text
        x="48"
        y="36"
        fill={isLight ? '#ffffff' : '#050505'}
        fontFamily="'Plus Jakarta Sans', Inter, Manrope, Arial, sans-serif"
        fontSize="25"
        fontWeight="760"
        letterSpacing="-0.8"
      >
        Build A Booking
      </text>
    </svg>
  );
}

export function BuildABookingMark({ className = '', title = 'Build A Booking', variant = 'dark' }) {
  const isLight = variant === 'light';

  return (
    <img
      className={`build-booking-mark block object-contain ${className}`}
      src={isLight ? '/build-a-booking-mark-light.png' : '/build-a-booking-mark-dark.png'}
      alt={title}
      loading="eager"
      decoding="async"
    />
  );
}
