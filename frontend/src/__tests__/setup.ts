import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// If any code path touches matchMedia:
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});

// Canvas API mock with transforms + common drawing calls.
const noop = () => { };
const gradient = { addColorStop: noop };

function make2dContext(): CanvasRenderingContext2D {
    const ctx: any = {
        canvas: Object.assign(document.createElement('canvas'), { width: 0, height: 0 }),

        // state
        globalAlpha: 1,
        lineWidth: 1,
        strokeStyle: '#000',
        fillStyle: '#000',
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,

        // lifecycle
        save: noop,
        restore: noop,

        // paths
        beginPath: noop,
        closePath: noop,
        moveTo: noop,
        lineTo: noop,
        rect: noop,
        arc: noop,
        clip: noop,

        // draw
        stroke: noop,
        fill: noop,
        clearRect: noop,
        fillRect: noop,
        strokeRect: noop,
        drawImage: noop,
        createImageData: (w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
        }),
        putImageData: noop,

        // transforms
        translate: noop,
        scale: noop,
        rotate: noop,
        transform: noop,
        setTransform: noop,
        resetTransform: noop,

        // text
        measureText: (_t: string) => ({ width: 0 }),
        fillText: noop,
        strokeText: noop,

        // styles
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        createPattern: () => null,
        setLineDash: noop,
        getLineDash: () => [],
    };

    return ctx as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') {
        return make2dContext();
    }
    return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Optional: if any renderer path uses OffscreenCanvas in tests
if (!(globalThis as any).OffscreenCanvas) {
    (globalThis as any).OffscreenCanvas = class {
        width: number;
        height: number;
        constructor(w: number, h: number) {
            this.width = w;
            this.height = h;
        }
        getContext(type: any) {
            return type === '2d' ? make2dContext() : null;
        }
    };
}

// Partial Web Audio API mock
class AudioContextMock {
    state = 'suspended';
    suspend = vi.fn();
    resume = vi.fn();
    close = vi.fn();
    createGain = vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: { value: 1, setValueAtTime: vi.fn() },
    }));
    createAnalyser = vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
        getFloatFrequencyData: vi.fn(),
    }));
    createChannelSplitter = vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
    }));
    destination = {};
    // Add other methods as needed
}

Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: AudioContextMock,
});

Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    value: AudioContextMock,
});
