A lightweight, segment-based download manager implemented in Node.js. This project provides robust, resumable downloads with segmenting, metadata, and progress reporting — useful for reliable large-file downloads and scripting workflows.

Repository: `https://github.com/yusuferengerek/download-manager`

Key Features
- Resumable downloads using segmented requests
- Automatic metadata tracking and segment synchronization
- Progress reporting and ETA formatting
- Configurable via `src/config.json`

Project structure

- `index.mjs` - CLI entrypoint for the downloader
- `package.json` - project metadata and scripts
- `start.bat` - convenience script for Windows
- `src/` - implementation source files
  - `config.json` - default runtime configuration
  - `functions/` - high-level orchestration and CLI glue
    - `config.js` - configuration loader and validator
    - `index.js` - program entry logic (CLI) helpers
    - `formatters/` - output formatting utilities
      - `formatBytes.js`
      - `formatETA.js`
    - `global/` - shared utilities
      - `createAbortCoordinator.js`
      - `fileExists.js`
      - `parseArgs.js`
      - `resolvePaths.js`
      - `sleep.js`
    - `metadata/` - metadata file handling
      - `createMetadataWriter.js`
      - `loadOrCreateMetadata.js`
    - `network/` - network-related utilities
      - `getFileInfo.js`
      - `segmentRequest.js`
    - `progress/` - progress UI
      - `showProgress.js`
    - `segments/` - segmentation and download logic
      - `createSegments.js`
      - `determineCount.js`
      - `downloadSegments.js`
      - `getSegmentPath.js`
      - `mergeSegments.js`
      - `syncSegmentsWithFiles.js`

Installation

Prerequisites: Node.js (LTS) and npm.

1. Clone the repository:

    git clone https://github.com/yusuferengerek/download-manager.git
    cd download-manager

2. Install dependencies:

    npm install

3. Run the downloader (example):

    node index.mjs --url "https://example.com/largefile.zip"

On Windows, you can run `start.bat` for convenience.

Configuration

- Edit `src/config.json` to change defaults such as segment size, concurrency, and retry policies.

Development

- Use consistent coding style (ES Modules, modern JS). Keep changes isolated and small.
- Run any project-specific scripts defined in `package.json`.

Contributing

Contributions are welcome. See `CONTRIBUTING.md` for guidelines on issues, pull requests, and code style.

License

This project is licensed under the MIT License - see `LICENSE` for details.

Acknowledgements

Thanks to contributors and open-source maintainers of Node.js ecosystem libraries and resources.
