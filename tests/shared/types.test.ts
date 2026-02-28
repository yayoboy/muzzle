import { Session } from '../../packages/shared/src/types';

test('Session type exists', () => {
  const s: Session = {
    id: 'abc',
    name: 'test',
    tmuxSession: 'muzzle-abc',
    ttydPort: 7681,
    createdAt: new Date(),
    lastActivity: new Date()
  };
  expect(s.id).toBe('abc');
});