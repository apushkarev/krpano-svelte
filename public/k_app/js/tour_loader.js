function loadCSSFile(filename) {
  const fileref = document.createElement('link')
  fileref.setAttribute('rel', 'stylesheet')
  fileref.setAttribute('type', 'text/css')
  fileref.setAttribute('href', filename)

  document.getElementsByTagName('head')[0].appendChild(fileref)
}

async function loadJSFile(path) {
  return new Promise((resolve, reject) =>{
    const script = document.createElement("script")
    script.src = path
    document.body.appendChild(script)

    script.onload = () => resolve(script)
  })
}

async function loadTour() {

  return new Promise( async (resolve, reject) => {

    const timestamp = Math.round(Date.now() / 1000).toString(36)
    const documentURL = new URL(location)

    const tourName = documentURL.searchParams.get('tour')
    const remoteFolder = documentURL.searchParams.get('folder')

    const tourFolder = remoteFolder ? remoteFolder : `${location.origin}/tours`
    const xmlFolder = remoteFolder ? `${remoteFolder}` : `tours`
  
    const isAmazon = remoteFolder ? remoteFolder.indexOf('amazon') != -1 : false
  
    await loadJSFile(`k_app/tour.js?t=${Date.now()}`)
    await loadJSFile(`k_app/js/app.js?t=${Date.now()}`)
    await loadCSSFile(`k_app/app.css?t=${Date.now()}`)
  
    embedpano({
      xml: `${xmlFolder}/${tourName}/tour.xml?t=${timestamp}`,
      target: "pano",
      html5: "only",
      bgcolor : '#ffffff', 
      initvars: {
        _location : `${tourFolder}/${tourName}/`,
        _timestamp: '?t=' + timestamp,
        _devmode: documentURL.searchParams.get("devmode") == '',
        tourTitle: tourName,
        _is_amazon_: isAmazon,
        loadCallback: () => setTimeout(() => resolve(true), 100)
      },
      passQueryParameters: true,
    })
  })
}
