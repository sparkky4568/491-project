// Applies the saved theme before first paint so dark mode doesn't flash. Light is the default.
// Lives in its own file (not inline in index.html) so the Content-Security-Policy can stay strict.
try {
  if (localStorage.getItem('aven-theme') === 'dark') document.documentElement.classList.add('dark')
} catch (e) {
  // Storage can be blocked (private mode); fall back to the light theme.
}
