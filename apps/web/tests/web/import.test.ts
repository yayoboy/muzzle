import { existsSync } from 'fs';
import { join } from 'path';

test('LoginForm component exists', () => {
  const componentPath = join(__dirname, '../../src/components/LoginForm.tsx');
  expect(existsSync(componentPath)).toBe(true);
});