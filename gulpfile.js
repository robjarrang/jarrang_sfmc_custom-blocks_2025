const { src, dest, series, parallel, watch } = require('gulp');
const nunjucksRender = require('gulp-nunjucks-render');
const data = require('gulp-data');
const rename = require('gulp-rename');
const plumber = require('gulp-plumber');
const { deleteAsync } = require('del');
const fs = require('fs');
const path = require('path');

const paths = {
    modules: 'src/modules',
    templates: 'src/modules/**/index.njk',
    watch: 'src/modules/**/*.{njk,json}',
    outputRoot: '.'
};

function loadTemplateData(file) {
    const moduleDir = path.dirname(file.path);
    const moduleName = path.basename(moduleDir);
    const dataPath = path.join(moduleDir, 'data.json');
    let moduleData = {};

    if (fs.existsSync(dataPath)) {
        moduleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    return {
        module: {
            name: moduleName,
            ...moduleData
        }
    };
}

function clean() {
    if (!fs.existsSync(paths.modules)) return Promise.resolve();

    const targets = fs
        .readdirSync(paths.modules, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(entry.name, 'index.html'));

    return deleteAsync(targets, { force: true });
}

function buildTemplates() {
    return src(paths.templates)
        .pipe(plumber())
        .pipe(data(loadTemplateData))
        .pipe(
            nunjucksRender({
                path: ['src/layouts', 'src/partials', 'src/modules'],
                envOptions: { autoescape: false }
            })
        )
        .pipe(
            rename((file) => {
                file.extname = '.html';
            })
        )
        .pipe(
            dest((file) => {
                const relativePath = path.relative(paths.modules, file.base);
                return path.join(paths.outputRoot, relativePath);
            })
        );
}

function watchTemplates() {
    watch(paths.watch, series(buildTemplates));
}

exports.clean = clean;
exports.build = series(clean, buildTemplates);
exports.watch = series(buildTemplates, watchTemplates);
exports.default = exports.build;
