import { useLocation } from 'react-router-dom';
import { AwardEditor } from './editors/AwardEditor';
import { FeaturedEditor } from './editors/FeaturedEditor';
import { GameEditor } from './editors/GameEditor';
import { ProfileEditor } from './editors/ProfileEditor';
import { RigEditor } from './editors/RigEditor';

export default function Editors() {
  const page = useLocation().pathname.split('/').pop();
  if (page === 'profile') return <ProfileEditor/>;
  if (page === 'rig') return <RigEditor/>;
  if (page === 'games') return <GameEditor/>;
  if (page === 'awards') return <AwardEditor/>;
  return <FeaturedEditor/>;
}
