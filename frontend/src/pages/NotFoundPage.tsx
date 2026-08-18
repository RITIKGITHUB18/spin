import { useNavigate } from 'react-router-dom';
import { ErrorState } from '../components/common/ErrorState';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <ErrorState
      title="Hmm, nothing spinning here"
      message="This page wandered off on its own little cycle. Let's get you back home."
      actionLabel="Take me home"
      onAction={() => navigate('/')}
    />
  );
}
