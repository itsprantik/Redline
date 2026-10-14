import { defineConfig } from 'vite';

// Relative base so the build works from any folder, including double-clicking dist/index.html on a static host.
export default defineConfig({ base: './', build: { target: 'es2022' } });