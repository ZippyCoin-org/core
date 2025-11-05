export class PriceService {
  static async getCurrentPrice(): Promise<{ price: number; change24h: number }> {
    return { price: 0.01, change24h: 0 };
  }
} 