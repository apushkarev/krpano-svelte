// @ts-nocheck

let globalStorage = $state({

  version: '0.0.1 (2026.11.24)',

  _k: undefined,

  krpanoLoaded: false,
});

function getGlobals() {

  function update(item, handler) {
    globalStorage[item] = handler(globalStorage[item])
  }

  async function updateAsync(item, handler) {
    globalStorage[item] = await handler(globalStorage[item])
  }

  function updateDry(item, handler) {
    globalStorage[item] = handler($state.snapshot(globalStorage[item]))
  }

  return {

    get(item) {
      return globalStorage[item]
    },

    set(item, value) {
      globalStorage[item] = value
    },

    update, updateAsync, updateDry
  }
}

export const globals = getGlobals();
