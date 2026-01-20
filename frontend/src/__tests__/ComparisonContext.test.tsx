import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ComparisonProvider, useComparison } from '../contexts/ComparisonContext';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ComparisonProvider>{children}</ComparisonProvider>
);

describe('ComparisonContext', () => {
  it('should initialize with empty slots', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    
    expect(result.current.state.source.status).toBe('empty');
    expect(result.current.state.reference.status).toBe('empty');
    expect(result.current.state.isComparisonMode).toBe(false);
  });

  it('should handle role swapping', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    
    const mockFile = new File([''], 'source.mp3', { type: 'audio/mpeg' });
    const mockData = { duration: 100 } as any;

    act(() => {
      result.current.dispatch({ 
        type: 'SET_SOURCE_FILE', 
        payload: { file: mockFile, audioId: 'source-1' } 
      });
      result.current.dispatch({ 
        type: 'SET_SOURCE_DATA', 
        payload: { data: mockData, cacheVersion: 'v1' } 
      });
    });

    expect(result.current.state.source.audioId).toBe('source-1');
    expect(result.current.state.reference.audioId).toBe(null);

    act(() => {
      result.current.swapRoles();
    });

    expect(result.current.state.source.audioId).toBe(null);
    expect(result.current.state.reference.audioId).toBe('source-1');
    expect(result.current.state.reference.analysisData).toEqual(mockData);
  });

  it('should debounce rapid swapping', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useComparison(), { wrapper });
    
    const mockFile = new File([''], 'test.mp3');
    act(() => {
        result.current.dispatch({ type: 'SET_SOURCE_FILE', payload: { file: mockFile, audioId: 'a' } });
    });

    // Advance to a non-zero time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
        result.current.swapRoles(); // 1st swap
    });
    expect(result.current.state.reference.audioId).toBe('a');

    act(() => {
        result.current.swapRoles(); // 2nd swap (should be blocked - same tick)
    });
    expect(result.current.state.reference.audioId).toBe('a'); // still in reference

    act(() => {
      vi.advanceTimersByTime(250);
    });

    act(() => {
        result.current.swapRoles(); // 3rd swap (should work)
    });
    expect(result.current.state.source.audioId).toBe('a');

    vi.useRealTimers();
  });
});
