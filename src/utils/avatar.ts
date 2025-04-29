// utils/avatar.ts
export const getAvatarUrl = (avatarPath?: string | null): string => {
  const baseUrl = (
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'
  ).replace('/api', '');
  const defaultAvatar = `${baseUrl}/uploads/avatars/parents.png`;

  if (!avatarPath) return defaultAvatar;

  return avatarPath.startsWith('http')
    ? avatarPath
    : `${baseUrl}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;
};

export const handleAvatarError = (
  e: React.SyntheticEvent<HTMLImageElement>
) => {
  const baseUrl = (
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'
  ).replace('/api', '');
  e.currentTarget.src = `${baseUrl}/uploads/avatars/parents.png`;
};
