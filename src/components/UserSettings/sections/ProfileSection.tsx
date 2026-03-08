'use client';

import { useUserSettings } from '../hooks/useUserSettings';
import { ProfileForm } from '../subcomponents/ProfileForm';

interface ProfileSectionProps {
  isActive?: boolean;
}

export function ProfileSection({ isActive = true }: ProfileSectionProps) {
  const { profile, setProfile, handleSaveProfile, saveStatus } = useUserSettings();
  
  if (!isActive) return null;
  
  return (
    <ProfileForm 
      profile={profile}
      onProfileChange={setProfile}
      onSave={handleSaveProfile}
      saveStatus={saveStatus}
    />
  );
}

export default ProfileSection;