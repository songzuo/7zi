/**
 * Viewport Configuration for Mobile Responsive Design (Localized)
 *
 * This file configures the viewport meta tag to ensure proper
 * rendering on mobile devices across all screen sizes.
 *
 * Configuration Goals:
 * - Proper scaling on all devices (320px - 2560px)
 * - Prevent user zoom for app-like experience
 * - Support safe areas on notched devices (iPhone X+)
 * - Optimize for touch interactions
 *
 * @see https://nextjs.org/docs/app/api-reference/config/viewport
 */

export const viewport = {
  // Viewport dimensions for proper scaling
  width: 'device-width',
  height: 'device-height',

  // Initial and maximum zoom scale
  // Set to 1.0 to prevent zooming (app-like experience)
  initialScale: 1.0,
  maximumScale: 1.0,

  // Allow user zooming for accessibility (optional)
  // Set to 'no' to disable, or remove to allow
  // userScalable: 'no',

  // Interactive widget mode
  // 'resizes-visual' provides better compatibility
  interactiveWidget: 'resizes-visual',

  // Theme color for browser UI
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],

  // Color scheme preference
  colorScheme: 'light dark',

  // Viewport fit for notched devices
  // 'cover' extends viewport into notch areas
  viewportFit: 'cover',

  // Apple-specific viewport configurations
  appleMobileWebAppCapable: 'yes',
  appleMobileWebAppStatusBarStyle: 'default',

  // Format detection (disable for better control)
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

// Type definition for Next.js
export type Viewport = typeof viewport;
