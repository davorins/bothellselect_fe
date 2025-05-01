export const optimizeCloudinaryUrl = (
  avatarPath?: string,
  type: 'parent' | 'coach' | 'player' = 'parent'
): string => {
  const defaultAvatars = {
    coach: 'https://bothell-select.onrender.com/uploads/avatars/coaches.png',
    parent: 'https://bothell-select.onrender.com/uploads/avatars/parents.png',
    player: 'https://bothell-select.onrender.com/uploads/avatars/players.png',
  };

  if (!avatarPath) return defaultAvatars[type];

  if (avatarPath.startsWith('http')) {
    if (
      avatarPath.includes('res.cloudinary.com') &&
      !avatarPath.includes('/upload/f_')
    ) {
      return avatarPath.replace(
        '/upload/',
        '/upload/f_auto,q_auto,w_300,h_300,c_fill/'
      );
    }
    return avatarPath;
  }

  // Only attach your backend URL for true local image paths
  if (avatarPath.startsWith('/uploads/')) {
    return `https://bothell-select.onrender.com${avatarPath}`;
  }

  return defaultAvatars[type]; // fallback
};
