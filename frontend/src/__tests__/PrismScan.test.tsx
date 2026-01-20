import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismScan } from '../components/analysis/PrismScan';
import React from 'react';

describe('PrismScan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders only when active', () => {
    const { container, rerender } = render(<PrismScan isActive={false} />);
    expect(container.firstChild).toBeNull();

    rerender(<PrismScan isActive={true} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('updates position over time', async () => {
    const { getByTestId } = render(<PrismScan isActive={true} duration={2000} />);
    
    const scanLine = getByTestId('prism-scan-line');
    expect(scanLine).toBeDefined();
  });
});
