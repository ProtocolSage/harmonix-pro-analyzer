import { validateMagicBytes } from '../utils/fileValidation';

const getValidMP3Bytes = () => new Uint8Array([0xFF, 0xFB, 0x90, 0x00]);
const getValidWAVBytes = () => new Uint8Array([0x52, 0x49, 0x46, 0x46]);

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '../components/FileUpload';
import '@testing-library/jest-dom';

describe('FileUpload Security Tests', () => {
  let mockOnFileSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFileSelect = vi.fn();
  });

  describe('File Type Validation', () => {
    it('should accept valid audio MIME types', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const validMimeTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/flac',
        'audio/ogg',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
      ];

      for (const mimeType of validMimeTypes) {
        const file = new File([getValidMP3Bytes()], 'test.mp3', { type: mimeType });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });

        fireEvent.change(input);
        await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
        mockOnFileSelect.mockClear();
      }
    });

    it('should reject invalid MIME types', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const invalidMimeTypes = [
        { type: 'video/mp4', name: 'video.mp4' },
        { type: 'image/png', name: 'image.png' },
        { type: 'application/pdf', name: 'document.pdf' },
        { type: 'text/plain', name: 'text.txt' },
        { type: 'application/x-executable', name: 'malware.exe' },
      ];

      for (const { type, name } of invalidMimeTypes) {
        const file = new File([getValidMP3Bytes()], name, { type });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });

        fireEvent.change(input);
        await waitFor(() => expect(mockOnFileSelect).not.toHaveBeenCalled());
      }
    });

    it('should accept files with valid extensions even if MIME type is missing', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const validExtensions = ['test.mp3', 'test.wav', 'test.flac', 'test.aiff', 'test.ogg'];

      for (const filename of validExtensions) {
        const file = new File([getValidMP3Bytes()], filename, { type: '' });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });

        fireEvent.change(input);
        await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
        mockOnFileSelect.mockClear();
      }
    });

    it('should reject files with mismatched extension and MIME type (SECURITY)', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      // Malicious file disguised as audio
      const file = new File(['malicious content'], 'malware.mp3', { type: 'application/x-executable' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      // Should reject because MIME type is not audio
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });

  describe('File Size Validation', () => {
    it('should accept files under 100MB', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      // Create 50MB file
      const size = 50 * 1024 * 1024;
      const file = new File([getValidMP3Bytes()], 'test.mp3', { type: 'audio/mpeg' });

      Object.defineProperty(file, 'size', { value: size, configurable: true });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
    });

    it('should reject files over 100MB', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      // Create 150MB file
      const size = 150 * 1024 * 1024;
      const file = new File([getValidMP3Bytes()], 'large.mp3', { type: 'audio/mpeg' });

      Object.defineProperty(file, 'size', { value: size, configurable: true });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should warn for files over 50MB but under 100MB', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const size = 75 * 1024 * 1024;
      const file = new File([getValidMP3Bytes()], 'large.mp3', { type: 'audio/mpeg' });

      Object.defineProperty(file, 'size', { value: size, configurable: true });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.queryByText(/Large file detected/i)).toBeInTheDocument();
      });
    });

    it('should handle zero-byte files', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const file = new File([], 'empty.mp3', { type: 'audio/mpeg' });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      // Should still accept (backend will handle invalid audio)
      await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
    });
  });

  describe('Magic Byte Validation (SECURITY GAP - TODO)', () => {
    // These tests document the security gap identified in the audit
    // Magic byte validation is not currently implemented

    it('should validate MP3 magic bytes (SECURITY TODO)', async () => {
      // MP3 files should start with ID3 or 0xFF 0xFB
      // Current implementation: NOT VALIDATED
      // Risk: Malicious files can be disguised as MP3

      const validMP3Header = new Uint8Array([0xFF, 0xFB, 0x90, 0x00]);
      const file = new File([validMP3Header], 'valid.mp3', { type: 'audio/mpeg' });

      // TODO: Implement magic byte validation
      expect(await validateMagicBytes(file)).toBe(true);
    });

    it('should reject files with invalid magic bytes (SECURITY TODO)', async () => {
      // File claims to be MP3 but has EXE magic bytes (MZ)
      const exeHeader = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]);
      const file = new File([exeHeader], 'malware.mp3', { type: 'audio/mpeg' });

      // TODO: Implement magic byte validation
      expect(await validateMagicBytes(file)).toBe(false);
    });

    it('should validate WAV magic bytes (SECURITY TODO)', async () => {
      // WAV files should start with RIFF....WAVE
      const validWAVHeader = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x57, 0x41, 0x56, 0x45, // WAVE
      ]);
      const file = new File([validWAVHeader], 'valid.wav', { type: 'audio/wav' });

      // TODO: Implement magic byte validation
      expect(await validateMagicBytes(file)).toBe(true);
    });
  });

  describe('Filename Validation', () => {
    it('should warn for filenames with spaces', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const file = new File([getValidMP3Bytes()], 'my audio file.mp3', { type: 'audio/mpeg' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.queryByText(/Filename contains spaces/i)).toBeInTheDocument();
      });
    });

    it('should handle very long filenames', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const longName = 'a'.repeat(255) + '.mp3';
      const file = new File([getValidMP3Bytes()], longName, { type: 'audio/mpeg' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
    });

    it('should handle special characters in filename', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const specialNames = [
        'test<script>.mp3',
        'test&file.mp3',
        'test"quote".mp3',
        "test'single.mp3",
        'test;semicolon.mp3',
      ];

      for (const name of specialNames) {
        const file = new File([getValidMP3Bytes()], name, { type: 'audio/mpeg' });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });

        fireEvent.change(input);
        await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
        mockOnFileSelect.mockClear();
      }
    });
  });

  describe('Drag and Drop Security', () => {
    it('should only accept files when engine is ready', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={false} />
      );

      const file = new File([getValidMP3Bytes()], 'test.mp3', { type: 'audio/mpeg' });
      const dropZone = container.querySelector('.hp-dropzone') as HTMLElement;

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [file],
        },
      });

      fireEvent(dropZone, dropEvent);
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should prevent file upload when processing', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={true} engineReady={true} />
      );

      const file = new File([getValidMP3Bytes()], 'test.mp3', { type: 'audio/mpeg' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      // Component should be disabled during processing
      expect(input.disabled).toBe(true);
    });

    it('should handle multiple files in drop (only process first)', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const files = [
        new File([getValidMP3Bytes()], 'test1.mp3', { type: 'audio/mpeg' }),
        new File([getValidMP3Bytes()], 'test2.mp3', { type: 'audio/mpeg' }),
        new File([getValidMP3Bytes()], 'test3.mp3', { type: 'audio/mpeg' }),
      ];

      const dropZone = container.querySelector('.hp-dropzone') as HTMLElement;
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files },
      });

      fireEvent(dropZone, dropEvent);

      // Should only process first file
      await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledTimes(1));
      expect(mockOnFileSelect).toHaveBeenCalledWith(files[0]);
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    it('should handle null file objects', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: null,
        configurable: true,
      });

      fireEvent.change(input);
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should handle file with malformed MIME type', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const file = new File([getValidMP3Bytes()], 'test.mp3', { type: 'audio/mpeg; charset=utf-8; <script>' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      // Should still validate based on extension
      await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalled());
    });

    it('should handle file with path traversal in name (SECURITY)', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const maliciousNames = [
        '../../../etc/passwd.mp3',
        '..\\..\\..\\windows\\system32\\config.mp3',
        './../../sensitive.mp3',
      ];

      for (const name of maliciousNames) {
        const file = new File([getValidMP3Bytes()], name, { type: 'audio/mpeg' });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });

        fireEvent.change(input);
        // Should still accept (filename is sanitized by browser)
        // But backend should validate path
        await waitFor(() => expect(mockOnFileSelect).toHaveBeenCalledWith(file));
        mockOnFileSelect.mockClear();
      }
    });

    it('should handle extremely large file sizes (overflow)', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      // Test with MAX_SAFE_INTEGER
      const size = Number.MAX_SAFE_INTEGER;
      const file = new File([getValidMP3Bytes()], 'huge.mp3', { type: 'audio/mpeg' });

      Object.defineProperty(file, 'size', { value: size, configurable: true });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });

  describe('Compression Format Warnings', () => {
    it('should warn for lossy formats', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const file = new File([getValidMP3Bytes()], 'test.mp3', { type: 'audio/mpeg' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.queryByText(/Compressed audio detected/i)).toBeInTheDocument();
      });
    });

    it('should not warn for lossless formats', async () => {
      const { container } = render(
        <FileUpload onFileSelect={mockOnFileSelect} isProcessing={false} engineReady={true} />
      );

      const file = new File([getValidMP3Bytes()], 'test.wav', { type: 'audio/wav' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(input);

      expect(screen.queryByText(/Compressed audio detected/i)).not.toBeInTheDocument();
    });
  });
});
