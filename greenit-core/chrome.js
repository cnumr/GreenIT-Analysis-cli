const {translator} = require("../cli-core/translator");


chrome = {
    "i18n": {
        "getMessage": function (message, parameters = []) {
            return translator.getCatalog()[message].replace(/%s/g, function () {
                // parameters is string or array
                return Array.isArray(parameters) ? parameters.shift() : parameters;
            });
        }
    }
}

module.exports = {
    chrome
}