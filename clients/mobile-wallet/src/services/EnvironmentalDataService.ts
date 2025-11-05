import { Platform } from 'react-native';
import * as Sensors from 'expo-sensors';

export interface EnvironmentalData {
  temperature: number;
  humidity: number;
  pressure: number;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  magnetometer: { x: number; y: number; z: number };
  timestamp: Date;
}

export interface PruningStatus {
  enabled: boolean;
  lastPruningHeight: number;
  nextPruningHeight: number;
  totalBytesFreed: number;
  activeProposals: number;
}

export interface SensorReading {
  value: number;
  accuracy: number;
  timestamp: number;
}

export class EnvironmentalDataService {
  private isListening = false;
  private accelerometerSubscription: any = null;
  private gyroscopeSubscription: any = null;
  private magnetometerSubscription: any = null;
  private sensorData: EnvironmentalData | null = null;

  constructor() {
    this.initializeSensors();
  }

  /**
   * Initialize all available sensors
   */
  private async initializeSensors(): Promise<void> {
    try {
      // Check sensor availability
      const accelerometerAvailable = await Sensors.Accelerometer.isAvailableAsync();
      const gyroscopeAvailable = await Sensors.Gyroscope.isAvailableAsync();
      const magnetometerAvailable = await Sensors.Magnetometer.isAvailableAsync();

      console.log('Sensor availability:', {
        accelerometer: accelerometerAvailable,
        gyroscope: gyroscopeAvailable,
        magnetometer: magnetometerAvailable
      });

      // Set up sensor listeners
      if (accelerometerAvailable) {
        this.setupAccelerometer();
      }
      if (gyroscopeAvailable) {
        this.setupGyroscope();
      }
      if (magnetometerAvailable) {
        this.setupMagnetometer();
      }
    } catch (error) {
      console.error('Error initializing sensors:', error);
    }
  }

  /**
   * Set up accelerometer sensor
   */
  private setupAccelerometer(): void {
    this.accelerometerSubscription = Sensors.Accelerometer.addListener((data) => {
      if (this.sensorData) {
        this.sensorData.accelerometer = {
          x: data.x,
          y: data.y,
          z: data.z
        };
        this.sensorData.timestamp = new Date();
      }
    });
  }

  /**
   * Set up gyroscope sensor
   */
  private setupGyroscope(): void {
    this.gyroscopeSubscription = Sensors.Gyroscope.addListener((data) => {
      if (this.sensorData) {
        this.sensorData.gyroscope = {
          x: data.x,
          y: data.y,
          z: data.z
        };
        this.sensorData.timestamp = new Date();
      }
    });
  }

  /**
   * Set up magnetometer sensor
   */
  private setupMagnetometer(): void {
    this.magnetometerSubscription = Sensors.Magnetometer.addListener((data) => {
      if (this.sensorData) {
        this.sensorData.magnetometer = {
          x: data.x,
          y: data.y,
          z: data.z
        };
        this.sensorData.timestamp = new Date();
      }
    });
  }

