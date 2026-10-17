// frontend/src/utils/avatarUtils.ts

const AVATAR_BASE = '/assets/img/avatar';

export const DEFAULT_AVATARS = {
  boy: `${AVATAR_BASE}/boy.png`,
  girl: `${AVATAR_BASE}/girl.png`,
  mom: `${AVATAR_BASE}/mom.png`,
  dad: `${AVATAR_BASE}/dad.png`,
  guardian: `${AVATAR_BASE}/guardian.png`,
  agent: `${AVATAR_BASE}/agent.png`,
  coach: `${AVATAR_BASE}/coach.png`,
} as const;

/**
 * Resolve a parent/guardian avatar.
 * Priority: user-uploaded → relationship default → generic agent.
 */
export const getParentAvatar = (
  avatar?: string | null,
  relationship?: string | null,
): string => {
  if (avatar) {
    // Legacy relative path served by the backend
    if (avatar.startsWith('/uploads/')) {
      return `https://bothell-select.onrender.com${avatar}`;
    }
    return avatar;
  }

  switch ((relationship || '').trim().toLowerCase()) {
    case 'mother':
      return DEFAULT_AVATARS.mom;
    case 'father':
      return DEFAULT_AVATARS.dad;
    case 'guardian':
      return DEFAULT_AVATARS.guardian;
    case 'agent':
    case 'other':
    case 'parent/guardian':
    default:
      return DEFAULT_AVATARS.guardian;
  }
};

/** Coach avatar fallback → coach.png */
export const getCoachAvatar = (avatar?: string | null): string => {
  if (avatar) return avatar;
  return DEFAULT_AVATARS.coach;
};

/** Player avatar fallback. */
export const getPlayerAvatar = (
  avatar?: string | null,
  gender?: string | null,
): string => {
  if (avatar) return avatar;
  return gender === 'Female' ? DEFAULT_AVATARS.girl : DEFAULT_AVATARS.boy;
};
