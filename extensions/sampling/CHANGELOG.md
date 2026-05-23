# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-05-23

### Added

- Initial release of the sampling extension.
- `lttb` sampler – Largest-Triangle-Three-Buckets downsampling.
- `m4` sampler – MinMax (min-max / max-min) downsampling.
- `rdp` sampler – Ramer–Douglas–Peucker line simplification.
- `ltd` sampler – Largest-Triangle-Dynamic downsampling.
- `ltob` sampler – Largest-Triangle-One-Bucket downsampling.
- `sma` sampler – Simple Moving Average downsampling.
- `./common` subpackage exporting shared helpers (`triangleArea`, `splitBuckets`) used by LTTB, LTD, LTOB, and M4.
