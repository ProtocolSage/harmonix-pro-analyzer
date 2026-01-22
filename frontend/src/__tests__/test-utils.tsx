import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';

import { PlaybackProvider } from '../contexts/PlaybackContext';
import { LibraryProvider } from '../contexts/LibraryContext';
import { AnalysisProvider } from '../contexts/AnalysisContext';

function AllProviders({ children }: PropsWithChildren) {
    return (
        <LibraryProvider disableAutoLoad>
            <PlaybackProvider>
                <AnalysisProvider>{children}</AnalysisProvider>
            </PlaybackProvider>
        </LibraryProvider>
    );
}

export function renderWithProviders(
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { wrapper: AllProviders, ...options });
}
