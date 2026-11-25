import fs from 'fs';
import path from 'path';
import X2JS from 'x2js';
import chalk from 'chalk';

export const getDestinationFolder = (origin, isDev) => {

  if (isDev) return 'public'
  
  return 'dist'
}

export const directoryExists = directoryPath => {
  try {
    // Check if the directory exists by attempting to access its stats
    const stats = fs.statSync(directoryPath);
    return stats.isDirectory();
  } catch (error) {
    // If an error occurs, the directory does not exist
    return false;
  }
}

export const isHiddenFile = (file) => {
  return path.basename(file).startsWith('.');
};

// Function to get all files in a folder and its subfolders recursively
export const getFilesRecursive = (folderPath) => {
  const files = [];

  const readFiles = (currentPath) => {
    const fileList = fs.readdirSync(currentPath);

    fileList.forEach((file) => {
      const fullPath = path.join(currentPath, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        readFiles(fullPath);
      } else {
        if (!isHiddenFile(fullPath)) {
          files.push(fullPath);
        }
      }
    });
  };

  readFiles(folderPath);
  // sorted for deterministic merge/override order (file naming can prioritise,
  // e.g. a zzz_ prefix runs last, __init.kml is found regardless of position)
  return files.sort();
};

export const readFileAsync = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

/* filePath, not path — `path` would shadow the path module used below */
export const saveTextFile = (filePath, content, fileName) => {

  return new Promise((resolve, reject) => {

    /*
      Create the parent folder first, mirroring core/php/save_text_file.php.
      A tour can legitimately lack a folder the editor saves into (e.g. a
      migrated tour with no _content/galleries/ yet), and fs.writeFile ENOENTs
      on a missing parent instead of creating it.
    */
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
    } catch (error) {
      console.log(chalk.redBright('ERROR CREATING FOLDER:'), error)

      reject(error)
      return
    }

    fs.writeFile(filePath, content, err => {

      if (err) {
        console.log(chalk.redBright('ERROR SAVING FILE:'), err)

        /* reject, never throw — a throw in this callback is an uncaught
           exception that takes the whole dev server down with it */
        reject(err)
        return
      }

      console.log(chalk.cyanBright(`${new Date().toLocaleString('en-GB')} :: File updated: ${fileName}`))

      resolve(true);
    })
  })
}

export const mergeFiles = async (filePaths, mergedFileName) => {

  return new Promise( async (resolve, reject) => {

    let concatenatedContents = '';

    for (const file of filePaths) {

      // console.log('reading ' + path.join('./', file));

      const fileContent = await readFileAsync(file);
      concatenatedContents = concatenatedContents + fileContent + '\n\n';
    }

    resolve(await saveTextFile(path.join('./', mergedFileName), concatenatedContents, mergedFileName))
  })
};


