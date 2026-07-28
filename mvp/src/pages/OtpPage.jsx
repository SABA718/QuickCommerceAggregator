import { useEffect, useRef, useState } from 'react';

function OtpPage({
  isOpen = false,
  onClose = () => {},
  onBack = () => {},
  phoneNumber = '',
  onVerify = () => {},
  onResend = () => {},
  isSendingOtp = false,
  isVerifyingOtp = false,
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(25);
  const inputRefs = useRef([]);

  useEffect(() => {
    const existingLink = document.querySelector(
      'link[data-fonts="dealdock-fonts"]'
    );

    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700;800&display=swap';
      link.setAttribute('data-fonts', 'dealdock-fonts');
      document.head.appendChild(link);
    }

    if (!isOpen) return;

    setOtp(['', '', '', '', '', '']);
    setTimer(25);

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timer]);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace') {
      if (otp[index]) {
        const nextOtp = [...otp];
        nextOtp[index] = '';
        setOtp(nextOtp);
        return;
      }

      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (!pasted) return;

    const nextOtp = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, index) => {
      nextOtp[index] = char;
    });

    setOtp(nextOtp);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
    event.preventDefault();
  };

  const handleVerifyClick = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      alert('Please enter the 6-digit OTP');
      return;
    }
    onVerify(enteredOtp);
  };

  const formattedTime = `00:${String(timer).padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes otpOverlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes otpModalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .otp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 15, 12, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1100;
          animation: otpOverlayFade 260ms ease forwards;
        }

        .otp-modal {
          width: min(900px, 100%);
          max-height: calc(100vh - 48px);
          overflow: auto;
          border-radius: 18px;
          box-shadow: 0 40px 100px rgba(20, 14, 11, 0.4);
          animation: otpModalIn 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center;
          position: relative;
          background: #fffaf6;
        }

        .otp-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          min-height: 560px;
        }

        .otp-left {
          position: relative;
          padding: 44px 40px 34px;
          background: linear-gradient(160deg, #9b7257 0%, #8b624d 60%, #7a5442 100%);
          color: #fff7f1;
        }

        .otp-right {
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 34px 28px;
        }

        .otp-close {
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

        .otp-close:hover {
          transform: rotate(90deg);
          background: rgba(0, 0, 0, 0.06);
        }

        .otp-back {
          position: relative;
          z-index: 1;
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          color: #fff8f2;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-bottom: 28px;
          transition: background 180ms ease, transform 180ms ease;
        }

        .otp-back:hover {
          background: rgba(255,255,255,0.2);
          transform: translateX(-2px);
        }

        .otp-content {
          position: relative;
          z-index: 1;
          max-width: 460px;
        }

        .otp-content h2 {
          margin: 0 0 16px;
          font-family: "Fraunces", Georgia, serif;
          font-size: 34px;
          line-height: 1.2;
          font-weight: 700;
          color: #fff8f2;
        }

        .otp-content p {
          margin: 0 0 30px;
          color: rgba(255, 244, 234, 0.82);
          font-size: 15px;
          line-height: 1.65;
          font-weight: 500;
          font-family: "Inter", sans-serif;
        }

        .otp-content p strong {
          color: #fff8f2;
          font-weight: 700;
        }

        .otp-input-row {
          display: flex;
          gap: 12px;
          flex-wrap: nowrap;
          margin-bottom: 28px;
        }

        .otp-box {
          width: 58px;
          height: 58px;
          border-radius: 12px;
          border: none;
          background: #ffffff;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: #2b2420;
          outline: none;
          font-family: "Inter", sans-serif;
          box-shadow: inset 0 0 0 1px #e5d8cc;
        }

        .otp-box:focus {
          box-shadow:
            inset 0 0 0 2px #d3aa7a,
            0 0 0 4px rgba(211, 170, 122, 0.18);
        }

        .otp-timer {
          font-size: 32px;
          font-weight: 700;
          color: #fff8f2;
          margin-bottom: 20px;
          text-align: center;
          font-family: "Inter", sans-serif;
          letter-spacing: -0.02em;
        }

        .otp-resend {
          text-align: center;
          color: rgba(255, 244, 234, 0.82);
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 24px;
          font-family: "Inter", sans-serif;
        }

        .otp-resend button {
          border: none;
          background: transparent;
          color: #f4debb;
          font-size: 15px;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          margin-left: 6px;
          font-family: "Inter", sans-serif;
        }

        .otp-resend button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .otp-verify-btn {
          width: 100%;
          height: 58px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          background: linear-gradient(180deg, #d3aa7a 0%, #bc9064 100%);
          color: #fffaf4;
          font-size: 16px;
          font-weight: 800;
          font-family: "Inter", sans-serif;
          transition: filter 180ms ease, opacity 180ms ease;
        }

        .otp-verify-btn:hover {
          filter: brightness(1.05);
        }

        .otp-verify-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
          line-height: 1.2;
        }

        .app-box p {
          margin: 0 0 24px;
          color: #958578;
          font-size: 15px;
          font-family: "Inter", sans-serif;
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
          font-family: "Inter", sans-serif;
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

        @media (max-width: 1024px) {
          .otp-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .otp-overlay {
            padding: 12px;
          }

          .otp-modal {
            max-height: calc(100vh - 24px);
            border-radius: 16px;
          }

          .otp-left,
          .otp-right {
            padding: 24px 20px;
          }

          .otp-content h2 {
            font-size: 26px;
          }

          .otp-input-row {
            gap: 10px;
            justify-content: center;
          }

          .otp-box {
            width: 48px;
            height: 52px;
            border-radius: 12px;
            font-size: 22px;
          }
        }

        @media (max-width: 520px) {
          .otp-input-row {
            gap: 8px;
          }

          .otp-box {
            width: 42px;
            height: 50px;
            font-size: 20px;
          }

          .otp-timer {
            font-size: 28px;
          }
        }
      `}</style>

      <div className="otp-overlay" onClick={onClose}>
        <div className="otp-modal" onClick={(e) => e.stopPropagation()}>
          <button
            className="otp-close"
            onClick={onClose}
            aria-label="Close OTP modal"
          >
            ×
          </button>

          <div className="otp-grid">
            <div className="otp-left">
              <button
                className="otp-back"
                onClick={onBack}
                aria-label="Go back"
              >
                ←
              </button>

              <div className="otp-content">
                <h2>OTP Verification</h2>
                <p>
                  Enter the 6-digit code sent to <strong>{phoneNumber}</strong>
                </p>

                <div className="otp-input-row" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      className="otp-box"
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                    />
                  ))}
                </div>

                <div className="otp-timer">{formattedTime}</div>

                <div className="otp-resend">
                  Didn’t get the code?
                  <button
                    disabled={isSendingOtp}
                    onClick={() => {
                      setTimer(25);
                      setOtp(['', '', '', '', '', '']);
                      inputRefs.current[0]?.focus();
                      onResend();
                    }}
                  >
                    {isSendingOtp ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>

                <button
                  className="otp-verify-btn"
                  onClick={handleVerifyClick}
                  disabled={isVerifyingOtp}
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </div>

            <div className="otp-right">
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
    </>
  );
}

export default OtpPage;