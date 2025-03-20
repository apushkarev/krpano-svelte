<script>
// @ts-nocheck

  
  import { onMount } from "svelte";

  import { initResizeHandler } from "./lib/adaptivity";
  import { globals } from "./+stores.svelte";

  window.ui = {};

  
  onMount(async () => {

    initResizeHandler();

    const documentURL = new URL(location);
    const runBuild = documentURL.searchParams.get('build') == '';

    if (runBuild) {
      
      const t0 = performance.now();
      
      await buildSources();
  
      const totalTime = Math.round(performance.now() - t0);
      console.log(`K_APP BUILD TOTAL TIME ${totalTime}ms`);
    }

    await loadTour();

    globals.set('krpanoLoaded', true);
  });

  const buildSources = async () => {
    return await fetch(`${location.href.split(':').slice(0, 2).join(':')}/api/build`, {
      method: 'GET'
    });
  }

</script>
