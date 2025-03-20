
export const initResizeHandler = () => {
  window.onresize = () => resizeUI()
}

export const resizeUI = () => {

  Object.entries(ui).forEach(([component, instance]) => {
    instance && instance.resize && instance.resize()
  })
}
