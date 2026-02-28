import { render } from '@testing-library/react';
import { LoginForm } from '@/components/LoginForm';

test('renders without crashing', () => {
  render(<LoginForm onLogin={async () => {}} />);
});