export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderMessagePage({ title, heading, body }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - Bot Rendiciones</title>
  <link rel="stylesheet" href="/static/app.css" />
</head>
<body>
  <div class="card card-message">
    <h1>${heading}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`
}

export function renderErrorPage(message) {
  return renderMessagePage({
    title: 'Error',
    heading: `⚠️ ${escapeHtml(message)}`,
    body: 'Revisá el link que te compartieron.',
  })
}
