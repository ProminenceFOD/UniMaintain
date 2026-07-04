// Injects the UniMaintain favicon dynamically — works without an index.html
export function injectFavicon() {
  // Remove existing favicons
  document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());

  // Create SVG favicon — forest green wrench in a rounded square
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#1A4731"/>
      <path d="M21.5 8.5C20.1 7.1 18.1 6.6 16.3 7.2L19 9.9L19 12.9L16 15.9L13 15.9L10.3 13.2C9.7 15 10.2 17 11.6 18.4C13 19.8 15 20.3 16.8 19.7L21.2 24.1C21.9 24.8 23 24.8 23.7 24.1C24.4 23.4 24.4 22.3 23.7 21.6L19.3 17.2C19.9 15.4 19.4 13.4 18 12L21.5 8.5Z"
            fill="#C9A227" stroke="#C9A227" stroke-width="0.3" stroke-linejoin="round"/>
    </svg>
  `.trim();

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement("link");
  link.rel   = "icon";
  link.type  = "image/svg+xml";
  link.href  = url;
  document.head.appendChild(link);

  // Also set the page title
  document.title = "UniMaintain — Campus Maintenance System";
}
