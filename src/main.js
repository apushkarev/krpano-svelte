import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { globals } from './+stores.svelte'

let app = null

// krpano's __init preinit creates the mount node inside #krpanoSWFObject and
// hands it over here. Svelte never launches krpano in the inverted startup.
function bootApp(mountEl) {

  if (app || !mountEl) return

  app = mount(App, { target: mountEl })

  globals.set('krpanoLoaded', true)
}

// PROD: krpano runs the built bundle via new Function('krpano','mountEl', ...),
// so `mountEl` resolves to the injected mount node (no window channel).
// DEV: Vite serves this as a module; `mountEl` is undefined, so register a
// window hook that krpano's __init calls with the krpano-created node.
if (typeof mountEl != 'undefined' && mountEl) {

  bootApp(mountEl)

} else {

  window.__bootApp = bootApp

  if (window.__APP_MOUNT) {
    bootApp(window.__APP_MOUNT)
  }
}
