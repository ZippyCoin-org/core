export class StorageService {
  private static hasWalletFlag = false;
  private static biometricEnabled = false;

  static async hasWallet(): Promise<boolean> {
    return StorageService.hasWalletFlag;
  }

  static async setHasWallet(val: boolean) {
    StorageService.hasWalletFlag = val;
  }

  static async getBiometricEnabled(): Promise<boolean> {
    return StorageService.biometricEnabled;
  }

  static async setBiometricEnabled(val: boolean) {
    StorageService.biometricEnabled = val;
  }
} 