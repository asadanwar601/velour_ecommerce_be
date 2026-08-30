export function generateAuthOtpHtml(
  otpCode: string,
  firstName?: string,
  brandName = 'VELOUR'
): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 40px 20px; background-color: #fcfbf9; color: #1c1917;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 400; letter-spacing: 3px; text-transform: uppercase; margin: 0;">${brandName}</h1>
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #967444; margin-top: 4px;">Atelier Security & Verification</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 4px; padding: 32px 28px; text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 8px;">
          ${firstName ? `Welcome to ${brandName}, ${firstName}` : `Verify Your ${brandName} Account`}
        </h2>
        <p style="font-size: 13px; color: #57534e; line-height: 1.5; margin-bottom: 24px;">
          Please enter the secure 6-digit one-time passcode below to verify your email address and activate your atelier privileges.
        </p>

        <div style="background-color: #faf8f5; border: 1px dashed #b38b4d; border-radius: 4px; padding: 18px; margin: 0 auto 24px; max-width: 260px;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1c1917;">
            ${otpCode}
          </span>
        </div>

        <p style="font-size: 12px; color: #78716c; line-height: 1.5; margin: 0;">
          This passcode will expire in <strong>10 minutes</strong>. If you did not request this verification, please disregard this transmission.
        </p>
      </div>

      <p style="font-size: 11px; color: #a8a29e; text-align: center; line-height: 1.5;">
        ${brandName} Atelier · High Fashion Identity & Data Protection
      </p>
    </div>
  `;
}
