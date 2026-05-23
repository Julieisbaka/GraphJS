# Sampling Plugin

## Package

- Workspace source: `extensions/sampling`
- Plugin id: `sampling`

## Description

Registers multiple downsampling methods into `Graph.samplers` for large-series rendering.

## Registered Samplers

- `lttb` (Largest-Triangle-Three-Buckets)
- `m4` (min/max per bucket style)
- `rdp` (Ramer-Douglas-Peucker)
- `ltd` (Largest-Triangle-Dynamic)
- `ltob` (Largest-Triangle-One-Bucket)
- `sma` (Simple Moving Average)

## Install Behavior

- On install, each sampler is registered globally through `graph.constructor.registerSampler(name, fn)`.
- No plugin commands are registered.

## Parameters and Outputs

Each sampler function uses:
- Parameters:
  - `points: Array<{x:number,y:number}>`
  - `maxPoints: number`
- Output:
  - Downsampled point array

## Shared Helpers

From `extensions/sampling/common.js`:
- `triangleArea(a, b, c)`
- `splitBuckets(points, n)`

## Version Metadata

- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No
- Notable changes: none documented in root changelog

## Use Cases

- High-frequency time series rendering.
- Preserving shape while reducing draw cost.

## Best Practices

- Pick sampler by data shape goals:
  - `lttb`/`ltd` for preserving visual trend.
  - `m4` for preserving extrema.
  - `sma` for smoothing noise.
  - `rdp` for line simplification.
- Pair sampler choice with domain-appropriate `maxPoints`.

## Internal Changes Over Time

Source: `extensions/sampling/CHANGELOG.md`

- `0.0.1` (2026-05-23): Initial runtime release with six samplers (`lttb`, `m4`, `rdp`, `ltd`, `ltob`, `sma`) and shared `./common` helpers.

No later versions are currently published for this extension, so no runtime evolution entries exist yet.
