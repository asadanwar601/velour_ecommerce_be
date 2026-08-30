export interface IOtpProvider {
  /**
   * Send an OTP code to a recipient identifier (email or phone).
   * @param to Recipient destination (email address or phone number in E.164)
   * @param code 6-digit OTP string
   * @returns Promise resolving to true if sent successfully
   */
  sendOtp(to: string, code: string): Promise<boolean>;
}
