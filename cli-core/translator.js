const fr = require('../locales/fr.json');
const en = require('../locales/en.json');
const util = require('util');

class Translator {
    constructor() {
        this.catalog = fr;
    }

    getCatalog() {
        return this.catalog;
    }

    setLocale(locale) {
        if (locale === 'fr') {
            this.catalog = fr;
        } else if (locale === 'en') {
            this.catalog = en;
        }
    }

    translateRule(rule) {
        return this.translate('rule_' + rule);
    }

    translate(key) {
        return this.catalog[key];
    }

    translateWithArgs(key, ...args) {
        return util.format(this.catalog[key], args);
    }
}

const translator = new Translator();

module.exports = {
    translator,
};
