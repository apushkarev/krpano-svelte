<script>
// @ts-nocheck

  import { onMount } from "svelte";

  import { initResizeHandler } from "./lib/adaptivity";
  import HelloPopup from "./components/HelloPopup.svelte";

  window.ui = {};

  onMount(() => {
    initResizeHandler();
  });

</script>

<HelloPopup />
