export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
  // Provide default 'from' option for PostCSS plugins
  // This resolves the esbuild warning about missing 'from' option
  map: false, // Disable source maps for better performance in development
}
