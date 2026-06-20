import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import X2JS from 'x2js';
import chalk from 'chalk';

export const isHiddenFile = file => path.basename(file).startsWith('.');

// All files in a folder and its subfolders, returned sorted for deterministic
// merge order (file naming can be used to prioritise, e.g. zzz_ runs last).
export const getFilesRecursive = folderPath => {

  const files = [];

  const readFiles = currentPath => {

    fs.readdirSync(currentPath).forEach(file => {

      const fullPath = path.join(currentPath, file);

      if (fs.statSync(fullPath).isDirectory()) {
        readFiles(fullPath);
      } else if (!isHiddenFile(fullPath)) {
        files.push(fullPath);
      }
    });
  };

  readFiles(folderPath);

  return files.sort();
};

export const readFileAsync = filePath => {

  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => err ? reject(err) : resolve(data));
  });
};

export const saveTextFile = (filePath, content, fileName) => {

  return new Promise(resolve => {

    fs.writeFile(filePath, content, err => {

      if (err) {
        console.log(chalk.redBright('ERROR SAVING FILE:'), err);
        throw err;
      }

      console.log(chalk.cyanBright(`${new Date().toLocaleString('en-GB')} :: File updated: ${fileName}`));

      resolve(true);
    });
  });
};

const toBase64 = text => Buffer.from(text ?? '', 'utf8').toString('base64');

// Plain concatenation of files into a single string (css / js merge).
export const mergeFilesToString = async filePaths => {

  let merged = '';

  for (const file of filePaths) {
    merged += await readFileAsync(file) + '\n\n';
  }

  return merged;
};

// Merge a set of krpano .kml files into a single <krpano>...</krpano> string,
// hoisting global variables and converting the semantic tags (prototype /
// definition / extends) back to krpano-compatible style syntax.
export const mergeKRPanoSourcesToString = async fileArray => {

  let mergedCode = '';
  const mergedRoot = { krpano: {} };
  const x2js = new X2JS();

  for (const file of fileArray) {

    const fileText = await readFileAsync(`${path.join('./', file)}`);

    const fileXML = fileText.replace(RegExp('__', 'g'), '_DOUBLE_UNDERSCORE_').replace(RegExp('<_', 'g'), '<GLOBAL_OBJECT');
    const fileJSON = x2js.xml2js(fileXML).krpano;

    for (let key of Object.keys(fileJSON)) {
      if (key[0] == '_' && key.length > 1) {
        mergedRoot.krpano[key] = fileJSON[key];
      }
    }

    mergedCode += x2js.js2xml(fileJSON);
  }

  mergedRoot.krpano.__text = '';

  let mergedRootString = x2js.js2xml(mergedRoot);
  const globalVars = mergedRootString.slice(8, -3);

  mergedRootString = `<krpano ${globalVars}>${mergedCode}</krpano>`;

  mergedRootString = mergedRootString
    .replace(RegExp('[ \n\t]+', 'g'), ' ')
    .replace(RegExp('\'', 'g'), '"')
    .replace(RegExp('&apos;', 'g'), '\'')
    .replace(RegExp('_DOUBLE_UNDERSCORE_', 'g'), '__')
    .replace(RegExp('GLOBAL_OBJECT', 'g'), '_')
    .replace(RegExp('prototype', 'g'), 'style')
    .replace(RegExp('<definition', 'g'), '<style')
    .replace(RegExp('definition=', 'g'), 'style=')
    .replace(RegExp('/definition', 'g'), '/style')
    .replace(RegExp('extends', 'g'), 'style');

  // Make the internal alias available inside every krpano JS action without a
  // window global: krpano injects `krpano` into each type="javascript" action,
  // and _k === krpano, so declare it locally at the top of each action's CDATA.
  // (__init.kml is not part of this merge and already declares its own _k.)
  mergedRootString = mergedRootString.replace(
    /(<action\b[^>]*\btype="javascript"[^>]*>)\s*(<!\[CDATA\[)/gi,
    '$1$2 const _k = krpano; '
  );

  return mergedRootString;
};

// Compose app.xml: __init.kml is the hardcoded root skeleton, every other
// payload is base64-embedded into its data block via @@..._B64@@ placeholders.
export const buildAppXml = async ({
  kmlDir = 'src/k_src/kml',
  cssDir = 'src/k_src/css',
  jsDir = 'src/k_src/js',
  initFileName = '__init.kml',
  svelteJsPath = null,
  svelteCssPath = null,
  outPath = 'public/k_app/app.xml'
} = {}) => {

  const allKmlDirFiles = getFilesRecursive(kmlDir);
  const initPath = allKmlDirFiles.find(file => path.basename(file) === initFileName);

  if (!initPath) {
    throw new Error(`${initFileName} not found in ${kmlDir}`);
  }

  // .kml files (except the bootstrap) become the core. Helper JS now lives in
  // KML actions (assigned to _k, run via init_run_before_start), so _APPJS is
  // unused and kept empty.
  const coreFiles = allKmlDirFiles.filter(file => file.endsWith('.kml') && file !== initPath);

  const coreXml = await mergeKRPanoSourcesToString(coreFiles);
  const cssText = await mergeFilesToString(getFilesRecursive(cssDir));
  const jsText = '';

  const svelteJs = svelteJsPath && fs.existsSync(svelteJsPath) ? fs.readFileSync(svelteJsPath, 'utf8') : '';
  const svelteCss = svelteCssPath && fs.existsSync(svelteCssPath) ? fs.readFileSync(svelteCssPath, 'utf8') : '';

  let initXml = fs.readFileSync(initPath, 'utf8');

  initXml = initXml
    .replace('@@CORE_B64@@', toBase64(coreXml))
    .replace('@@APPJS_B64@@', toBase64(jsText))
    .replace('@@STYLES_B64@@', toBase64(cssText))
    .replace('@@SVELTE_JS_B64@@', toBase64(svelteJs))
    .replace('@@SVELTE_CSS_B64@@', toBase64(svelteCss));

  await saveTextFile(path.join('./', outPath), initXml, outPath);

  return {
    outPath,
    coreFileCount: coreFiles.length,
    sizes: {
      coreXml: coreXml.length,
      cssText: cssText.length,
      jsText: jsText.length,
      svelteJs: svelteJs.length,
      svelteCss: svelteCss.length
    }
  };
};

// CLI: `node server_lib/bundler.js`  (optionally pass svelte bundle paths for prod)
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {

  const svelteJsPath = process.argv.includes('--prod') ? 'dist/assets/index.js' : null;
  const svelteCssPath = process.argv.includes('--prod') ? 'dist/assets/index.css' : null;

  buildAppXml({ svelteJsPath, svelteCssPath })
    .then(result => console.log(chalk.greenBright('app.xml built'), result))
    .catch(error => { console.error(error); process.exit(1); });
}
