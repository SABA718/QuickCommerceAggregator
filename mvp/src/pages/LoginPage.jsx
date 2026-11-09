import { useEffect, useRef, useState } from 'react';
import OtpPage from './OtpPage';
import { sendOtp, verifyOtp } from '../api';

function LoginPage({ isOpen, onClose, onLoginSuccess }) {
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [resendAfterSeconds, setResendAfterSeconds] = useState(30);
  const requestPending = useRef(false);
  const phoneInput = useRef(null);

  useEffect(() => {
    const existingLink = document.querySelector(
      'link[data-fonts="dealdock-fonts"]'
    );

    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700;800&display=swap';
    link.setAttribute('data-fonts', 'dealdock-fonts');
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        const dialog = document.querySelector('.otp-modal, .login-modal');
        const controls = dialog?.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          if (last instanceof HTMLElement) last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          if (first instanceof HTMLElement) first.focus();
        }
      }
      if (event.key === 'Escape' && !requestPending.current) {
        event.preventDefault();
        if (isOtpOpen) {
          setIsOtpOpen(false);
        } else {
          onClose?.();
        }
      }
    };

    if (isOpen || isOtpOpen) {
      const previousFocus = document.activeElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
      };
    }
  }, [isOpen, isOtpOpen, onClose]);

  const normalizePhone = (value) => value.replace(/\D/g, '');

  const getFormattedPhone = () => {
    const cleaned = normalizePhone(phoneNumber);
    return `+91${cleaned}`;
  };

  const handleClose = () => {
    if (requestPending.current) return;
    setErrorMessage('');
    setStatusMessage('');
    setIsOtpOpen(false);
    onClose?.();
  };

  useEffect(() => {
    if (isOpen && !isOtpOpen) phoneInput.current?.focus();
  }, [isOpen, isOtpOpen]);

  const handleContinue = async (event) => {
    event?.preventDefault();
    if (requestPending.current) return;
    const cleaned = normalizePhone(phoneNumber);
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setErrorMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    requestPending.current = true;
    setIsSendingOtp(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const response = await sendOtp(`+91${cleaned}`);
      setResendAfterSeconds(response.resendAfterSeconds ?? 30);
      setIsOtpOpen(true);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to send a code. Please try again.');
    } finally {
      requestPending.current = false;
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (enteredOtp) => {
    if (requestPending.current) return;
    if (!/^\d{6}$/.test(enteredOtp)) {
      setErrorMessage('Enter the complete 6-digit code.');
      return;
    }
    requestPending.current = true;
    setIsVerifyingOtp(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const response = await verifyOtp(getFormattedPhone(), enteredOtp);
      if (!response.user?.phoneNumber) throw new Error('Unable to confirm your session. Please try again.');
      setIsOtpOpen(false);
      setPhoneNumber('');
      onLoginSuccess?.(response.user);
      onClose?.();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to verify this code. Please try again.');
    } finally {
      requestPending.current = false;
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (requestPending.current) return false;
    requestPending.current = true;
    setIsSendingOtp(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const response = await sendOtp(getFormattedPhone());
      setResendAfterSeconds(response.resendAfterSeconds ?? 30);
      setStatusMessage('A new code has been sent.');
      return true;
    } catch (error) {
      setErrorMessage(error.message || 'Unable to resend a code. Please try again.');
      return false;
    } finally {
      requestPending.current = false;
      setIsSendingOtp(false);
    }
  };

  if (!isOpen && !isOtpOpen) return null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1000;
          animation: overlayFade 260ms ease forwards;
        }

        .login-modal {
          width: min(900px, 100%);
          max-height: calc(100vh - 48px);
          overflow: auto;
          border-radius: 18px;
          box-shadow: 0 40px 100px rgba(20, 14, 11, 0.4);
          animation: modalIn 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center;
          position: relative;
          background: #fffaf6;
        }

        .login-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          min-height: 560px;
        }

        .login-left {
          position: relative;
          padding: 44px 40px 34px;
          background: linear-gradient(160deg, #9b7257 0%, #8b624d 60%, #7a5442 100%);
          color: #fff7f1;
        }

        .login-right {
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 34px 28px;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 18px;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: transparent;
          color: #2c211b;
          font-size: 24px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          transition: transform 180ms ease, background 180ms ease;
        }

        .close-btn:hover {
          transform: rotate(90deg);
          background: rgba(0, 0, 0, 0.06);
        }

        .brand {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 46px;
        }

        .brand .deal {
          font-family: "Fraunces", Georgia, serif;
          font-size: 42px;
          font-weight: 700;
          line-height: 1;
          color: #fff8f0;
        }

        .brand .dock {
          font-family: "Fraunces", Georgia, serif;
          font-size: 42px;
          font-weight: 700;
          line-height: 1;
          font-style: italic;
          color: #f4debb;
        }

        .left-content {
          position: relative;
          z-index: 1;
          max-width: 420px;
        }

        .left-content h2 {
          margin: 0 0 16px;
          font-family: "Fraunces", Georgia, serif;
          font-size: 34px;
          line-height: 1.2;
          font-weight: 700;
          color: #fff8f2;
        }

        .left-content p {
          margin: 0 0 24px;
          color: rgba(255, 244, 234, 0.82);
          font-size: 15px;
          line-height: 1.65;
        }

        .phone-wrap {
          position: relative;
          z-index: 1;
        }

        .input-shell {
          height: 58px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          padding: 0 18px;
          background: #ffffff;
          margin-bottom: 20px;
        }

        .country-code {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-right: 14px;
          margin-right: 14px;
          border-right: 1px solid #e3d5c8;
          color: #826f62;
          font-size: 15px;
          flex-shrink: 0;
        }

        .country-code strong {
          color: #332720;
        }

        .phone-input {
          flex: 1;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #2b2420;
          font-size: 15px;
          font-weight: 600;
          font-family: "Inter", sans-serif;
        }

        .phone-input::placeholder {
          color: #9d8c80;
          font-weight: 500;
        }

        .continue-btn {
          width: 100%;
          height: 58px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          background: linear-gradient(180deg, #d3aa7a 0%, #bc9064 100%);
          color: #fffaf4;
          font-size: 16px;
          font-weight: 800;
          transition: filter 180ms ease, opacity 180ms ease;
        }

        .continue-btn:hover {
          filter: brightness(1.05);
        }

        .continue-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-text {
          margin: 0 0 14px;
          color: #ffd8d1;
          font-size: 13px;
          font-weight: 600;
        }

        .legal {
          position: relative;
          z-index: 1;
          margin-top: 26px;
          text-align: center;
          color: rgba(255, 244, 234, 0.82);
          font-size: 13px;
          line-height: 1.7;
        }

        .legal strong {
          color: #f4debb;
        }

        .app-box {
          width: 100%;
          max-width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .app-icon {
          width: 108px;
          height: 108px;
          border-radius: 50%;
          background: #fdf3e9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
        }

        .app-box h3 {
          margin: 0 0 6px;
          font-family: "Fraunces", Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #7a5947;
        }

        .app-box p {
          margin: 0 0 24px;
          color: #958578;
          font-size: 15px;
        }

        .store-btn {
          width: 100%;
          height: 54px;
          border: none;
          border-radius: 10px;
          background: #101010;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          margin-bottom: 12px;
        }

        .store-btn:last-child {
          margin-bottom: 0;
        }

        .store-copy {
          text-align: left;
        }

        .store-copy small {
          display: block;
          font-size: 10px;
          font-weight: 700;
          opacity: 0.9;
        }

        .store-copy strong {
          font-size: 15px;
          font-weight: 800;
        }

        @keyframes overlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 1024px) {
          .login-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .modal-overlay {
            padding: 12px;
          }

          .login-modal {
            max-height: calc(100vh - 24px);
            border-radius: 16px;
          }

          .login-left,
          .login-right {
            padding: 24px 20px;
          }

          .brand {
            margin-bottom: 26px;
          }

          .brand .deal,
          .brand .dock {
            font-size: 32px;
          }

          .left-content h2 {
            font-size: 26px;
          }
        }
      `}</style>

      {isOpen && !isOtpOpen && (
        <div
          className="modal-overlay"
          onClick={handleClose}
        >
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              type="button"
              disabled={isSendingOtp}
              onClick={handleClose}
              aria-label="Close modal"
            >
              ×
            </button>

            <div className="login-grid">
              <div className="login-left">
                <div className="brand">
                  <span className="deal">Deal</span>
                  <span className="dock">Dock</span>
                </div>

                <div className="left-content">
                  <h2 id="login-heading">Compare everyday grocery prices</h2>
                  <p>Enter your phone number to continue.</p>
                </div>

                <form className="phone-wrap" onSubmit={handleContinue} noValidate>
                  <div className="input-shell">
                    <div className="country-code">
                      <span>IN</span>
                      <strong>+91</strong>
                    </div>

                    <input
                      className="phone-input"
                      ref={phoneInput}
                      aria-label="Indian mobile number"
                      aria-describedby={errorMessage ? "login-error" : undefined}
                      aria-invalid={Boolean(errorMessage)}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      disabled={isSendingOtp}
                      type="tel"
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setErrorMessage('');
                      }}
                    />
                  </div>

                  {errorMessage ? (
                    <p id="login-error" className="error-text" role="alert">{errorMessage}</p>
                  ) : null}

                  <button
                    className="continue-btn"
                    type="submit"
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? 'Sending OTP...' : 'Continue'}
                  </button>
                </form>

                <div className="legal">
                  Your number is used to send a one-time sign-in code.
                </div>
              </div>

              <div className="login-right">
                <div className="app-box">
                  <div className="app-icon">
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8B624D"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" />
                      <path d="M9 8V6a3 3 0 1 1 6 0v2" />
                      <path d="M10 12v3" />
                      <path d="M14 12v3" />
                    </svg>
                  </div>

                  <h3>Your shopping starts here</h3>
                  <p>Compare available prices and build your grocery list in your browser.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <OtpPage
        isOpen={isOtpOpen}
        phoneNumber={`+91 ${normalizePhone(phoneNumber)}`}
        onClose={handleClose}
        onBack={() => {
          if (requestPending.current) return;
          setStatusMessage('');
          setIsOtpOpen(false);
          setErrorMessage('');
        }}
        onResend={handleResendOtp}
        onVerify={handleVerifyOtp}
        errorMessage={errorMessage}
        statusMessage={statusMessage}
        resendAfterSeconds={resendAfterSeconds}
        isSendingOtp={isSendingOtp}
        isVerifyingOtp={isVerifyingOtp}
      />
    </>
  );
}

export default LoginPage;