import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CountersunkWell } from '../components/shell/CountersunkWell';
import React from 'react';

describe('CountersunkWell', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <CountersunkWell>
        <div>Test Content</div>
      </CountersunkWell>
    );
    expect(getByText('Test Content')).toBeDefined();
  });

  it('applies the countersunk-well class', () => {
    const { container } = render(
      <CountersunkWell>
        <div>Content</div>
      </CountersunkWell>
    );
    expect(container.firstChild).toHaveClass('countersunk-well');
  });

  it('renders label and icon when provided', () => {
    const { getByText, container } = render(
      <CountersunkWell label="Spectral" icon={<span data-testid="test-icon" />}>
        <div>Content</div>
      </CountersunkWell>
    );
    expect(getByText('Spectral')).toBeDefined();
    expect(container.querySelector('[data-testid="test-icon"]')).toBeDefined();
  });
});
