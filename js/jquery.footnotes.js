/*!
 * A jQuery plugin by Brian Holt that will search the selected blocks for
 * specially-defined footnote elements.  If found, these elements will be
 * moved to a footnotes section and links to and from the footnotes will
 * be created.
 *
 * See http://www.planetholt.com/articles/jQuery-Footnotes
 * for full documentation.
 *
 * By default, footnotes will be found in SPANs with the footnote class,
 * and in BLOCKQUOTEs with a TITLE attribute.
 *
 * Thanks to CSSNewbies.com for the general idea, which I have enhanced
 * and implemented with as a jQuery plugin.
 *
 * Copyright 2008-2013 Brian Holt.
 * Licensed under the LGPL license. See
 * http://www.gnu.org/licenses/lgpl-3.0-standalone.html
 *
 * Version 1.3
 */
(function ($) {
    'use strict';

    $.fn.reverse = [].reverse;

    // private console logger function
    function logToConsole(str, debugMode) {
        if(debugMode) {
            if(window.console && window.console.log) {
                window.console.log(str);
            }
        }
    }

    /**
     * This default HTML extraction function handles SPAN.footnote and
     * blockquote[title] selections.
     *
     * The entire contents of any SPAN.footnotes are returned, unless
     * the text is surrounded by parentheses (with optional leading
     * whitespace), in which case the parentheses are stripped.
     *
     * The entire contents of any BLOCKQUOTE's TITLE attribute are
     * directly returned, including any surrounding parentheses.
     *
     * The contents of the SPAN, or the BLOCKQUOTE's TITLE attribute
     * are cleared.
     */
    function fnDefaultExtractHTML(obj) {
        var $obj = $(obj),
            footnoteHTML, regexRemoveParens, matches, cite, a, objContents, textNodes;

        /*
         * If this is a SPAN with the footnote class, move the footnote
         * text to the footnotes area and replace it in the span
         * with a link to the footnote.
         */
        if($obj.is("span.footnote")) {
            footnoteHTML = obj;
            objContents = $obj.contents();

            /**
             * In order to enhance progressively, we probably put the
             * footnote text in parentheses. We probably also don't want
             * those to appear in the footnote, so remove them if they're
             * present.
             *
             * This regex uses [\S\s]+ in place of .+ so it matches over
             * multiple lines.
             */
            regexRemoveParens = /^(?:(?:&nbsp;)|\s)*\(([\S\s]+)\)(?:(?:&nbsp;)|\s)*$/;
            matches = $obj.text().match(regexRemoveParens);

            if(matches && 2 === matches.length) {
                if (1 === objContents.length) {
                    $obj.text(matches[1]);
                } else {
                    textNodes = objContents.filter(function () {
                        return this.nodeType === 3;
                    });

                    textNodes.each(function() {
                        var pos = this.textContent.indexOf('(');
                        if (pos > -1) {
                            this.textContent = this.textContent.substr(pos + 1);
                            return false;
                        }
                        return true;
                    });

                    textNodes.reverse().each(function() {
                        var pos = this.textContent.lastIndexOf(')');
                        if (pos > -1) {
                            this.textContent = this.textContent.substr(0, pos);
                            return false;
                        }
                        return true;
                    });
                }
            }
        }

        /*
         * If it's a blockquote with a title, we just do a citation-style
         * footnote, so we don't have to do as much work.
         */
        else if($obj.is("blockquote[title]")) {
            cite = $obj.attr("cite");

            // Grab the contents to put in the footnote
            footnoteHTML = $obj.attr("title");

            if ('' === cite) {
                footnoteHTML = $('<span/>').text(footnoteHTML);
            } else {
                a = $("<a/>").attr("href", cite);

                /*
                 * If we just have text, use it as the displayed
                 * text for the anchor
                 */
                if(typeof footnoteHTML === 'string' || 0 === $(footnoteHTML).length) {
                    footnoteHTML = a.text(footnoteHTML);
                }

                /*
                 * If we have more than just text, display the citation link,
                 * and then the contents of the blockquote's TITLE attribute.
                 */
                else {
                    footnoteHTML = a
                                    .text(cite)
                                    .wrap('<span/>')
                                    .parent()
                                        .append(": " + footnoteHTML);

                    // since we have more than just text, clear the title
                    // so the user doesn't see the ugly title in a tooltip
                    $obj.attr("title", "");
                }
            }
        }

        /*
         * If it's a blockquote with just a CITE, we create a link to the resource,
         * using the URL as the text of the link.  If we've gotten this far, we
         * know that if it's a blockquote, it does not have a TITLE.
         */
        else if($obj.is("blockquote[cite]")) {
            cite = $obj.attr("cite");
            footnoteHTML = $("<a/>").attr("href", cite).text(cite);
        }

        return footnoteHTML;
    }

    function addLinkToFootnote(link) {
        var $anchor = $('<a/>')
            .attr('href', link.href)
            .attr('name', link.id)
            .attr('id', link.id)
            .attr('title', link.title)
            .attr('dir', 'ltr')
            .text(link.text)
            .addClass('footnoteLink');

        // Add a new SUP tag and set its properties
        if(link.prepend) {
            $('<sup/>')
                .prependTo(link.destination)
                .append($anchor);
        } else {
            $('<sup/>')
                .insertAfter(link.destination)
                .append($anchor);
        }
    }

    function ensureFootnoteDestination(j, opts) {
        var $contentPlaceholder = ("" === opts.contentBlock) ? $(this) : $(opts.contentBlock, this),
            newListElement = opts.orderedList ? "<ol/>" : "<ul/>",
            id = opts.singleFootnoteDestination ? opts.destination : opts.destination + j,
            $footnoteDestination;

        $footnoteDestination = $("#" + id);
        if (0 === $footnoteDestination.length) {
            logToConsole("INFO: No #autoFootnotes" + j + " found; adding our own for " + (j + 1), opts.debugMode);
            $footnoteDestination = $(newListElement)
                .attr("id", id)
                .addClass("footnotesList")
                .appendTo($contentPlaceholder[j]);
        }
        return $footnoteDestination;
    }

    function addNewFootnote(refID, $footnoteHTML, $footnoteDestination, $this, opts) {
        var $li, $backRefSpan;
// First, add the link to the footnote
        // Add a new A tag and set its properties

        addLinkToFootnote({
            href: "#cite-text-" + refID,
            id: "cite-ref-" + refID,
            title: $footnoteHTML.text(),
            text: "[" + ($footnoteDestination.find("li").length + 1) + "]",
            destination: $this,
            prepend: $this.is(opts.prependTags)
        });

        // Second, add the footnote and the link back to the text
        // Create the LI for the footnote
        $li = $("<li/>")
            .attr("id", "cite-text-" + refID);

        $backRefSpan = $("<span/>")
            .addClass("footnoteBackReferenceGroup")
            .appendTo($li);

        $("<span/>")
            .addClass("footnoteContent")
            .append($footnoteHTML)
            .appendTo($li);

        // Create the backreference A
        $("<a/>")
            .text("^")
            .attr("href", "#cite-ref-" + refID)
            .addClass("footnoteBackref")
            .prependTo($backRefSpan);

        // Add the footnote LI to the OL
        $footnoteDestination.append($li);
    }

    function addInstanceToExistingFootnote($footnote, $foundFootnoteLI, footnoteGroupIdx, existingFootnoteIdx, $linkContainer, prependTags) {
        var refID = footnoteGroupIdx + "-" + existingFootnoteIdx,
            $backRefSpan = $foundFootnoteLI.find('span.footnoteBackReferenceGroup'),
            $backRefs = $backRefSpan.find(".footnoteBackref"),
            letterCounter = $backRefs.length,
            $anchor;

        if (1 === $backRefs.length) {
            // We need to insert a non-linked ^, and change the link text to "a"
            $("<sup/>")
                .text("^ ")
                .addClass("footnoteBackref")
                .prependTo($backRefSpan);
            $backRefs.html("<sup>a</sup>");

            letterCounter = letterCounter + 1;
        }

        // Insert the two links for this footnote

        // first, the link to the footnote
        addLinkToFootnote({
            href: "#" + $foundFootnoteLI.attr("id"),
            id: "cite-ref-" + refID + "-" + $backRefs.length,
            title: $footnote.text(),
            text: "[" + (existingFootnoteIdx + 1) + "]",
            destination: $linkContainer,
            prependTags: prependTags
        });

        // The back-reference
        $anchor = $("<a/>")
            .attr("href", "#cite-ref-" + refID + "-" + $backRefs.length)
            .addClass("footnoteBackref");

        $anchor.prepend(String.fromCharCode(letterCounter + 96));

        $("<sup/>")
            .appendTo($backRefSpan)
            .append($anchor);

        $footnote.remove();
    }

    $.fn.footnotes = function (options) {

        var opts = $.extend({}, $.fn.footnotes.defaults, options),
            container = this;

        return this.each(function (footnoteGroup) {

            var $footnoteDestination = ensureFootnoteDestination.call(container, footnoteGroup, opts);

            logToConsole("INFO: Building footnotes for " + (footnoteGroup + 1) + "...", opts.debugMode);
            /**
             * Add a fake class to the elements we want to select, so that
             * the jQuery.each() function iterates over them in the
             * correct order.
             */
            $(opts.footnotes, this).addClass(opts.autoFootnoteClass);

            /**
             * Iterate over the elements we selected earlier
             */
            $("." + opts.autoFootnoteClass).each(function (i) {

                var foundFootnoteIdx = -1,
                    refID = footnoteGroup + "-" + i,
                    $this = $(this),
                    $footnoteHTML, $foundFootnoteLI;

                // First, remove the class that selected this
                // element so that we only do this once
                $this.removeClass(opts.autoFootnoteClass);

                $footnoteHTML = $(opts.fnExtractFootnote(this));
                $footnoteHTML.removeClass('footnote');
                foundFootnoteIdx = -1;

                // Check to see if we've already encountered this exact footnote
                $footnoteDestination.find("li > .footnoteContent").each(function (k) {
                    var $thisFootnoteContent = $(this);

                    if($thisFootnoteContent.html() === $footnoteHTML[0].outerHTML) {
                        foundFootnoteIdx = k;
                        $foundFootnoteLI = $($thisFootnoteContent.parents("li").get(0));
                        return false;
                    }
                    return true;
                });

                if (undefined === $foundFootnoteLI) {
                    addNewFootnote(refID, $footnoteHTML, $footnoteDestination, $this, opts);
                } else {
                    addInstanceToExistingFootnote($footnoteHTML, $foundFootnoteLI, footnoteGroup, foundFootnoteIdx, $this, $this.is(opts.prependTags));
                }
            }); // end $("." + opts.autoFootnoteClass).each(function(i))

            logToConsole("INFO: Done building footnotes for " + (footnoteGroup+ 1), opts.debugMode);

        }); // return this.each()
    }; // jQuery.fn.footnotes

    // Publicly expose the version number
    $.fn.footnotes.version = function () { return "1.3"; };

    // Publicly expose defaults
    $.fn.footnotes.defaults = {
        /**
         * Overriding the footnotes option allows users to select which
         * entities get turned into footnotes.  Note that the fnExtractFootnote
         * option should be probably be overridden as well.
         */
        footnotes: "blockquote[title],span.footnote,blockquote[cite]",

        /**
         * By default, the link to the footnote will be appended to the
         * end of an element selected by the <code/>footnotes</code/>
         * selector.  If some elements should have their footnote
         * links prepended, appropriate selectors should be added here.
         * Note that elements selected here are a subset of those selected
         * by <code/>footnotes</code/>.
         *
         * For example, if automatic quotation marks are added to P elements
         * within BLOCKQUOTEs, one might use the :last-child pseudo-selector
         * to trigger the addition of close quotes to the last paragraph.
         * However, if a SUP tag is appended to the BLOCKQUOTE, :last-child
         * will no longer match the last P, and the quotes will not be added.
         * Adding BLOCKQUOTE here will cause the SUP tag to be prepended,
         * avoiding this issue.
         */
        prependTags: "blockquote",

        /**
         * - When TRUE, all footnotes will be put into a single ordered list.
         * - When FALSE, each block on which the footnotes() plugin function
         *   is applied will have its own footnote ordered list.
         */
        singleFootnoteDestination: false,
        /**
         * Specifies the ID (without the leading #) where footnotes will be placed.
         * - If singleFootnoteDestination is TRUE, the ID is used with no suffix
         * - If singleFootnoteDestination is FALSE, an index suffix is appended
         *   to the ID
         */
        destination: "autoFootnotes",

        /**
         * Allows for the selection of a block within the outer block, to which the
         * ordered list where footnotes will be placed will be appended.
         */
        contentBlock: ".content",

        /**
         * CSS class name to be added to each of the elements matching the
         * footnotes selector option.  This allows us to ensure that the footnotes
         * are added to the list in the correct order.  Set to something that
         * won't be used otherwise.
         */
        autoFootnoteClass: "autoFootnote",

        /**
         * Function to extract the footnote HTML from the elements that are
         * selected by the footnotes option.
         */
        fnExtractFootnote: fnDefaultExtractHTML,

        /**
         * - When TRUE, footnotes will be added to an ordered list.
         * - When FALSE, footnotes will be added to an unordered list.
         */
        orderedList: true,

        /**
         * - When TRUE, we will attempt to output console log messages.
         * - When FALSE, console log messages will be suppressed.
         */
        debugMode: false
    };// $.fn.footnotes.defaults

}(jQuery));
