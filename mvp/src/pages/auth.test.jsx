// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { sendOtp, verifyOtp } from '../api';

vi.mock('../api', () => ({ sendOtp: vi.fn(), verifyOtp: vi.fn() }));

let userActions;
beforeEach(() => {
  userActions = userEvent.setup();
  vi.resetAllMocks();
});
afterEach(cleanup);

function openLogin() {
  const onLoginSuccess = vi.fn();
  render(<LoginPage isOpen onClose={vi.fn()} onLoginSuccess={onLoginSuccess} />);
  return onLoginSuccess;
}

async function enterPhone(value = '9876543210') {
  await userActions.type(screen.getByRole('textbox', { name: 'Indian mobile number' }), value);
  await userActions.click(screen.getByRole('button', { name: 'Continue' }));
}

async function enterCode(value = '123456') {
  for (const [index, digit] of [...value].entries()) {
    await userActions.type(screen.getByRole('textbox', { name: `Code digit ${index + 1}` }), digit);
  }
  await userActions.click(screen.getByRole('button', { name: 'Verify OTP' }));
}

describe('Phone login', () => {
  it('rejects invalid phones without sending SMS', async () => {
    openLogin();
    await enterPhone('123');
    expect(screen.getByRole('alert').textContent).toContain('valid 10-digit');
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it('allows only one pending send and uses the server resend cooldown', async () => {
    let resolveSend;
    sendOtp.mockImplementation(() => new Promise((resolve) => { resolveSend = resolve; }));
    openLogin();
    await enterPhone();
    const pendingButton = screen.getByRole('button', { name: 'Sending OTP...' });
    expect(pendingButton.disabled).toBe(true);
    fireEvent.submit(pendingButton.closest('form'));
    expect(sendOtp).toHaveBeenCalledTimes(1);
    expect(sendOtp).toHaveBeenCalledWith('+919876543210');
    resolveSend({ success: true, resendAfterSeconds: 45 });
    await screen.findByRole('heading', { name: 'OTP Verification' });
    expect(screen.getByRole('button', { name: 'Resend OTP' }).disabled).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('Time until another code can be requested').textContent).toBe('00:45'));
  });

  it('passes the authenticated server user to the app after verification', async () => {
    const user = { phoneNumber: '+919876543210', id: 'session-user' };
    sendOtp.mockResolvedValue({ success: true, resendAfterSeconds: 30 });
    verifyOtp.mockResolvedValue({ success: true, user });
    const onLoginSuccess = openLogin();
    await enterPhone();
    await screen.findByRole('heading', { name: 'OTP Verification' });
    await enterCode();
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(user));
    expect(verifyOtp).toHaveBeenCalledWith('+919876543210', '123456');
    expect(window.localStorage.length).toBe(0);
  });

  it('shows provider failures inline and permits retry', async () => {
    sendOtp.mockRejectedValue(new Error('SMS service unavailable. Please try again.'));
    openLogin();
    await enterPhone();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('SMS service unavailable');
    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(false);
  });

  it('keeps the user signed out when verification fails', async () => {
    sendOtp.mockResolvedValue({ success: true });
    verifyOtp.mockRejectedValue(new Error('Invalid or expired code'));
    const onLoginSuccess = openLogin();
    await enterPhone();
    await screen.findByRole('heading', { name: 'OTP Verification' });
    await enterCode();
    expect((await screen.findByRole('alert')).textContent).toContain('Invalid or expired code');
    expect(onLoginSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Verify OTP' }).disabled).toBe(false);
  });
});
