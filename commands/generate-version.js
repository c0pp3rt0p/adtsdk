const execa = require('execa');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

module.exports.register =  register;

let options = {};

function register(program){
    program
    .command('generate-version-file')
    .alias('gvf')
    .description('Generate a dependency version html file')
    .option('-t, --template <path>', 'Path to HTML template file to hydrate.', 'version_template.html')
    .option('-o, --output <path>', 'Path where to output the rendered HTML file.', 'version.html')
    .option('-j, --json <path>', 'Path of json data file to merge with template.')
    .option('-f, --force', 'Forcibly overwrite output file if it already exists')
    .option('-v, --verbose', 'Display more verbose comments during execution')
    .option('-d, --data <data>', 'JSON string containing the data to merge in to the template.')
    .option('-s, --silent', 'Surpress all output. (overrides verbose)')
    .action(generateVersionFile);
}

function generateVersionFile(cmd){

    options = {
        templatePath:   cmd.template,
        outputPath:     cmd.output,
        verbose:        cmd.verbose,
        force:          cmd.force,
        data:           mergeData(cmd.data, cmd.json),
        silent:         cmd.silent
    };

    if (options.verbose) {
        log('Displaying verbose output');
        log('Template path: ' + options.templatePath);
        log('Output path: ' + options.outputPath);
        log('Overwrite output: ' + options.force);
    }

    getNpmComponentVersions().then(versions => {
        //Merge all data sources
        options.data = Object.assign({}, options.data);
        options.data.componentVersions = versions;
    
        parseTemplate(options);
    }, reason => {
        log('Failed to retrieve component versions.');
    });

}

function jsonSafeParse(jsonString) {
    try {
        if (jsonString){
            return JSON.parse(jsonString);
        }
        return {};
    }
    catch (ex) {
        if ( ex instanceof SyntaxError) {
            let msg = `The value '${jsonString}' is not valid JSON.`;
            throw msg; 
        }
        else {
            log(`Error: ${e.message}`);
            throw(ex);
        }
    }
}

function mergeData(data, filepath) {
    data = Object.assign({}, jsonSafeParse(data));

    if (filepath && fs.existsSync(filepath)) {
        fs.readFile(filepath, 'utf-8', function(error, source){
            let tmpData = jsonSafeParse(source);
            data = Object.assign(data, tmpData);
        });
    }

    return data;
}

const parseTemplate = function(options){
    // Read the tmeplate and generate the output

    fs.readFile(options.templatePath, 'utf-8', function(error, source){
        var template = handlebars.compile(source);
        var html = template(options.data);
        let fileExists = fs.existsSync(options.outputPath);
        if (!fileExists || (fileExists && options.force)) {
            ensureDirectoryExistence(options.outputPath);
            fs.writeFile(options.outputPath, html, function(err) {
                if (err) {
                    return console.log(err);
                }
                log('File successfully written.');
            });
        }
        else {
            log('File exists and will not be overwritten.');
        }
    });
}

function getNpmComponentVersions() {
    return execa('yarn', ['list', '--depth=0'])
    .then(result => {  
        var lines = result.stdout.toString().split('\n');
        var componentVersions = [];
        lines.forEach(function(line) {
            let expr = /[└├]─ (.*)[@](.*)$/;
            let match = line.match(expr);
            if (match) {
                componentVersions.push({name: match[1], version: match[2]});
            }
        }); 
        return componentVersions;
    }, reason =>{
        log('Failed to retrieve component versions.');
        return undefined;
    });
}

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }

function log(msg) {
    if (options.silent !== true)
    {
        console.log(msg);
    }
}