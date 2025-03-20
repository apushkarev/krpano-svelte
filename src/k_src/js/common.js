function setKRPanoConsole() {

  const krpanoDOMObject = document.getElementById('krpanoSWFObject');

  krpanoDOMObject.childNodes[1].style.top = "-1px";
  krpanoDOMObject.childNodes[1].style.bottom = "0";
  krpanoDOMObject.childNodes[1].style.height = "450px";

  krpanoDOMObject.childNodes[1].childNodes[1].style.fontSize = "18px";
  krpanoDOMObject.childNodes[1].childNodes[1].style.lineHeight = "1.4";
  krpanoDOMObject.childNodes[1].childNodes[1].style.fontWeight = 500;
  krpanoDOMObject.childNodes[1].childNodes[1].style.whiteSpace = "pre-wrap";
  krpanoDOMObject.childNodes[1].childNodes[1].style.height = "470px";
}

const roundVal = (value, decimals) => {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

function readURL() {
	const documentURL = new URL(window.location);
	const devmode = documentURL.searchParams.get("devmode");

  krpano.is_bundler = location.href.indexOf('_dev') != -1;

	if (devmode == '') {
		krpano.set('devmode', true);
		krpano.set('logkey', true);
		krpano.set('showerrors', true);
	}
}

function loadjscssfile(filename, filetype, onload) {

  if (filetype == 'js'){ 
    var fileref = document.createElement('script');
    fileref.setAttribute('type', 'text/javascript');
    fileref.setAttribute('src', filename);

  } else if (filetype == 'css') {
    var fileref = document.createElement('link');
    fileref.setAttribute('rel', 'stylesheet');
    fileref.setAttribute('type', 'text/css');
    fileref.setAttribute('href', filename);
  }
  if (typeof fileref != 'undefined')
    document.getElementsByTagName('head')[0].appendChild(fileref);
}

function hyphenate(text) {
  let all = "[абвгдеёжзийклмнопрстуфхцчшщъыьэюя]",
      glas = "[аеёиоуыэю\я]",
      sogl = "[бвгджзклмнпрстфхцчшщ]",
      zn = "[йъь]",
      shy = "\xAD",
      regExpArr = [
        new RegExp("("+zn+")("+all+all+")","ig"),
        new RegExp("("+glas+")("+glas+all+")","ig"),
        new RegExp("("+glas+sogl+")("+sogl+glas+")","ig"),
        new RegExp("("+sogl+glas+")("+sogl+glas+")","ig"),
        new RegExp("("+glas+sogl+")("+sogl+sogl+glas+")","ig"),
        new RegExp("("+glas+sogl+sogl+")("+sogl+sogl+glas+")","ig")
      ];

  for (let regExp of regExpArr) {
    text = text.replace(regExp, "$1"+shy+"$2");
  }
  return text;
}

function getRandomInt(min, max) {
  // http://caniuse.com/#feat=getrandomvalues
  if (window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(new Uint8Array(1))[0] % (max - min) + min;
  } else if (window.msCrypto && window.msCrypto.getRandomValues) {
    return window.msCrypto.getRandomValues(new Uint8Array(1))[0] % (max - min) + min;
  } else {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}

function setPageRatio(ratio) {

  const panoFrame = document.getElementById('pano');

  const stageAspect = document.body.offsetWidth / document.body.offsetHeight;

  if (stageAspect > ratio) {
    pano.style.height = `100%`;
    pano.style.width = `${document.body.offsetHeight * ratio / document.body.offsetWidth * 100}%`;
    pano.style.marginLeft = `${(document.body.offsetWidth - document.body.offsetHeight * ratio) / 2 / document.body.offsetWidth * 100}%`;
    pano.style.marginTop = 0;
  } else {
    pano.style.width = `100%`;
    pano.style.height = `${document.body.offsetWidth / ratio / document.body.offsetHeight * 100}%`;
    pano.style.marginTop = `${(document.body.offsetHeight - document.body.offsetWidth / ratio) / 2 / document.body.offsetHeight / ratio * 100}%`;
    pano.style.marginLeft = 0;
  }
}


function initResizeObserver(id, lName, kCallback) {
  // https://stackoverflow.com/questions/6492683/how-to-detect-divs-dimension-changed
  const element = document.getElementById(id);

  new ResizeObserver(entity => {
    krpano.call(`callwith(layer[${lName}], ${kCallback}(${entity[0].target.offsetWidth}, ${entity[0].target.offsetHeight}));`);
  }).observe(element);
}

function unobserve(id) {
  if (window.resizeObserver) {
    window.resizeObserver.unobserve(document.getElementById(`id`));
    window.resizeObserver = null;
  }
}

function kArrayPush(arrayName, arrayItemName, parameters) {

  krpano.set(`${arrayName}[${arrayItemName}].name`, arrayItemName);

  if (parameters) {
    parameters.forEach(parameter => {
      // console.log(`${arrayName}[${arrayItemName}].${parameter.name}` + ' ' + parameter.value);
      krpano.set(`${arrayName}[${arrayItemName}].${parameter.name}`, parameter.value);    
    });
  }
}

function injectCSS(css) {
  const styleSheet = document.createElement("style")

  styleSheet.type = "text/css"
  styleSheet.innerText = css
  document.body.appendChild(styleSheet)
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function clipboard(content) {
  const el = document.createElement('textarea');
  el.value = content;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function getAngularDistance(pointA, pointB) {
  const a = ((pointA % 360) + 360) % 360; // calculate the angular value of pointA modulo 360 degrees
  const b = ((pointB % 360) + 360) % 360; // calculate the angular value of pointB modulo 360 degrees

  const clockwiseDistance = (b - a + 540) % 360 - 180; // calculate the clockwise distance between the two points modulo 360 degrees
  const counterclockwiseDistance = (a - b + 540) % 360 - 180; // calculate the counterclockwise distance between the two points modulo 360 degrees

  return Math.abs(Math.min(clockwiseDistance, counterclockwiseDistance)); // return the absolute value of the smaller of the two distances
}

function normalizeAngle360(angle) {
  return ((angle % 360) + 360) % 360;
}

function normalizeAngle180(angle) {
  angle = (angle % 360 + 360) % 360;

  if (angle > 180) {
    angle -= 360;
  }

  return angle;
}

function degToRad(angle) {
  return angle * Math.PI / 180;
}

function radToDeg(angle) {
  return angle * 180 / Math.PI;
}

const uiTimeout = (callback) => {
  setTimeout(() => callback(), 75);
}

const getTimestamp = () =>  Math.round(Date.now() / 1000).toString(36);

const slowCallwhen = (condition, callback) => {

  const intervalId = setInterval(async () => {

    if (await condition()) {

      clearInterval(intervalId)
      await callback()
    }
  }, 50)

  return intervalId
}

