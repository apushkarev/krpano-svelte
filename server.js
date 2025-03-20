import express from 'express';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import chalk from 'chalk';
import X2JS from 'x2js';
import { DOMParser } from 'xmldom';
import cors from 'cors';
import { getDestinationFolder, directoryExists} from './server_lib/helpers.js'

const app = express();

let isDev = false

const args = process.argv

if (args.findIndex(item => item == 'dev') != -1) isDev = true

app.use(express.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

const isLocal = address => {
  
  if (address.indexOf('localhost') != -1 || address.indexOf('192.168') != -1 || address.indexOf('172.20') != -1) return true

  return false
}

app.use(cors({

  origin: function(origin, callback){

    if(!origin) return callback(null, true);

    if(!isLocal(origin)) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.static(path.resolve('./', './')))

// app.get('/', (req, res) => {
//   res.sendFile(path.resolve('./', 'static_server_tools'))
// })

app.use((req, res, next) => {
  res.set('Cache-Control', 'max-age=0, no-store')
  next()
})

app.get('/api/build', async (req, res) => {

  const t0 = performance.now();

  await mergeKRPanoSources(getFilesRecursive('src/k_src/kml'), 'public/k_app/app.xml')
  await mergeFiles(getFilesRecursive('src/k_src/js'), 'public/k_app/js/app.js')
  await mergeFiles(getFilesRecursive('src/k_src/css'), 'public/k_app/app.css')

  console.log(`BUILD TOTAL TIME ${Math.round(performance.now() - t0)}ms`)

  res.json('success')
})

app.post('/api/saveTextFile', (req, res) => {

  const data = {...req.body}

  const origin = req.headers.origin;

  const filePath = path.join('./', getDestinationFolder(origin, isDev), 'tours', data.tourName, data.filePath)

  try {
    saveTextFile(filePath, decodeURIComponent(data.fileContent), filePath)
  } catch(err) {
    res.status(500).send({message: 'Some shit happened while saving file'})
    return
  }

  res.status(202).send({message: `File ${filePath} saved`})
})

app.post('/api/saveImage', async (req, res) => {

  const origin = req.headers.origin;

  const data = req.body

  const filePath = path.join('./', getDestinationFolder(origin, isDev), 'tours', data.tourName, data.folder, data.fileName)
  
  await fs.writeFile(filePath, data.base64data, 'base64', err => {

    if (err) {

      console.log(chalk.redBright('ERROR SAVING FILE:'), err)

      res.status(500).send({message: `Some shit happened while saving ${filePath}`})

      throw(err)
    }

    res.status(202).send({ message: `File ${filePath} saved` });
  })
})

app.post('/api/getTextFileContent', async (req, res) => {
  const data = {...req.body}

  const origin = req.headers.origin;

  const fileText = await readFileAsync(path.join('./', getDestinationFolder(origin, isDev), 'tours', data.tourName, data.fileName))

  res.status(202).send({text: fileText})
})

function saveTextFile(path, content, fileName) {

  fs.writeFile(path, content, err => {

    if (err) {
      console.log(chalk.redBright('ERROR SAVING FILE:'), err)

      throw(err)
    }

    console.log(chalk.cyanBright(`${Date().toString()} :: File updated: ${fileName}`))
  })
}

const isHiddenFile = (file) => {
  return path.basename(file).startsWith('.');
};

// Function to get all files in a folder and its subfolders recursively
const getFilesRecursive = (folderPath) => {
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
  return files;
};

const readFileAsync = (filePath) => {
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

const mergeFiles = async (filePaths, mergedFileName) => {

  return new Promise( async (resolve, reject) => {

    let concatenatedContents = '';

    for (const file of filePaths) {

      // console.log('reading ' + path.join('./', file));

      const fileContent = await readFileAsync(file);
      concatenatedContents = concatenatedContents + fileContent + '\n\n';
    }

    resolve(saveTextFile(path.join('./', mergedFileName), concatenatedContents, mergedFileName))
  })
};


const mergeKRPanoSources = async (fileArray, mergedFileName) => {

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

    resolve(saveTextFile(path.join('./', mergedFileName), mergedRootString, mergedFileName))
  })
}

app.listen(80, () => console.log(`${Date().toString()} :: Krpano Bundler Server is listening at :80`))
