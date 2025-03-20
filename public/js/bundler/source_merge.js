// https://github.com/abdolence/x2js

"use strict"

// читает асинхронно текстовый файл, возвращает текстовое содержимое
async function readFile(url) {
	const response = await fetch(url);
	return await response.text();
}

async function request(url, method = 'POST', data = null, contentType = 'application/json') {
  try {
    const headers = {}
    let body

    if (data) {
      headers['Content-Type'] = contentType
      body = JSON.stringify(data)
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    })

    console.log(`REQUEST ${response.url} STATUS ${response.status}`)
    return await response.json()
  } catch (e) {
    console.warn('Error:', e.message)
  }
}

async function saveFile(fName, data, uploadURL) {
	const requestData = {
		fileName: fName,
		fileContent: data
	}

	await request(uploadURL, 'POST', requestData)
	console.log(`${Date().toString()}:: SAVED ${fName} TO ${uploadURL}`)
}

	
// соединение файлов крпано в один
async function mergeKRPanoSources(fileArray, mergedFileName, uploadURL) {

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

	for (let file of fileArray) {

		console.log('reading ' + file);

		// замены по регулярным выражениям спасают от ошибок
		fileXML = (await readFile(`${location.href.split(':').slice(0, 2).join(':')}/src/k_src/kml/${file}?t=${Math.round(Date.now() / 1000).toString(36)}`)).replace(RegExp('__', 'g'), '_DOUBLE_UNDERSCORE_').replace(RegExp('<_', 'g'), '<GLOBAL_OBJECT');
		fileJSON = x2js.xml_str2json(fileXML).krpano;

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
		mergedCode += x2js.json2xml_str(fileJSON);
	}

	mergedRoot.krpano.__text = '';
	mergedRootString = x2js.json2xml_str(mergedRoot);
	mergedRootString = mergedRootString.slice(0, -9) + mergedCode + mergedRootString.slice(-9);
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

	return await saveFile(mergedFileName, encodeURIComponent(vkbeautify.xmlmin(mergedRootString)), uploadURL);
}

async function mergeFiles(fileArray, mergedFileName, uploadURL) {

	let mergedString = '';	

	for (let file of fileArray) {
		console.log('reading ' + file);
		mergedString += await readFile(`${file}?t=${Math.round(Date.now() / 1000).toString(36)}`);
	}

	return await saveFile(mergedFileName, encodeURIComponent(mergedString), uploadURL);
}
