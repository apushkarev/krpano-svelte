<script>
// @ts-nocheck

  let count = $state(0);

  const bump = () => {
    count++;
  };

</script>

<div class="hw_popup">

  <div class="hw_title">Hello World</div>

  <div class="hw_sub">Svelte is mounted inside krpano</div>

  <button class="hw_btn" onclick={bump}>clicked {count} ×</button>

</div>

<style>

  .hw_popup {

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    pointer-events: auto;
    user-select: none;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75em;

    padding: 1.5em 2em;

    background: rgb(20 24 40 / 88%);
    border: 1px solid rgb(255 255 255 / 15%);
    border-radius: 14px;
    box-shadow: 0 10px 40px -8px rgb(0 0 0 / 60%);

    color: #fff;
    font-family: 'Open Sans', sans-serif;
    text-align: center;

    z-index: 10;
  }

  .hw_title {
    font-size: 1.6em;
    font-weight: 700;
  }

  .hw_sub {
    font-size: 0.9em;
    font-weight: 300;
    opacity: 0.7;
  }

  .hw_btn {
    margin-top: 0.5em;
    padding: 0.5em 1.1em;

    cursor: pointer;

    background: #2354f5;
    border: none;
    border-radius: 8px;

    color: #fff;
    font-size: 0.9em;
    font-family: inherit;

    transition: background 0.15s ease;
  }

  .hw_btn:hover {
    background: #1d9ffb;
  }

</style>
