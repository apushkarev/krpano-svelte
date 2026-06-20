function loadCSSFile(filename) {
  const fileref = document.createElement('link')
  fileref.setAttribute('rel', 'stylesheet')
  fileref.setAttribute('type', 'text/css')
  fileref.setAttribute('href', filename)

  document.getElementsByTagName('head')[0].appendChild(fileref)
}

async function loadJSFile(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = path
    document.body.appendChild(script)

    script.onload = () => resolve(script)
  })
}

// dev-only: rebuild krpano sources (app.xml) before embedding.
// /api/build is served by the Vite dev plugin (same origin).
async function buildSources() {
  return fetch('/api/build', { method: 'GET' })
}

async function loadTour() {

  const documentURL = new URL(location)

  if (documentURL.searchParams.get('build') === '') {
    await buildSources()
  }

  await loadJSFile(`k_app/tour.js?t=${Date.now()}`)

  // krpano-first: the startup xml is the protected core (app.xml), NOT the tour.
  // No initvars, no external query params, no #app reparent callback.
  // krpano's __init preinit sets globals, loads the core + helpers + css, boots
  // Svelte, then loads the selected tour.xml (settings/scenes) on top.
  embedpano({
    xml: `k_app/app.xml?t=${Date.now()}`,
    target: "pano",
    html5: "only",
    bgcolor: '#000',
    passQueryParameters: true
  })
}
