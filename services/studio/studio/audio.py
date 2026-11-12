"""Sound, synthesised from scratch with numpy — no samples, no stock audio.

A clip's soundtrack is a list of timed events (bell "tings" synced to sparkles,
a whoosh as a lid lifts, a soft thump as a chain lands) laid over a warm music
bed. Everything is written to a 16-bit stereo WAV that ffmpeg muxes in.
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 44100


def _env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def bell(freq: float, dur: float = 1.6, amp: float = 0.3) -> np.ndarray:
    """Inharmonic partials give a glassy, jewel-like ring."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, a, dk in ((1.0, 1.0, 0.9), (2.76, 0.45, 0.35), (5.40, 0.25, 0.18), (8.93, 0.12, 0.09)):
        out += a * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (dk * dur))
    return amp * out * _env(n, 0.002, 10)


def ting(amp=0.22) -> np.ndarray:
    """The sparkle: two very high bells a few cents apart."""
    a = bell(2637, 0.9, amp)
    b = bell(3520 * 1.003, 0.6, amp * 0.6)
    a[: len(b)] += b
    return a


def whoosh(dur=0.9, amp=0.25, rising=True) -> np.ndarray:
    n = int(dur * SR)
    rng = np.random.default_rng(3)
    noise = rng.normal(0, 1, n)
    # sweep a one-pole low-pass cutoff across the duration
    cut = np.linspace(0.02, 0.35, n) if rising else np.linspace(0.35, 0.02, n)
    y = np.zeros(n)
    acc = 0.0
    for i in range(n):
        acc += cut[i] * (noise[i] - acc)
        y[i] = acc
    shape = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return amp * y / (np.abs(y).max() + 1e-9) * shape


def thump(amp=0.35) -> np.ndarray:
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 110 * np.exp(-t * 9) + 45
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def music_bed(dur: float, bpm: float = 96, root: float = 220.0, amp: float = 0.12, seed: int = 0) -> np.ndarray:
    """A slow, warm progression (i–VI–III–VII) with a bell arpeggio on top."""
    n = int(dur * SR)
    out = np.zeros(n)
    beat = 60 / bpm
    bar = beat * 4
    # minor-key progression in semitones from the root
    prog = [(0, 3, 7), (-4, 0, 3), (3, 7, 10), (-2, 2, 5)]
    t_all = np.arange(n) / SR
    for b in range(int(dur / bar) + 1):
        chord = prog[b % len(prog)]
        s, e = int(b * bar * SR), min(n, int((b + 1) * bar * SR + 0.6 * SR))
        if s >= n:
            break
        t = t_all[s:e] - b * bar
        seg = np.zeros(e - s)
        for semi in chord:
            f = root * 2 ** (semi / 12)
            for det in (-0.004, 0.004):  # slight detune = lush pad
                seg += np.sin(2 * np.pi * f * (1 + det) * t) * 0.18
            seg += np.sin(2 * np.pi * f / 2 * t) * 0.12
        fade = np.clip(t / 0.5, 0, 1) * np.clip((bar + 0.6 - t) / 0.6, 0, 1)
        out[s:e] += seg * fade
        # arpeggio: eighth notes, one octave up
        rng = np.random.default_rng(seed + b)
        for k in range(8):
            if rng.random() < 0.25:
                continue
            semi = chord[k % 3] + 12 * (1 + (k // 3) % 2)
            note = bell(root * 2 ** (semi / 12), 1.2, 0.35)
            st = s + int(k * beat / 2 * SR)
            en = min(n, st + len(note))
            if st < n:
                out[st:en] += note[: en - st]
    # fade in/out of the whole bed
    fi, fo = int(0.4 * SR), int(0.8 * SR)
    out[:fi] *= np.linspace(0, 1, fi)
    out[-fo:] *= np.linspace(1, 0, fo)
    return amp * out


class Mix:
    def __init__(self, dur: float):
        self.n = int(dur * SR)
        self.l = np.zeros(self.n)
        self.r = np.zeros(self.n)

    def add(self, sig: np.ndarray, at: float, pan: float = 0.0):
        s = int(at * SR)
        if s >= self.n:
            return
        e = min(self.n, s + len(sig))
        gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        self.l[s:e] += sig[: e - s] * gl
        self.r[s:e] += sig[: e - s] * gr

    def write(self, path: Path):
        st = np.stack([self.l, self.r], axis=1)
        st = np.tanh(st * 1.4) / np.tanh(1.4)  # soft limiter
        peak = np.abs(st).max()
        if peak > 0.95:
            st *= 0.95 / peak
        pcm = (st * 32767).astype(np.int16)
        with wave.open(str(path), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
