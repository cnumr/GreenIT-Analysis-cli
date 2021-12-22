const { chrome } = require("../chrome")
const {getImageTypeFromResource, getMinOptimisationGainsForImage} = require("../utils");
const {JSDOM} = require("jsdom");

function registerOptimizeBitmapImages(rulesManager) {

    rulesManager.registerRule({
        complianceLevel: 'A',
        id: "OptimizeBitmapImages",
        comment: "",
        detailComment: "",

        check: function (measures) {
            let nbImagesToOptimize = 0;
            let totalMinGains = 0;

            if (measures.entries) measures.entries.forEach(entry => {
                if (entry.response) {
                    const imageType = getImageTypeFromResource(entry);
                    if (imageType !== "") {
                        const dom = new JSDOM();
                        var myImage = new dom.window.Image();
                        myImage.src = entry.request.url;
                        // needed to access object in the function after
                        myImage.rule = this;

                        myImage.size = entry.response.content.size;
                        myImage.onload = function () {

                            const minGains = getMinOptimisationGainsForImage(this.width * this.height, this.size, imageType);
                            if (minGains > 500) { // exclude small gain
                                nbImagesToOptimize++;
                                totalMinGains += minGains;
                                this.rule.detailComment += chrome.i18n.getMessage("rule_OptimizeBitmapImages_DetailComment", [this.src + " , " + Math.round(this.size / 1000), this.width + "x" + this.height, String(Math.round(minGains / 1000))]) + "<br>";
                            }
                            if (nbImagesToOptimize > 0) {
                                if (totalMinGains < 50000) this.rule.complianceLevel = 'B';
                                else this.rule.complianceLevel = 'C';
                                this.rule.comment = chrome.i18n.getMessage("rule_OptimizeBitmapImages_Comment", [String(nbImagesToOptimize), String(Math.round(totalMinGains / 1000))]);
                            }
                        }
                    }
                }
            });
        }
    }, "harReceived");

}

module.exports = {
    registerOptimizeBitmapImages
}