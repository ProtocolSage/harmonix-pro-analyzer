import { fireEvent, render, screen } from '@testing-library/react';
import { BottomDock } from '../components/shell/BottomDock';

describe('BottomDock fallback controls', () => {
  it('calls repeat handler on click', () => {
    const onRepeat = vi.fn();
    render(<BottomDock onRepeat={onRepeat} />);
    const repeatBtn = screen.getByTitle('Repeat');
    fireEvent.click(repeatBtn);
    expect(onRepeat).toHaveBeenCalled();
  });
});
