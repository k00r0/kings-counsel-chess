// The app mark: a king's crown over a scroll of counsel.
export function Logo({ size = 40 }) {
  return (
    <svg class="logo" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#14243b" />
      <path d="M14 42h36l-3 8H17z" fill="#d4a63a" />
      <path d="M16 40 12 20l10 9 10-15 10 15 10-9-4 20z" fill="#f3d27a" stroke="#9a6a12" stroke-width="1.5" stroke-linejoin="round" />
      <circle cx="12" cy="19" r="3" fill="#f3d27a" stroke="#9a6a12" stroke-width="1.2" />
      <circle cx="32" cy="12.5" r="3.2" fill="#e0473d" stroke="#9a6a12" stroke-width="1.2" />
      <circle cx="52" cy="19" r="3" fill="#f3d27a" stroke="#9a6a12" stroke-width="1.2" />
      <path d="M24 34h16" stroke="#9a6a12" stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}
