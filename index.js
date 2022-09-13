#!/usr/bin/env node

import jsdoc from '@innofake/jsdoc-api-debuggable';
import jsdocParse from 'jsdoc-parse';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import commandLineArgs from 'command-line-args';

let { config, dump, dumpStdOut, customElements, dir, srcDir, outFile, keepImports, importRoot, excludePaths, excludeKinds, analyzeFlags } = commandLineArgs([
    { name: 'config', type: String, defaultValue: '.jsdoc-markdown.config.json' },
    { name: 'dump', type: Boolean, defaultValue: false },
    { name: 'dumpStdOut', type: Boolean, defaultValue: false },
    { name: 'customElements', type: String, defaultValue: 'custom-elements.json' },
    { name: 'dir', type: String, defaultValue: 'dist' },
    { name: 'srcDir', type: String, defaultValue: 'src' },
    { name: 'outFile', type: String, defaultValue: 'README.md' },
    { name: 'keepImports', type: Boolean, defaultValue: false },
    { name: 'importRoot', type: String },
    { name: 'excludePaths', type: String, defaultValue: 'stories,story,internal,test' },
    { name: 'excludeKinds', type: String, defaultValue: 'custom-element-definition' },
    { name: 'analyzeFlags', type: String, defaultValue: 'litelement' }
]);

if (fs.existsSync(config)) {
    const configRaw = fs.readFileSync(config, 'utf-8');
    const configuration = JSON.parse(configRaw);
    if (configuration.customElements) {
        customElements = configuration.customElements;
    }
    if (configuration.dir) {
        dir = configuration.dir;
    }
    if (configuration.srcDir) {
        srcDir = configuration.srcDir;
    }
    if (configuration.outFile) {
        outFile = configuration.outFile;
    }
    if (typeof configuration.keepImports !== 'undefined') {
        keepImports = configuration.keepImports;
    }
    if (configuration.importRoot) {
        importRoot = configuration.importRoot;
    }
    if (configuration.excludePaths) {
        excludePaths = configuration.excludePaths;
    }
    if (configuration.excludeKinds) {
        excludeKinds = configuration.excludeKinds;
    }
    if (configuration.analyzeFlags) {
        analyzeFlags = configuration.analyzeFlags;
    }
}

if (typeof excludePaths === 'string' || excludePaths instanceof String) {
    excludePaths = excludePaths.split(',');
}
if (typeof excludeKinds === 'string' || excludeKinds instanceof String) {
    excludeKinds = excludeKinds.split(',');
}
if (typeof analyzeFlags === 'string' || analyzeFlags instanceof String) {
    analyzeFlags = analyzeFlags.split(',').map(f => `--${f}`);
}

