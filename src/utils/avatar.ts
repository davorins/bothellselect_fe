export const getAvatarUrl = (
  avatarPath: string,
  type: 'parent' | 'coach' | 'player' = 'parent'
) => {
  if (!avatarPath) {
    return type === 'coach'
      ? '/uploads/avatars/coaches.png'
      : '/uploads/avatars/parents.png';
  }

  // If it's already a full URL (Cloudinary)
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }

  // For local paths
  if (avatarPath.startsWith('/uploads')) {
    return `${process.env.REACT_APP_API_BASE_URL || ''}${avatarPath}`;
  }

  // Default fallback
  return type === 'coach'
    ? '/uploads/avatars/coaches.png'
    : '/uploads/avatars/parents.png';
};
