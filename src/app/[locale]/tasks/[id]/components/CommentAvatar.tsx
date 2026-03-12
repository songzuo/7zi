/**
 * Comment avatar component
 */

interface CommentAvatarProps {
  author: string;
  size?: 'sm' | 'md';
}

export function CommentAvatar({ author, size = 'md' }: CommentAvatarProps) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-medium`}
    >
      {author.charAt(0).toUpperCase()}
    </div>
  );
}
