# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0-alpha.2](https://github.com/yeskiy/prpcow/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2023-03-15)


### Bug Fixes

* Remove winston ([8117ac8](https://github.com/yeskiy/prpcow/commit/8117ac81bdebed8607efb7475126736c8e12249e))

## [2.0.0-alpha.1](https://github.com/yeskiy/prpcow/compare/v2.0.0-alpha.0...v2.0.0-alpha.1) (2023-03-14)


### Bug Fixes

* Fix build types ([22c7ce1](https://github.com/yeskiy/prpcow/commit/22c7ce1174c679f6b5573111ae068895480f4b3f))
* WFP Clean function when request is failed ([c32f888](https://github.com/yeskiy/prpcow/commit/c32f88882d5f66de16dda726d1c65d3860b931f5))

## [2.0.0-alpha.0](https://github.com/yeskiy/prpcow/compare/v1.1.3...v2.0.0-alpha.0) (2023-03-13)


### ⚠ BREAKING CHANGES

* Code is mostly changed. Client and Server are now Separated. Added ability to use `CompressResolvers`. Moved logger from `console.log` to `winston`. Buffer Polyfills are now integrated. `stream-browserify` installed only for logger support, but it could be used for adding streams on web. `WeakFunctionPool` is still badly cleaning unused functions
* Moved tests (and jest) to another folder
* Fully changed tsconfig

### Features

* Added types into dist build ([6dcd971](https://github.com/yeskiy/prpcow/commit/6dcd9710b607bec156dbf8d0a639183c3788fd84))
* Code moved to ts ([7aa5c4f](https://github.com/yeskiy/prpcow/commit/7aa5c4fdd5a5ad0a8bb9d50e2e578160c9392a67))
* Fully changed tsconfig ([7da970f](https://github.com/yeskiy/prpcow/commit/7da970f6ae4a01a1e152fcda35ca9bbb4eea7405))
* Moved tests (and jest) to another folder ([68d5ce7](https://github.com/yeskiy/prpcow/commit/68d5ce73ddb49d2ab99cc8f1786f00f938dc5655))

### [1.1.3](https://github.com/yeskiy/prpcow/compare/v1.1.2...v1.1.3) (2023-03-01)


### Bug Fixes

* Fix Maximum call stack exceeded when trying to create a stream from client ([e829597](https://github.com/yeskiy/prpcow/commit/e829597b8eb890053ba38afb9e2c965984cf6705))

### [1.1.2](https://github.com/yeskiy/prpcow/compare/v1.1.1...v1.1.2) (2023-01-26)


### Bug Fixes

* Add types support. Add prebuilt for `CommonJS` and `ESM` ([142dd97](https://github.com/yeskiy/prpcow/commit/142dd97eead73564e00ee4ede03f1a6efbdf326b))

### [1.1.1](https://github.com/yeskiy/prpcow/compare/v1.1.0...v1.1.1) (2023-01-23)


### Bug Fixes

* Fix undefined ping/pong module on client-side ([fb27eb8](https://github.com/yeskiy/prpcow/commit/fb27eb890800211fb7076b16b483e85424cf70f5))
* Fix unhandled `Session is not in opened state` error ([05d0136](https://github.com/yeskiy/prpcow/commit/05d01368df6fb1d25cb35cf090cf5a2931a410ee))
* Typo fix ([f65ef59](https://github.com/yeskiy/prpcow/commit/f65ef59a54b8d12274a70511bf4835fdd98c3fca))

## [1.1.0](https://github.com/yeskiy/prpcow/compare/v1.0.12...v1.1.0) (2023-01-23)


### Features

* Add ping/pong calls ([695d106](https://github.com/yeskiy/prpcow/commit/695d1061ffd570657458f7ddb625d675e804de5a))

### [1.0.12](https://github.com/yeskiy/prpcow/compare/v1.0.11...v1.0.12) (2023-01-13)


### Bug Fixes

* update functionResolver ([ba2fdad](https://github.com/yeskiy/prpcow/commit/ba2fdad2b3a10126be7dda6fcc420e59e5a5b964))

### [1.0.11](https://github.com/yeskiy/prpcow/compare/v1.0.10...v1.0.11) (2023-01-12)


### Bug Fixes

* remove node version ident ([cfe246f](https://github.com/yeskiy/prpcow/commit/cfe246f6bf8a0c64baf427a509664fae7911cc9e))

### [1.0.10](https://github.com/yeskiy/prpcow/compare/v1.0.9...v1.0.10) (2022-12-29)

### [1.0.9](https://github.com/yeskiy/prpcow/compare/v1.0.8...v1.0.9) (2022-08-30)

### [1.0.8](https://github.com/yeskiy/prpcow/compare/v1.0.7...v1.0.8) (2022-08-30)

### [1.0.7](https://github.com/yeskiy/prpcow/compare/v1.0.6...v1.0.7) (2022-08-30)

### [1.0.6](https://github.com/yeskiy/prpcow/compare/v1.0.5...v1.0.6) (2022-08-30)

### [1.0.5](https://github.com/yeskiy/prpcow/compare/v1.0.4...v1.0.5) (2022-08-30)

### [1.0.4](https://github.com/yeskiy/prpcow/compare/v1.0.3...v1.0.4) (2022-05-22)

### [1.0.3](https://github.com/yeskiy/prpcow/compare/v1.0.2...v1.0.3) (2022-05-22)

### [1.0.2](https://github.com/yeskiy/prpcow/compare/v1.0.1...v1.0.2) (2022-05-22)
