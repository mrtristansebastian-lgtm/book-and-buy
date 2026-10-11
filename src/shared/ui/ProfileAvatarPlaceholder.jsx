/** Neutral person silhouette shared by empty customer and business avatars. */
export function ProfileAvatarPlaceholder() {
  return <svg className="bb-profile-avatar-placeholder" width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="50" fill="#eef0f3" />
    <circle cx="50" cy="36" r="17" fill="#b5bbc4" />
    <path d="M18 86c0-19 13-31 32-31s32 12 32 31" fill="#b5bbc4" />
  </svg>;
}
