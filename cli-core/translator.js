const fr = require('../locales/fr.json');

class Translator {

    constructor () {
        this.catalog = fr;
    }

    getCatalog() {
        return this.catalog;
    }

    setLocale(locale) {
        if(locale === 'fr') {
            this.catalog = fr;
        }
    }

    translateRule(rule) {
        return this.catalog['rule_' + rule];
    }

}

const translator = new Translator();

module.exports = {
    translator
}