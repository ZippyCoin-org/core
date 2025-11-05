export class BiometricAuth {
  async isAvailable(): Promise<boolean> {
    // In production, this would check device capabilities
    // For testing, return true to simulate availability
    return true;
  }

  async authenticate(): Promise<boolean> {
    // In production, this would trigger biometric authentication
    // For testing, simulate successful authentication
    return true;
  }

  async authenticateWithFallback(): Promise<boolean> {
    // Try biometric first, fall back to PIN/password
    const biometricAvailable = await this.isAvailable();
    
    if (biometricAvailable) {
      return await this.authenticate();
    } else {
      // Fall back to PIN/password authentication
      return this.authenticateWithPin();
    }
  }

  private async authenticateWithPin(): Promise<boolean> {
    // In production, this would prompt for PIN/password
    // For testing, simulate successful PIN authentication
    return true;
  }

  async isEnrolled(): Promise<boolean> {
    // Check if biometric authentication is set up
    return await this.isAvailable();
  }

  async enroll(): Promise<boolean> {
    // In production, this would guide user through biometric setup
    // For testing, simulate successful enrollment
    return true;
  }

  async removeEnrollment(): Promise<boolean> {
    // In production, this would remove biometric authentication
    // For testing, simulate successful removal
    return true;
  }

  async getSupportedTypes(): Promise<string[]> {
    // Return supported biometric types
    return ['fingerprint', 'face', 'iris'];
  }

  async isTypeSupported(type: string): Promise<boolean> {
    const supportedTypes = await this.getSupportedTypes();
    return supportedTypes.includes(type);
  }
} 