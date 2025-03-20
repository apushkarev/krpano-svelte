let globalStorage = $state({

  krpanoLoaded: false
})

function getGlobals() {

  async function update(item, handler) {
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

    update, updateDry
  }
}

export const globals = getGlobals();
