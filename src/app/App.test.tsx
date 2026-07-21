import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignInPage } from '../features/auth/SignInPage';

describe('SignInPage', () => {
  it('renders the magic link action', () => {
    render(<SignInPage />);
    expect(screen.getByRole('button', { name: 'ログインリンクを送る' })).toBeInTheDocument();
  });
});