export const mergeKRPanoSources = async (fileArray, mergedFileName) => {

  return new Promise( async (resolve, reject) => {
    let fileJSON = {};
    let fileXML = ''

    // сюда будет копироваться код, который находится внутри тега krpano
    let mergedCode = '';
    // стуктура данных для корректного преобразования json в xml
    let mergedRoot = {
      krpano: {}
    };

    // текстовая строка, где будет храниться слитый файл
    let mergedRootString = '';
    const x2js = new X2JS();

    for (const file of fileArray) {

      // console.log('reading ' + path.join('./', file));

      const fileText = await readFileAsync(`${path.join('./', file)}`)

      // замены по регулярным выражениям спасают от ошибок
      const fileXML = fileText.replace(RegExp('__', 'g'), '_DOUBLE_UNDERSCORE_').replace(RegExp('<_', 'g'), '<GLOBAL_OBJECT')
      const fileJSON = x2js.xml2js(fileXML).krpano

      // перебор всех свойств, которые принадлежат объекту krpano. в их список попадают и глобальные переменные, и массивы объектов (layer, style, hotspot, data и т д)
      // у глобальных переменных (свойств, прописанных в теле тега krpano), при преобразовании в xml->json перед именем появляется символ "_"
      // из-за этого нельзя начинать название тегов внутри krpano с "_", это поломает сборщик
      for (let key of Object.keys(fileJSON)) {
        if (key[0] == '_' && key.length > 1) {
          // свойство - глобальная переменная, то оно переносится в объединённый тег krpano
          mergedRoot.krpano[key] = fileJSON[key];
        }
      }
      // код внутри тега krpano объединяется слиянием текста внутри тега krpano в один
      mergedCode += x2js.js2xml(fileJSON);      
    }

    mergedRoot.krpano.__text = '';
    mergedRootString = x2js.js2xml(mergedRoot);

    const globalVars = mergedRootString.slice(8, -3)

    mergedRootString = `<krpano ${globalVars}>${mergedCode}</krpano>`

    // mergedRootString = mergedRootString.slice(0, -9) + mergedCode + mergedRootString.slice(-9);
    mergedRootString = mergedRootString.replace(RegExp('[ \n\t]+', 'g'), ' ')
                                      .replace(RegExp('\'', 'g'), '"')
                                      .replace(RegExp('&apos;', 'g'), '\'')
                                      .replace(RegExp('_DOUBLE_UNDERSCORE_', 'g'), '__')
                                      .replace(RegExp('GLOBAL_OBJECT', 'g'), '_')
                                      .replace(RegExp('prototype', 'g'), 'style')
                                      .replace(RegExp('<definition', 'g'), '<style')
                                      .replace(RegExp('definition=', 'g'), 'style=')
                                      .replace(RegExp('/definition', 'g'), '/style')
                                      .replace(RegExp('extends', 'g'), 'style');

    resolve(await saveTextFile(path.join('./', mergedFileName), mergedRootString, mergedFileName))
  })
}

// ───────────────────────────────────────────────────────────────────────────
// krpano-first protected core (app.xml) bundler
// ───────────────────────────────────────────────────────────────────────────

// UTF-8-safe base64 (q_5 content is Cyrillic-heavy). Decoded in __init.kml via
// atob + TextDecoder('utf-8').
const toBase64 = text => Buffer.from(text ?? '', 'utf8').toString('base64');

// Plain concatenation of files into a single string (css / js merge), no file write.
export const mergeFilesToString = async filePaths => {

  let merged = '';

  for (const file of filePaths) {
    merged += await readFileAsync(file) + '\n\n';
  }

  return merged;
};

// String-returning variant of mergeKRPanoSources: merges .kml files into a single
// <krpano>...</krpano> string, hoisting global vars and converting the semantic
// tags (prototype / definition / extends) back to krpano-compatible style syntax,
// then injects `const _k = krpano;` at the top of every type="javascript" action
// so _k resolves in production without any window global.
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

  // production _k-scope fix: krpano injects `krpano` into each type="javascript"
  // action, and _k === krpano, so declare it locally at the top of each action.
  // (__init.kml is NOT part of this merge and declares its own _k.)
  mergedRootString = mergedRootString.replace(
    /(<action\b[^>]*\btype="javascript"[^>]*>)\s*(<!\[CDATA\[)/gi,
    '$1$2 const _k = krpano; '
  );

  return mergedRootString;
};

// Compose app.xml: __init.kml is the hardcoded root skeleton, every other payload
// is base64-embedded into its <data> block via @@..._B64@@ placeholders.
// _APPJS is kept empty (helper JS now lives in KML actions assigned to _k).
export const buildAppXml = async ({
  kmlDir = 'src/k_src/kml',
  cssDir = 'src/k_src/css',
  jsDir = 'src/k_src/js',
  initFileName = '__init.kml',
  svelteJsPath = null,
  svelteCssPath = null,
  outPath = 'public/core/k_app/app.xml'
} = {}) => {

  const allKmlDirFiles = getFilesRecursive(kmlDir);
  const initPath = allKmlDirFiles.find(file => path.basename(file) === initFileName);

  if (!initPath) {
    throw new Error(`${initFileName} not found in ${kmlDir}`);
  }

  const coreFiles = allKmlDirFiles.filter(file => (file.endsWith('.kml') || file.endsWith('.xml')) && file !== initPath);

  const coreXml = await mergeKRPanoSourcesToString(coreFiles);

  const cssText = directoryExists(cssDir) ? await mergeFilesToString(getFilesRecursive(cssDir)) : '';
  const jsText = directoryExists(jsDir) ? await mergeFilesToString(getFilesRecursive(jsDir)) : '';

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