if (dump) {
    const configuration = { customElements, dir, srcDir, outFile, keepImports, importRoot, excludePaths, excludeKinds, analyzeFlags };
    if (dumpStdOut) {
        console.log(JSON.stringify(configuration));
    } else {
        const newConfig = JSON.stringify(configuration,undefined, 2);
        fs.writeFileSync(config, newConfig);
        console.log(chalk.green(`Dumped config at '${config}'`));
    }
} else {


    if (!fs.existsSync(customElements)) {
        console.warn(chalk.bgYellow('No \'custom-elements.json\' available. Attempting to generate'));
        execSync(`npx cem analyze --litelement --outdir ${path.dirname(customElements)} --globs ${srcDir}/**`);
    }

    if (!fs.existsSync(dir)) {
        console.warn(chalk.bgYellow(`No \'${dir}\' available. Attempting Typescript compile`));
        execSync('npx -p typescript tsc');
    }

    const manifestRaw = fs.readFileSync(customElements, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    const codeSnippet = '```';

    const groupedManifests = [];
    manifest.modules.forEach(module => {
        if ((module.path.endsWith('.ts') || module.path.endsWith('.js')) &&
            !module.path.endsWith('index.ts') &&
            !module.path.endsWith('index.js') &&
            !excludePaths.find(p => module.path.toLowerCase().includes(p)) &&
            !module.exports.find(ex => excludeKinds.find(k => ex.kind === k)) &&
            module.exports.find(ex => ex.kind === 'js')
        ) {
            const moduleDir = path.dirname(module.path);
            if (!groupedManifests[moduleDir]) {
                groupedManifests[moduleDir] = [];
            }

            groupedManifests[moduleDir].push(module.path);
        }
    });

    for (const moduleDir in groupedManifests) {
        if (Object.hasOwnProperty.call(groupedManifests, moduleDir)) {
            const manifests = groupedManifests[moduleDir].map(f => f.replace(srcDir, dir).replace('.ts', '.js'));
            let sections = [];
            manifests.forEach(file => {
                const docsRaw = jsdoc.explainSync({ files: file });
                const docs = jsdocParse(docsRaw);

                sections.push(generateMarkdownSection(file, docs));
            });

            const markdown = generateMarkdown(sections);
            fs.writeFileSync(`${moduleDir}/${outFile}`, markdown);
            console.log(chalk.green(`Generated '${moduleDir}/${outFile}'`));
        }
    }

    function generateMarkdown(sections) {
        return sections.join('\r\n\r\n');
    }

    function generateMarkdownSection(file, docs) {

        let section = '\r\n';

        const constructor = docs.find(d => d.kind === 'constructor');
        const classDef = docs.find(d => d.kind === 'class');

        if (!classDef) {
            const anyMember = docs.find(d => d.memberof);
            if (anyMember) {
                section += `# \`${anyMember.memberof}\``;
            }
        } else {
            section += `# \`${classDef.name}\``;
            section += '\r\n';
            section += fixCodeElements(filterLinks(classDef.description));
            section += '\r\n';

            section += getExamples(classDef);
        }

        if (constructor) {
            if (constructor.description) {
                section += '\r\n';
                section += fixCodeElements(filterLinks(constructor.description));
                section += '\r\n';
            }

            section += getExamples(constructor);
        }

        const instanceMembers = docs.filter(d => d.kind === 'member' && d.scope === 'instance');

        if (instanceMembers && instanceMembers.length > 0) {
            section += '\r\n';
            section += '## Instance Members';

            section += '\r\n';
            section += '<table>';
            section += '<thead>';
            section += '<tr>';
            section += '<th>Name</th>';
            section += '<th>Type</th>';
            section += '<th>Description</th>';
            section += '<th>Example</th>';
            section += '</tr>';
            section += '</thead>';
            section += '<tbody>';

            instanceMembers.forEach(member => {
                section += '\r\n';
                section += '<tr><td>';
                section += '\r\n';
                section += '\r\n';
                section += `\`${member.name}\``;
                section += '\r\n';
                section += '\r\n';
                section += '</td><td>';
                section += '\r\n';
                section += '\r\n';
                section += `\`${getType(member)}\``;
                section += '\r\n';
                section += '\r\n';
                section += `</td><td>${fixCodeElements(filterLinks(member.description))}</td><td>`;
                section += '\r\n';
                section += '\r\n';
                section += `${getExamples(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td></tr>';
            });
            section += '\r\n';
            section += '</tbody>';
            section += '</table>';
            section += '\r\n';
        }

        const globalMembers = docs.filter(d => d.kind === 'member' && d.scope === 'global');

        if (globalMembers && globalMembers.length > 0) {
            section += '\r\n';
            section += '## Global Members';

            section += '\r\n';
            section += '<table>';
            section += '<thead>';
            section += '<tr>';
            section += '<th>Name</th>';
            section += '<th>Type</th>';
            section += '<th>Description</th>';
            section += '<th>Example</th>';
            section += '</tr>';
            section += '</thead>';
            section += '<tbody>';

            globalMembers.forEach(member => {
                section += '\r\n';
                section += '<tr><td>';
                section += '\r\n';
                section += '\r\n';
                section += `\`${member.name}\``;
                section += '\r\n';
                section += '\r\n';
                section += '</td><td>';
                section += '\r\n';
                section += '\r\n';
                section += `\`${getType(member)}\``;
                section += '\r\n';
                section += '\r\n';
                section += `</td><td>${fixCodeElements(filterLinks(member.description))}</td><td>`;
                section += '\r\n';
                section += '\r\n';
                section += `${getImport(file, member)}`;
                section += `${getExamples(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td></tr>';
            });
            section += '\r\n';
            section += '</tbody>';
            section += '</table>';
            section += '\r\n';
        }

        const instanceFunctions = docs.filter(d => d.kind === 'function' && d.scope === 'instance');

        if (instanceFunctions && instanceFunctions.length > 0) {
            section += '\r\n';
            section += '## Instance Functions';

            section += '\r\n';
            section += '<table>';
            section += '<thead>';
            section += '<tr>';
            section += '<th>Name</th>';
            section += '<th>Description</th>';
            section += '<th>Parameters</th>';
            section += '<th>Return</th>';
            section += '<th>Example</th>';
            section += '</tr>';
            section += '</thead>';
            section += '<tbody>';

            instanceFunctions.forEach(member => {
                section += '\r\n';
                section += '<tr><td>';
                section += '\r\n';
                section += '\r\n';
                section += `\`${member.name}\``;
                section += '\r\n';
                section += '\r\n';
                section += `</td><td>${fixCodeElements(filterLinks(member.description))}</td><td>`;
                section += '\r\n';
                section += '\r\n';
                section += `${getParameters(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td><td>';
                section += '\r\n';
                section += '\r\n';
                section += `${getReturns(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td><td>';
                section += '\r\n';
                section += '\r\n';
                section += `${getExamples(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td></tr>';
            });
            section += '\r\n';
            section += '</tbody>';
            section += '</table>';
            section += '\r\n';
        }

        const globalFunctions = docs.filter(d => d.kind === 'function' && d.scope === 'global');

        if (globalFunctions && globalFunctions.length > 0) {
            section += '\r\n';
            section += '## Global Functions';

            section += '\r\n';
            section += '<table>';
            section += '<thead>';
            section += '<tr>';
            section += '<th>Name</th>';
            section += '<th>Description</th>';
            section += '<th>Parameters</th>';
            section += '<th>Return</th>';
            section += '<th>Example</th>';
            section += '</tr>';
            section += '</thead>';
            section += '<tbody>';

            globalFunctions.forEach(member => {
                section += '\r\n';
                section += '<tr><td>';
                section += '\r\n';
                section += '\r\n';
                section += `\`${member.name}\``;
                section += '\r\n';
                section += '\r\n';
                section += `</td><td>${fixCodeElements(filterLinks(member.description))}</td><td>`;
                section += '\r\n';
                section += '\r\n';
                section += `${getParameters(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td><td>';
                section += '\r\n';
                section += '\r\n';
                section += `${getReturns(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td><td>';
                section += '\r\n';
                section += '\r\n';
                section += `${getImport(file, member)}`;
                section += `${getExamples(member)}`;
                section += '\r\n';
                section += '\r\n';
                section += '</td></tr>';
            });
            section += '\r\n';
            section += '</tbody>';
            section += '</table>';
            section += '\r\n';
        }

        section += '\r\n\r\n![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png)\r\n\r\n';
        return section;
    }

    function fixCodeElements(str) {
        if (!str) {
            return '';
        }
        return str.replaceAll(`${codeSnippet}`, `\r\n${codeSnippet}`)
            .replaceAll(`${codeSnippet}js`, `${codeSnippet}js\r\n`);
    }

    function filterLinks(jsdoc) {
        if (!jsdoc) return jsdoc;

        // const renderLink = ((link) => `<a href="${link.url}">${link.text}</a>`);
        const renderLink = ((link) => `[${link.text}](${(link.url.includes(':') ? '' : '#')}${(link.url.includes(':') ? `${link.url}` : `${link.url.toLowerCase()}`)})`);

        const matches = Array.from(jsdoc.matchAll(/(?:\[(.*?)\])?{@(link|tutorial) (.*?)(?:(?:\|| +)(.*?))?}/gm));

        if (!matches) return jsdoc;

        for (const match of matches) {
            const tag = match[2].trim();
            const url = match[3].trim();
            let text = url;

            if (match[4]) {
                text = match[4].trim();
            } else if (match[1]) {
                text = match[1].trim();
            }

            jsdoc = jsdoc.replace(match[0], renderLink({ tag, url, text, raw: match[0] }));
        }

        return jsdoc;
    }

    function getType(member) {
        if (member && member.type && member.type.names) {
            return `${member.type.names.map(n => `\`${n}\``).join('|')}`;
        }
        return '';
    }

    function getParameters(member) {
        if (member && member.params) {
            return member.params.map(p => `${p.name} {${getType(p)}} - ${fixCodeElements(filterLinks(p.description))}`).join('\r\n\r\n ');
        }
        return '';
    }

    function getReturns(member) {
        if (member && member.returns) {
            return member.returns.map(r => `{${getType(r)}} - ${fixCodeElements(filterLinks(r.description))}`).join('\r\n\r\n ');
        }
        return '';
    }

    function getImport(file, member) {
        let pathname = path.dirname(file);
        if (!keepImports && importRoot) {
            pathname = pathname.replace(dir, importRoot);
        }
        return fixCodeElements(`${codeSnippet}js
    import { ${member.name} } from '${pathname}';
    ${codeSnippet}`);
    }

    function getExamples(member) {
        let str = '';
        if (member && member.examples) {
            member.examples.forEach(ex => {
                str += '\r\n';
                str += `${codeSnippet}js
${ex}
${codeSnippet}
            `;
                str += '\r\n';
            });
        }
        return fixCodeElements(str);
    }
}