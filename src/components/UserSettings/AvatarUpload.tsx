'use client';

import { memo, useState, useCallback, ChangeEvent } from 'react';

export interface AvatarUploadProps {
  avatar: string;
  onAvatarChange: (url: string) => void;
}

/**
 * 头像上传组件
 */
const AvatarUpload = memo(function AvatarUpload({
  avatar,
  onAvatarChange,
}: AvatarUploadProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a local URL for preview
      const url = URL.createObjectURL(file);
      onAvatarChange(url);
    }
  }, [onAvatarChange]);

  return (
    <div
      className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {avatar ? (
        <img
          src={avatar}
          alt="用户头像"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
          <span className="text-3xl text-white font-bold">?</span>
        </div>
      )}
      <div
        className={`
          absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <label className="cursor-pointer text-white text-sm font-medium">
          更换头像
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
});

export default AvatarUpload;