export const StaffAvatar = ({ sizeClass = 'w-14 h-14', staff }) => {
  const initials = (staff?.name || 'Team Member')
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`${sizeClass} rounded-full shadow-inner flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden`} style={{ backgroundColor: staff?.color || '#000000' }}>
      {staff?.photoURL ? <img src={staff.photoURL} alt="" className="w-full h-full object-cover" /> : initials}
    </div>
  );
};
