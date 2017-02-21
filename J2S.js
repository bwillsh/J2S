'use strict';

const fs = require('fs');

// An example data object that I made up
const data = {
    "data": [
        {
            id: '[Int] id of user object in our DB',
            name: '[String] User\'s full name',
            birthday: '[String] in the format of MM/DD/YYYY',
            location: {
                street: '[String] house number and street',
                city: '[String]',
                state: '[String] can be either two letters or full name',
                zipcode: '[Int]'
            },
            friends: [
                {
                    id: '[Int] friend\'s id for later look up',
                    name: '[String] full name',
                    chat_messages: [
                        {
                            message: '[String] message that was sent',
                            time_sent: '[Int] unix time',
                            was_seen: '[Bool] was the message seen'
                        }
                    ]
                }
            ]
        }
    ]
}

// fileArray contains arrays of strings, each array being a class
const fileArray = [];
const fileName = 'UserExample';

//capitalize the first letter of a string
function capFirstLetter(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// convert snake_case to camelCase
function snakeToCamel(string) {
    const arr = string.split('_');
    let s = arr[0];
    for (let i = 1; i < arr.length; i += 1) {
        s += capFirstLetter(arr[i]);
    }
    return s;
}

// print out all of the strings into a swift file
function print(file) {
    let string = '//\n' +
    `// ${fileName}.swift\n` +
    '// Created by J2S\n' +
    '//\n\n\n';

    // printing the classes backwards because this will put the main class up top
    for (let i = file.length - 1; i >= 0; i -= 1) {
        let tab = '';
        for (let j = 0; j < file[i].length; j += 1) {
            let line = file[i][j];

            // add or remove a tab (4 spaces) if you enter or leave a block
            if (line.indexOf('}') !== -1) {
                tab = tab.substring(0, tab.length - 4);
            }
            line = `${tab}${line}\n`;
            if (line.indexOf('{') !== -1) {
                tab = `${tab}    `;
            }
            string += line;
        }
    }

    fs.writeFile(`./${fileName}.swift`, string, (err) => {
        if (err) throw err;
        // console.log('File written!');
    });
}

// The meat of this code,
function makeBlock(name, json) {
    const nameCap = capFirstLetter(name);

    //holds all of are variables
    const vars = [];

    // goes through each item in the json and makes a variable for it
    for (const key in json) {
        const line = json[key];
        if (typeof line === 'string') {
            //if it is a string, you want to get the variable type from the brackets
            const item = { snakeName: key };
            item.name = snakeToCamel(key);
            const type = line.substring(line.indexOf('[') + 1, line.indexOf(']'));
            item.type = type;
            vars.push(item);
        } else if (typeof line === 'object') {
            // if it is an object, check to see if it is an array or an object
            if (line[0]) {
                if(typeof line[0] === 'object'){
                    const item = { snakeName: key };
                    item.name = snakeToCamel(key);
                    let className = capFirstLetter(item.name);
                    if (className.charAt(className.length - 1) === 's') {
                        className = className.substring(0, className.length - 1);
                    }
                    item.className = className;
                    item.type = `[${className}]`;
                    item.complex = 'array';
                    vars.push(item);

                    makeBlock(className, line[0]);
                } else if(typeof line[0] === 'string'){
                    console.log('Arrays of primitive variables is not handled right now');
                }

            } else {
                const item = { snakeName: key };
                item.name = snakeToCamel(key);
                const className = capFirstLetter(item.name);
                item.className = className;
                item.type = className;
                item.complex = 'object';
                vars.push(item);

                makeBlock(className, line);
            }
        }
    }
    const block = [];

    // start of the class definition
    block.push(`class ${nameCap}{`);
    for (let v = 0; v < vars.length; v += 1) {
        if (vars[v].complex === 'array') {
            block.push(`var ${vars[v].name}:${vars[v].type}`);
        } else {
            block.push(`var ${vars[v].name}:${vars[v].type}?`);
        }
    }
    block.push('');

    // start of the init funciton
    block.push('init(dictionary:[String:Any]){');
    for (let v = 0; v < vars.length; v += 1) {
        if (vars[v].complex === 'array') {
            block.push(`${vars[v].name} = []`);
            block.push(`if let ${vars[v].name}Array = dictionary["${vars[v].snakeName}"] as? [[String:Any]] {`);
            block.push(`for item in ${vars[v].name}Array {`);
            block.push(`${vars[v].name}.append(${vars[v].className}(dictionary: item))`);
            block.push('}');
            block.push('}');
            block.push('');
        } else if (vars[v].complex === 'object') {
            block.push(`if let ${vars[v].name}Dictionary = dictionary["${vars[v].snakeName}"] as? [String:Any] {`);
            block.push(`${vars[v].name} = ${vars[v].className}(dictionary: ${vars[v].name}Dictionary)`);
            block.push('}');
        } else {
            block.push(`${vars[v].name} = dictionary["${vars[v].snakeName}"] as? ${vars[v].type}`);
        }
    }
    block.push('}');
    block.push('');

    // start of the isDeepEqualTo function
    block.push(`func isDeepEqualTo(otherItem:${nameCap}?) -> Bool {`);
    block.push('guard let otherItem = otherItem else{');
    block.push('return false');
    block.push('}');
    block.push('');
    for (let v = 0; v < vars.length; v += 1) {
        let line = '';
        if (v === 0) {
            line = 'if(';
        }
        if (!vars[v].complex) {
            line += `self.${vars[v].name} == otherItem.${vars[v].name}`;
            line += ' &&';
        }
        if (line !== '') {
            block.push(line);
        }
    }
    const index = block[block.length - 1].indexOf('&&');
    block[block.length - 1] = `${block[block.length - 1].substring(0, index)}){`;
    block.push('');
    for (let v = 0; v < vars.length; v += 1) {
        if (vars[v].complex === 'array') {
            block.push(`for (index,item) in self.${vars[v].name}.enumerated(){`);
            block.push(`if(!item.isDeepEqualTo(otherItem: otherItem.${vars[v].name}[index])){`);
            block.push('return false');
            block.push('}');
            block.push('}');
            block.push('');
        } else if (vars[v].complex === 'object') {
            block.push(`if let ${vars[v].name} = self.${vars[v].name}{`);
            block.push(`if !${vars[v].name}.isDeepEqualTo(otherItem:otherItem.${vars[v].name}){`);
            block.push('return false');
            block.push('}');
            block.push('} else {');
            block.push(`if let other${vars[v].name} = otherItem.${vars[v].name}{`);
            block.push('return false');
            block.push('}');
            block.push('}');
            block.push('');
        }
    }
    block.push('return true');
    block.push('}');
    block.push('else {');
    block.push('return false');
    block.push('}');
    block.push('}');
    block.push('');

    // start of the toJSON function
    block.push('func toJSON() -> [String:Any]{');
    block.push('var jsonToReturn:[String:Any] = [:]');
    for (let v = 0; v < vars.length; v += 1) {
        if (vars[v].complex === 'array') {
            block.push(`var ${vars[v].name}Array:[[String:Any]] = []`);
        }
    }
    block.push('');
    for (let v = 0; v < vars.length; v += 1) {
        if (vars[v].complex === 'array') {
            block.push(`for item in ${vars[v].name}{`);
            block.push(`${vars[v].name}Array.append(item.toJSON())`);
            block.push('}');
            block.push(`jsonToReturn["${vars[v].snakeName}"] = ${vars[v].name}Array as Any?`);
            block.push('');
        } else if (vars[v].complex === 'object') {
            block.push(`jsonToReturn["${vars[v].snakeName}"] = ${vars[v].name}?.toJSON() as Any?`);
        } else {
            block.push(`jsonToReturn["${vars[v].snakeName}"] = ${vars[v].name} as Any?`);
        }
    }
    block.push('');
    block.push('return jsonToReturn');
    block.push('}');
    block.push('');

    block.push('}');
    block.push('');
    block.push('');
    fileArray.push(block);
}

const example = data.data[0];
makeBlock('user', example);
print(fileArray);
