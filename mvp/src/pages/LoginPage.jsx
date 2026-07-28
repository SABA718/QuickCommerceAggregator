import { useEffect, useState } from 'react';
import OtpPage from './OtpPage';
import { sendOtp, verifyOtp } from '../api';

function LoginPage({ isOpen, onClose, onLoginSuccess }) {
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      if (event.key === 'Escape') {
        if (isOtpOpen) {
          setIsOtpOpen(false);
        } else {
          onClose?.();
        }
      }
    };

    if (isOpen || isOtpOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isOtpOpen, onClose]);

  const normalizePhone = (value) => value.replace(/\D/g, '');

  const getFormattedPhone = () => {
    const cleaned = normalizePhone(phoneNumber);
    return `+91${cleaned}`;
  };

  const handleClose = () => {
    setErrorMessage('');
    setIsOtpOpen(false);
    onClose?.();
  };

  const handleContinue = async () => {
    const cleaned = normalizePhone(phoneNumber);

    if (cleaned.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setIsSendingOtp(true);
      setErrorMessage('');

      await sendOtp(`+91${cleaned}`);
      setIsOtpOpen(true);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (enteredOtp) => {
    try {
      setIsVerifyingOtp(true);
      setErrorMessage('');

      await verifyOtp(getFormattedPhone(), enteredOtp);

      const userPayload = {
        phoneNumber: getFormattedPhone(),
      };

      setIsOtpOpen(false);
      setPhoneNumber('');
      onLoginSuccess?.(userPayload);
      onClose?.();
    } catch (error) {
      setErrorMessage(error.message || 'Invalid OTP');
      alert(error.message || 'Invalid OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsSendingOtp(true);
      setErrorMessage('');

      await sendOtp(getFormattedPhone());
      alert('OTP resent successfully');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to resend OTP');
      alert(error.message || 'Failed to resend OTP');
    } finally {
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
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
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
                  <h2>Everyday low prices in minutes</h2>
                  <p>Enter your phone number to continue.</p>
                </div>

                <div className="phone-wrap">
                  <div className="input-shell">
                    <div className="country-code">
                      <span>IN</span>
                      <strong>+91</strong>
                    </div>

                    <input
                      className="phone-input"
                      type="tel"
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setErrorMessage('');
                      }}
                    />
                  </div>

                  {errorMessage ? (
                    <p className="error-text">{errorMessage}</p>
                  ) : null}

                  <button
                    className="continue-btn"
                    onClick={handleContinue}
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? 'Sending OTP...' : 'Continue'}
                  </button>
                </div>

                <div className="legal">
                  By continuing, you agree to our <br />
                  <strong>Terms of Service & Privacy Policy</strong>
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

                  <h3>Order faster & easier every time</h3>
                  <p>with the DealDock app</p>

                  <button className="store-btn" type="button">
                    <span style={{ fontSize: '22px' }}>▶</span>
                    <div className="store-copy">
                      <small>GET IT ON</small>
                      <strong>Google Play</strong>
                    </div>
                  </button>

                  <button className="store-btn" type="button">
                    <span style={{ fontSize: '22px' }}></span>
                    <div className="store-copy">
                      <small>Download on the</small>
                      <strong>App Store</strong>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <OtpPage
        isOpen={isOtpOpen}
        phoneNumber={`+91 ${normalizePhone(phoneNumber)}`}
        onClose={() => {
          setIsOtpOpen(false);
          setErrorMessage('');
          onClose?.();
        }}
        onBack={() => {
          setIsOtpOpen(false);
          setErrorMessage('');
        }}
        onResend={handleResendOtp}
        onVerify={handleVerifyOtp}
        isSendingOtp={isSendingOtp}
        isVerifyingOtp={isVerifyingOtp}
      />
    </>
  );
}

export default LoginPage;