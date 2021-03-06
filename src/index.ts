import { readFile } from 'fs';
import { promisify } from 'util';
import { createFilter } from '@rollup/pluginutils';
import { Plugin } from 'rollup';
import { load } from 'cheerio';
import { isAbsolute } from 'path';

const $readFile = promisify(readFile);

interface Options {
	include?: string;
	exclude?: string;
	vOnce?: boolean;
	vPre?: boolean;
}

const virtualExt = '.vue-html.vue';

export default function VueToHtml(options: Options = {}): Plugin {
	if (!options.include) {
		options.include = '**/*.vue';
	}

	const filter = createFilter(options.include, options.exclude);

	return {
		name: 'vue-html',

		// If it matches a resource, rename it with the .vue extension
		async resolveId(id: string, importer?: string) {
			if (!isAbsolute(id)) {
				const resolved = await this.resolve(id, importer, {skipSelf: true});
				if (resolved && !resolved.external) {
					id = resolved.id;
				}
			}

			if (!filter(id)) {
				return null;
			}

			return `${id}${virtualExt}`;
		},

		// Create SFC
		load(id) {
			if (!id.endsWith(virtualExt)) {
				return null;
			}

			return $readFile(id.replace(virtualExt, '')).then(html => {
				let $ = load(html, {xmlMode: true});

				if ($.root().children().length > 1) {
					$ = load(`<div>${$.xml()}</div>`, {xmlMode: true});
				}

				const rootElement = $.root().children().first();

				// if (options.vOnce) {
				// 	rootElement.attr('v-once', '');
				// }

				// if (options.vPre) {
				// 	rootElement.attr('v-pre', '');
				// }

				return `<template>${$.xml(rootElement)}</template>`;
			});
		},
	};
}