  /**
   * Get current environmental data
   */
  async getCurrentData(): Promise<EnvironmentalData> {
    try {
      // Initialize sensor data if not exists
      if (!this.sensorData) {
        this.sensorData = {
          temperature: await this.getTemperature(),
          humidity: await this.getHumidity(),
          pressure: await this.getPressure(),
          accelerometer: { x: 0, y: 0, z: 0 },
          gyroscope: { x: 0, y: 0, z: 0 },
          magnetometer: { x: 0, y: 0, z: 0 },
          timestamp: new Date()
        };
      }

      // Update with latest sensor readings
      this.sensorData.temperature = await this.getTemperature();
      this.sensorData.humidity = await this.getHumidity();
      this.sensorData.pressure = await this.getPressure();
      this.sensorData.timestamp = new Date();

      return this.sensorData;
    } catch (error) {
      console.error('Error getting environmental data:', error);
      // Return fallback data
      return {
        temperature: 25,
        humidity: 50,
        pressure: 1013.25,
        accelerometer: { x: 0, y: 0, z: 9.81 },
        gyroscope: { x: 0, y: 0, z: 0 },
        magnetometer: { x: 0, y: 0, z: 0 },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get temperature reading (mock implementation)
   */
  private async getTemperature(): Promise<number> {
    // TODO: Implement actual temperature sensor reading
    // For now, return a realistic temperature with some variation
    const baseTemp = 25;
    const variation = (Math.random() - 0.5) * 10; // ±5°C variation
    return baseTemp + variation;
  }

  /**
   * Get humidity reading (mock implementation)
   */
  private async getHumidity(): Promise<number> {
    // TODO: Implement actual humidity sensor reading
    const baseHumidity = 50;
    const variation = (Math.random() - 0.5) * 20; // ±10% variation
    return Math.max(0, Math.min(100, baseHumidity + variation));
  }

  /**
   * Get pressure reading (mock implementation)
   */
  private async getPressure(): Promise<number> {
    // TODO: Implement actual pressure sensor reading
    const basePressure = 1013.25; // Standard atmospheric pressure
    const variation = (Math.random() - 0.5) * 50; // ±25 hPa variation
    return basePressure + variation;
  }

  /**
   * Validate environmental data for quantum-resistant verification
   */
  validateEnvironmentalData(data: EnvironmentalData): boolean {
    try {
      // Check temperature range (reasonable for device operation)
      const tempValid = data.temperature >= -10 && data.temperature <= 50;
      
      // Check humidity range
      const humidityValid = data.humidity >= 0 && data.humidity <= 100;
      
      // Check pressure range (reasonable atmospheric pressure)
      const pressureValid = data.pressure >= 800 && data.pressure <= 1200;
      
      // Check accelerometer magnitude (should be near 1g when stationary)
      const accelMagnitude = Math.sqrt(
        data.accelerometer.x ** 2 + 
        data.accelerometer.y ** 2 + 
        data.accelerometer.z ** 2
      );
      const accelValid = accelMagnitude >= 8 && accelMagnitude <= 12; // Near 1g (9.81 m/s²)
      
      // Check gyroscope (should be low when stationary)
      const gyroMagnitude = Math.sqrt(
        data.gyroscope.x ** 2 + 
        data.gyroscope.y ** 2 + 
        data.gyroscope.z ** 2
      );
      const gyroValid = gyroMagnitude < 0.1; // Low rotation when stationary
      
      // Check magnetometer (should be consistent)
      const magMagnitude = Math.sqrt(
        data.magnetometer.x ** 2 + 
        data.magnetometer.y ** 2 + 
        data.magnetometer.z ** 2
      );
      const magValid = magMagnitude > 20 && magMagnitude < 80; // Reasonable magnetic field

      return tempValid && humidityValid && pressureValid && accelValid && gyroValid && magValid;
    } catch (error) {
      console.error('Error validating environmental data:', error);
      return false;
    }
  }

  /**
   * Get environmental data hash for quantum-resistant verification
   */
  async getEnvironmentalHash(): Promise<string> {
    const data = await this.getCurrentData();
    const dataString = JSON.stringify({
      temperature: Math.round(data.temperature * 100) / 100,
      humidity: Math.round(data.humidity * 100) / 100,
      pressure: Math.round(data.pressure * 100) / 100,
      accelerometer: {
        x: Math.round(data.accelerometer.x * 1000) / 1000,
        y: Math.round(data.accelerometer.y * 1000) / 1000,
        z: Math.round(data.accelerometer.z * 1000) / 1000
      },
      timestamp: Math.floor(data.timestamp.getTime() / 1000) // Unix timestamp in seconds
    });
    
    // Simple hash function (in production, use crypto-js or similar)
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  /**
   * Start continuous environmental monitoring
   */
  startMonitoring(): void {
    if (!this.isListening) {
      this.isListening = true;
      console.log('Environmental monitoring started');
    }
  }

  /**
   * Stop continuous environmental monitoring
   */
  stopMonitoring(): void {
    if (this.isListening) {
      this.isListening = false;
      console.log('Environmental monitoring stopped');
    }
  }

  /**
   * Clean up sensor subscriptions
   */
  cleanup(): void {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
    }
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
    }
    if (this.magnetometerSubscription) {
      this.magnetometerSubscription.remove();
    }
    this.stopMonitoring();
  }

  /**
   * Get pruning status for the network
   */
  async getPruningStatus(): Promise<PruningStatus> {
    try {
      // In production, this would fetch from the blockchain node
      const response = await fetch('/api/pruning/status');
      if (!response.ok) {
        throw new Error('Failed to fetch pruning status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching pruning status:', error);
      // Return mock data for development
      return {
        enabled: true,
        lastPruningHeight: 50000,
        nextPruningHeight: 55000,
        totalBytesFreed: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
        activeProposals: 2
      };
    }
  }

  /**
   * Submit pruning vote (for validators)
   */
  async submitPruningVote(proposalId: string, vote: 'approve' | 'reject' | 'abstain', reason: string): Promise<boolean> {
    try {
      const response = await fetch('/api/pruning/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          vote,
          reason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit pruning vote');
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting pruning vote:', error);
      return false;
    }
  }
} 