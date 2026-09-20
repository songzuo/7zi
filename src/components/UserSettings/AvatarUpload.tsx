'use client'

import { memo, useState, useCallback, ChangeEvent } from 'react'
import Image from 'next/image'

export interface AvatarUploadProps {
  avatar: string
  onAvatarChange: (url: string) => void
}

/**
 * 头像上传组件
 */
const AvatarUpload = memo(function AvatarUpload({ avatar, onAvatarChange }: AvatarUploadProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        // Create a local URL for preview
        const url = URL.createObjectURL(file)
        onAvatarChange(url)
      }
    },
    [onAvatarChange]
  )

  return (
    <div
      className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt="用户头像"
          className="h-full w-full object-cover"
          fill
          sizes="96px"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400 to-purple-500">
          <span className="text-3xl font-bold text-white">?</span>
        </div>
      )}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'} `}
      >
        <label className="cursor-pointer text-sm font-medium text-white">
          更换头像
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
    </div>
  )
})

export default AvatarUpload
