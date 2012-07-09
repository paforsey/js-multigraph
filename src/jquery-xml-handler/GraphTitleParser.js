if (!window.multigraph) {
    window.multigraph = {};
}

(function (ns) {
    "use strict";

    var scalarAttributes = ["border", "opacity", "padding", "cornerradius", "base", "position", "anchor"];
    ns.jQueryXMLHandler = ns.jQueryXMLHandler ? ns.jQueryXMLHandler : { "mixinfuncs" : [] };
    ns.jQueryXMLHandler.mixinfuncs.push(function (nsObj, parse, serialize) {
        
        nsObj.Title[parse] = function (xml) {
            var title = new nsObj.Title();
            if (xml) {
                title.content(xml.text());
                title.border(xml.attr("border"));
                title.color(window.multigraph.math.RGBColor.parse(xml.attr("color")));
                title.bordercolor(window.multigraph.math.RGBColor.parse(xml.attr("bordercolor")));
                title.opacity(nsObj.utilityFunctions.parseDoubleOrUndefined(xml.attr("opacity")));
                title.padding(xml.attr("padding"));
                title.cornerradius(xml.attr("cornerradius"));
                title.base(xml.attr("base"));
                title.position(xml.attr("position"));
                title.anchor(xml.attr("anchor"));
            }
            return title;
        };

        nsObj.Title.prototype[serialize] = function () {
            var attributeStrings = [],
                output = '<title ',
                i;

            if (this.color() !== undefined) {
                attributeStrings.push('color="' + this.color().getHexString() + '"');
            }

            if (this.bordercolor() !== undefined) {
                attributeStrings.push('bordercolor="' + this.bordercolor().getHexString() + '"');
            }

            for (i = 0; i < scalarAttributes.length; i++) {
                if (this[scalarAttributes[i]]() !== undefined) {
                    attributeStrings.push(scalarAttributes[i] + '="' + this[scalarAttributes[i]]() + '"');
                }
            }

            output += attributeStrings.join(' ');

            if (this.content() !== undefined && this.content() !== '') {
                output += '>' + this.content() + '</title>';
            } else {
                output += '/>';
            }

            return output;
        };

    });
}(window.multigraph));
