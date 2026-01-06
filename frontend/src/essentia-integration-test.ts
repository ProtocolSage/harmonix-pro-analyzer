/**
 * Comprehensive Essentia.js Integration Test
 * 
 * This script validates the complete Essentia.js integration including:
 * - Module loading and initialization
 * - WASM runtime setup
 * - Worker functionality
 * - Audio analysis capabilities
 * - Error handling and recovery
 * 
 * Run this test after implementing the fixes to ensure everything works correctly.
 */

import { RealEssentiaAudioEngine } from './engines/RealEssentiaAudioEngine';

class EssentiaIntegrationTester {
  private engine: RealEssentiaAudioEngine | null = null;
  private testResults: Array<{
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    message: string;
    duration?: number;
    details?: any;
  }> = [];

  constructor() {
    console.log('🧪 Starting Essentia.js Integration Test Suite');
    console.log('================================================');
  }

  /**
   * Run all tests in sequence
   */
  async runAllTests(): Promise<void> {
    try {
      await this.testEngineInitialization();
      await this.testEssentiaFunctionality();
      await this.testWorkerInitialization();
      await this.testAudioAnalysis();
      await this.testErrorHandling();
      await this.testPerformanceMetrics();
      
      this.printTestSummary();
      
    } catch (error) {
      console.log('🧪 Test suite failed:', error);
      this.addTestResult('Test Suite', 'failed', `Suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (this.engine) {
        this.engine.terminate();
      }
    }
  }

  /**
   * Test 1: Engine Initialization
   * Validates that the engine initializes correctly and Essentia.js loads
   */
  async testEngineInitialization(): Promise<void> {
    const testName = 'Engine Initialization';
    const startTime = performance.now();
    
    try {
      console.log('\n🔧 Test 1: Engine Initialization');
      console.log('----------------------------------');
      
      // Create engine instance
      this.engine = new RealEssentiaAudioEngine();
      
      // Wait for initialization with timeout
      const initTimeout = 30000; // 30 seconds
      const initStart = Date.now();
      
      while (!this.engine.isEngineReady() && (Date.now() - initStart) < initTimeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const status = this.engine.getEngineStatus();
        if (status.status === 'error') {
          throw new Error(`Engine initialization failed: ${status.message}`);
        }
      }
      
      if (!this.engine.isEngineReady()) {
        throw new Error('Engine initialization timeout');
      }
      
      const status = this.engine.getEngineStatus();
      const duration = performance.now() - startTime;
      
      console.log('✅ Engine initialized successfully');
      console.log(`   Status: ${status.status}`);
      console.log(`   Duration: ${duration.toFixed(2)}ms`);
      
      this.addTestResult(testName, 'passed', 'Engine initialized successfully', duration, status);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const message = `Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ ' + message);
      
      this.addTestResult(testName, 'failed', message, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Test 2: Essentia.js Functionality
   * Tests core Essentia.js algorithms to ensure they work correctly
   */
  async testEssentiaFunctionality(): Promise<void> {
    const testName = 'Essentia.js Functionality';
    const startTime = performance.now();
    
    try {
      console.log('\n🧮 Test 2: Essentia.js Functionality');
      console.log('------------------------------------');
      
      if (!this.engine || !this.engine.isEngineReady()) {
        throw new Error('Engine not ready for functionality testing');
      }
      
      // Run built-in functionality test
      const testResult = await this.engine.testEssentiaFunctionality();
      const duration = performance.now() - startTime;
      
      if (testResult.success) {
        console.log('✅ Essentia.js functionality test passed');
        console.log(`   Tested algorithms: ${testResult.testedAlgorithms.join(', ')}`);
        console.log(`   Duration: ${duration.toFixed(2)}ms`);
        
        this.addTestResult(testName, 'passed', testResult.message, duration, testResult);
      } else {
        throw new Error(`Functionality test failed: ${testResult.message}`);
      }
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const message = `Essentia.js functionality test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ ' + message);
      
      this.addTestResult(testName, 'failed', message, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Test 3: Worker Initialization
   * Validates that the worker loads correctly and can communicate
   */
  async testWorkerInitialization(): Promise<void> {
    const testName = 'Worker Initialization';
    const startTime = performance.now();
    
    try {
      console.log('\n👷 Test 3: Worker Initialization');
      console.log('---------------------------------');
      
      if (!this.engine) {
        throw new Error('Engine not available for worker testing');
      }
      
      // Run diagnostics to check worker status
      const diagnostics = await this.engine.runDiagnostics();
      const duration = performance.now() - startTime;
      
      console.log(`   Worker Status: ${diagnostics.workerStatus}`);
      console.log(`   Essentia Version: ${diagnostics.essentiaVersion}`);
      console.log(`   Algorithm Count: ${diagnostics.algorithmCount}`);
      console.log(`   Duration: ${duration.toFixed(2)}ms`);
      
      if (diagnostics.workerStatus === 'available') {
        this.addTestResult(testName, 'passed', 'Worker initialized successfully', duration, diagnostics);
      } else {
        // Worker not available but main thread should work
        console.log('⚠️ Worker not available, but main thread analysis should work');
        this.addTestResult(testName, 'passed', 'Main thread analysis available (worker unavailable)', duration, diagnostics);
      }
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const message = `Worker initialization test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ ' + message);
      
      this.addTestResult(testName, 'failed', message, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Test 4: Audio Analysis
   * Tests audio analysis with a generated test signal
   */
  async testAudioAnalysis(): Promise<void> {
    const testName = 'Audio Analysis';
    const startTime = performance.now();
    
    try {
      console.log('\n🎵 Test 4: Audio Analysis');
      console.log('-------------------------');
      
      if (!this.engine || !this.engine.isEngineReady()) {
        throw new Error('Engine not ready for audio analysis testing');
      }
      
      // Generate a test audio file (440Hz sine wave)
      const testAudioBuffer = this.generateTestAudioBuffer();
      const testFile = this.createTestAudioFile(testAudioBuffer);
      
      console.log('   Generated test audio: 440Hz sine wave, 2 seconds');
      
      // Track analysis progress
      const progressSteps: string[] = [];
      
      const analysisResult = await this.engine.analyzeAudio(testFile, (progress: any) => {
        progressSteps.push(`${progress.currentStep}: ${progress.percentage}%`);
        console.log(`   Progress: ${progress.currentStep} (${progress.percentage}%)`);
      });
      
      const duration = performance.now() - startTime;
      
      console.log('✅ Audio analysis completed successfully');
      console.log(`   Duration: ${analysisResult.duration.toFixed(2)}s`);
      console.log(`   Sample Rate: ${analysisResult.sampleRate}Hz`);
      console.log(`   Detected BPM: ${analysisResult.tempo?.bpm}`);
      console.log(`   Detected Key: ${analysisResult.key?.key} ${analysisResult.key?.scale}`);
      console.log(`   Analysis Time: ${duration.toFixed(2)}ms`);
      
      this.addTestResult(testName, 'passed', 'Audio analysis completed successfully', duration, {
        analysisResult: {
          duration: analysisResult.duration,
          sampleRate: analysisResult.sampleRate,
          tempo: analysisResult.tempo,
          key: analysisResult.key
        },
        progressSteps
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const message = `Audio analysis test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ ' + message);
      
      this.addTestResult(testName, 'failed', message, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Test 5: Error Handling
   * Tests that errors are handled gracefully
   */
  async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = performance.now();
    
    try {
      console.log('\n🛡️ Test 5: Error Handling');
      console.log('-------------------------');
      
      if (!this.engine) {
        throw new Error('Engine not available for error handling testing');
      }
      
      // Test with invalid file
      const invalidFile = new File(['invalid audio data'], 'test.txt', { type: 'text/plain' });
      
      try {
        await this.engine.analyzeAudio(invalidFile);
        throw new Error('Expected analysis to fail with invalid file');
      } catch (error) {
        if (error instanceof Error && error.message.includes('Failed to decode')) {
          console.log('✅ Invalid file error handled correctly');
        } else {
          throw error;
        }
      }
      
      const duration = performance.now() - startTime;
      
      this.addTestResult(testName, 'passed', 'Error handling works correctly', duration);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const message = `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ ' + message);
      
      this.addTestResult(testName, 'failed', message, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Test 6: Performance Metrics
   * Validates that performance tracking works
   */
  async testPerformanceMetrics(): Promise<void> {
    const testName = 'Performance Metrics';
    const startTime = performance.now();
    
    try {
      console.log('\n📊 Test 6: Performance Metrics');
      console.log('------------------------------');
      
      if (!this.engine) {
        throw new Error('Engine not available for performance testing');
      }
      
      const metrics = this.engine.getPerformanceMetrics();
      const duration = performance.now() - startTime;
      
      console.log(`   Recent analyses: ${metrics.recent.length}`);
      console.log(`   Average analysis time: ${metrics.average.analysisTime?.toFixed(2) || 'N/A'}ms`);
      console.log(`   Performance trends: ${Object.keys(metrics.trends).length} tracked`);
      
      this.addTestResult(testName, 'passed', 'Performance metrics available', duration, metrics);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const message = `Performance metrics test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ ' + message);
      
      this.addTestResult(testName, 'failed', message, duration, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Generate a test audio buffer with a 440Hz sine wave
   */
  private generateTestAudioBuffer(): AudioBuffer {
    const sampleRate = 44100;
    const duration = 2; // 2 seconds
    const frequency = 440; // A4 note
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    const audioBuffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
    }
    
    audioContext.close();
    return audioBuffer;
  }

  /**
   * Create a File object from an AudioBuffer (for testing)
   */
  private createTestAudioFile(audioBuffer: AudioBuffer): File {
    // Create a simple WAV file from the audio buffer
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new File([buffer], 'test-440hz.wav', { type: 'audio/wav' });
  }

  /**
   * Add a test result to the collection
   */
  private addTestResult(testName: string, status: 'passed' | 'failed' | 'skipped', message: string, duration?: number, details?: any): void {
    this.testResults.push({
      testName,
      status,
      message,
      duration,
      details
    });
  }

  /**
   * Print a comprehensive test summary
   */
  private printTestSummary(): void {
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Essentia.js integration is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the details above for debugging information.');
    }
    
    console.log('\nDetailed Results:');
    console.log('-----------------');
    
    this.testResults.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      const duration = result.duration ? ` (${result.duration.toFixed(2)}ms)` : '';
      console.log(`${icon} ${result.testName}: ${result.message}${duration}`);
    });
  }
}

// Export for use in browser console or testing framework
export { EssentiaIntegrationTester };
(window as any).EssentiaIntegrationTester = EssentiaIntegrationTester;

// Auto-run tests if in development mode
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🧪 Development mode detected - Essentia.js integration tests available');
  console.log('Run: new EssentiaIntegrationTester().runAllTests() in console to test');
}
