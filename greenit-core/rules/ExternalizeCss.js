const { chrome } = require("../chrome")

function registerExternalizeCss(rulesManager) {
    rulesManager.registerRule({
        complianceLevel: 'A',
        id: "ExternalizeCss",
        comment: "",
        detailComment: "",

        check: function (measures) {

            if (measures.inlineStyleSheetsNumber > 0) {
                this.complianceLevel = 'C';
                this.comment = chrome.i18n.getMessage("rule_ExternalizeCss_Comment", String(measures.inlineStyleSheetsNumber));
            }
        }
    }, "frameMeasuresReceived");

}

module.exports = {
    registerExternalizeCss
}